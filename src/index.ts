/* global console, process */

// Entry point required by some MCP hosts (e.g. Dedalus/Daedalus) which detect
// servers by the presence of `src/index.ts`.
//
// We delegate to the built MCP server package so we don't rely on TS loaders at runtime.

async function main(): Promise<void> {
  const mod = (await import('../packages/mcp-server/dist/http.js')) as unknown as {
    startHttpServer: () => Promise<void>;
  };
  await mod.startHttpServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
