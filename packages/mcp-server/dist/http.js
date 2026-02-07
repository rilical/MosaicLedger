import http from 'node:http';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GoalInputSchema, NormalizedTransactionSchema, SummarySchema, SCHEMA_VERSION, } from './schemas.js';
import { analyzeTransactionsTool, buildActionPlanTool, buildMosaicSpecTool } from './tools.js';
const DEFAULT_ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://localhost:8787',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8787',
]);
const MAX_BODY_BYTES = 1_000_000; // 1MB (hackathon-safe default)
class HttpError extends Error {
    status;
    code;
    constructor(status, code) {
        super(code);
        this.status = status;
        this.code = code;
    }
}
function parseAllowedOriginsFromEnv() {
    const raw = process.env.MCP_ALLOWED_ORIGINS?.trim();
    if (!raw)
        return DEFAULT_ALLOWED_ORIGINS;
    return new Set(raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean));
}
function isOriginAllowed(origin, allowed) {
    // Many server-to-server requests won't include Origin; allow those.
    if (!origin)
        return true;
    return allowed.has(origin);
}
async function readJsonBody(req) {
    const method = (req.method ?? 'GET').toUpperCase();
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH')
        return undefined;
    const chunks = [];
    let size = 0;
    for await (const c of req) {
        const chunk = c;
        size += chunk.length;
        if (size > MAX_BODY_BYTES)
            throw new HttpError(413, 'payload_too_large');
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw)
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new HttpError(400, 'invalid_json');
    }
}
function json(res, status, data) {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
}
export async function startHttpServer() {
    // Default to loopback for local dev safety; hosted deployments should set HOST
    // explicitly (or run with NODE_ENV=production).
    const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    const rawPort = process.env.PORT;
    const port = rawPort ? Number.parseInt(rawPort, 10) : 8787;
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        throw new Error(`Invalid PORT value: ${rawPort}`);
    }
    const allowedOrigins = parseAllowedOriginsFromEnv();
    const mcp = new McpServer({ name: 'mosaicledger-mcp', version: SCHEMA_VERSION });
    mcp.tool('analyzeTransactions', {
        transactions: z.array(NormalizedTransactionSchema),
    }, async (input) => {
        const out = analyzeTransactionsTool({
            version: SCHEMA_VERSION,
            transactions: input.transactions,
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(out) }],
        };
    });
    mcp.tool('buildMosaicSpec', {
        byCategory: z.record(z.string(), z.number()),
    }, async (input) => {
        const out = buildMosaicSpecTool({ version: SCHEMA_VERSION, byCategory: input.byCategory });
        return {
            content: [{ type: 'text', text: JSON.stringify(out) }],
        };
    });
    mcp.tool('buildActionPlan', {
        summary: SummarySchema,
        goal: GoalInputSchema,
    }, async (input) => {
        // Full strict validation also happens in the tool layer (schemas.ts).
        const out = buildActionPlanTool({
            version: SCHEMA_VERSION,
            summary: input.summary,
            goal: input.goal,
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(out) }],
        };
    });
    const transport = new StreamableHTTPServerTransport({
        // Stateless server: no session affinity required for our deterministic tools.
        sessionIdGenerator: undefined,
    });
    await mcp.connect(transport);
    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
            if (!isOriginAllowed(origin, allowedOrigins)) {
                json(res, 403, { ok: false, error: 'origin_not_allowed' });
                return;
            }
            // CORS (for local dev / browser clients)
            if (origin) {
                res.setHeader('access-control-allow-origin', origin);
                res.setHeader('vary', 'origin');
                res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
                res.setHeader('access-control-allow-headers', 'content-type');
            }
            if ((req.method ?? '').toUpperCase() === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
            }
            if (url.pathname === '/health') {
                json(res, 200, { ok: true, name: 'mosaicledger-mcp', version: SCHEMA_VERSION });
                return;
            }
            if (url.pathname === '/mcp') {
                // Some HTTP clients (and a few platforms) send `Accept: */*` by default.
                // The MCP Streamable HTTP transport requires clients to accept both JSON
                // and SSE; treat `*/*` (or missing Accept) as "accepts everything".
                //
                // Note: the Node->Web conversion layer reads from `rawHeaders`, not just
                // `req.headers`, so we update both to ensure the transport sees it.
                const acceptRaw = typeof req.headers.accept === 'string' ? req.headers.accept : '';
                if (!acceptRaw || acceptRaw.includes('*/*')) {
                    const value = 'application/json, text/event-stream';
                    req.headers.accept = value;
                    if (Array.isArray(req.rawHeaders)) {
                        let updated = false;
                        for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
                            if (String(req.rawHeaders[i]).toLowerCase() === 'accept') {
                                req.rawHeaders[i + 1] = value;
                                updated = true;
                                break;
                            }
                        }
                        if (!updated)
                            req.rawHeaders.push('Accept', value);
                    }
                }
                const body = await readJsonBody(req);
                await transport.handleRequest(req, res, body);
                return;
            }
            json(res, 404, { ok: false, error: 'not_found' });
        }
        catch (err) {
            if (err instanceof HttpError) {
                json(res, err.status, { ok: false, error: err.code });
                return;
            }
            json(res, 500, { ok: false, error: 'internal_error' });
        }
    });
    server.listen(port, host, () => {
        console.log(`MCP server listening on http://${host}:${port} (health: /health, mcp: /mcp)`);
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    startHttpServer().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=http.js.map