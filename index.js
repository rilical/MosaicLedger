// Root entrypoint for hosted MCP deployments (e.g. Dedalus/Daedalus).
// Keeps the build system simple: `npm start` / `pnpm start` runs this file.

(async () => {
  const { startHttpServer } = await import('./packages/mcp-server/dist/http.js');
  await startHttpServer();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

