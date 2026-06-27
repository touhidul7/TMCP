import { handleScrapeDoRotate } from "@/lib/rotate/scrapedo-proxy";

// Drop-in for https://api.scrape.do/ — same request shape, but with a TMCP agent API key as
// `token`. TMCP rotates across the connected Scrape.do key pool with automatic failover.
export async function GET(request) {
  return handleScrapeDoRotate(request, { method: "GET" });
}

export async function POST(request) {
  return handleScrapeDoRotate(request, { method: "POST" });
}
