/* global console, process */

// Entry point required by some MCP hosts (e.g. Dedalus/Daedalus) which detect
// servers by the presence of `src/index.ts`.
//
// We import from TypeScript source so bundlers (bun) can inline everything.
// The workspace packages will be bundled together.

async function main(): Promise<void> {
  const mod = (await import('../packages/mcp-server/src/http.ts')) as unknown as {
    startHttpServer: () => Promise<void>;
  };
  await mod.startHttpServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
