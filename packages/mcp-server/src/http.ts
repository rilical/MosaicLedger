import http from 'node:http';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import {
  GoalInputSchema,
  NormalizedTransactionSchema,
  SummarySchema,
  SCHEMA_VERSION,
} from './schemas.js';
import { analyzeTransactionsTool, buildActionPlanTool, buildMosaicSpecTool } from './tools.js';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:8787',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8787',
]);

const MAX_BODY_BYTES = 1_000_000; // 1MB (hackathon-safe default)

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function parseAllowedOriginsFromEnv(): Set<string> {
  const raw = process.env.MCP_ALLOWED_ORIGINS?.trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function isOriginAllowed(origin: string | undefined, allowed: Set<string>): boolean {
  // Many server-to-server requests won't include Origin; allow those.
  if (!origin) return true;
  return allowed.has(origin);
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown | undefined> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return undefined;

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    const chunk = c as Buffer;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export async function startHttpServer(): Promise<void> {
  // In hosted environments we must bind to all interfaces, otherwise the process
  // can be "up" but unreachable behind the platform proxy.
  const host = process.env.HOST || '0.0.0.0';
  const rawPort = process.env.PORT;
  const port = rawPort ? Number.parseInt(rawPort, 10) : 8787;
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }
  const allowedOrigins = parseAllowedOriginsFromEnv();

  const mcp = new McpServer({ name: 'mosaicledger-mcp', version: SCHEMA_VERSION });

  mcp.tool(
    'analyzeTransactions',
    {
      transactions: z.array(NormalizedTransactionSchema),
    },
    async (input) => {
      const out = analyzeTransactionsTool({
        version: SCHEMA_VERSION,
        transactions: input.transactions,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
      };
    },
  );

  mcp.tool(
    'buildMosaicSpec',
    {
      byCategory: z.record(z.string(), z.number()),
    },
    async (input) => {
      const out = buildMosaicSpecTool({ version: SCHEMA_VERSION, byCategory: input.byCategory });
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
      };
    },
  );

  mcp.tool(
    'buildActionPlan',
    {
      summary: SummarySchema,
      goal: GoalInputSchema,
    },
    async (input) => {
      // Full strict validation also happens in the tool layer (schemas.ts).
      const out = buildActionPlanTool({
        version: SCHEMA_VERSION,
        summary: input.summary,
        goal: input.goal,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
      };
    },
  );

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
        const body = await readJsonBody(req);
        await transport.handleRequest(req, res, body);
        return;
      }

      json(res, 404, { ok: false, error: 'not_found' });
    } catch (err) {
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
