// Cloudflare Worker entry: /mcp is the connector, / is a tiny status page.
import { handleMcp } from "./handler.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/mcp" || pathname === "/mcp/") return handleMcp(request);
    return new Response("Homework Easy Times connector. MCP endpoint: /mcp?key=<your personal link key>", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
