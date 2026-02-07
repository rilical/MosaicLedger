/* global console, process */

// Entry point required by some MCP hosts (e.g. Dedalus/Daedalus) which detect
// servers by the presence of `src/index.ts`.

async function main(): Promise<void> {
  // Import from source so bundlers (bun) can include it directly
  const mod = (await import('../packages/mcp-server/src/http.ts')) as unknown as {
    startHttpServer: () => Promise<void>;
  };
  await mod.startHttpServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
