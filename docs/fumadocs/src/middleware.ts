import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCK = /GPTBot|ClaudeBot|anthropic-ai|CCBot|Google-Extended|Applebot-Extended|Bytespider|Amazonbot|Meta-ExternalAgent|cohere-ai|Diffbot|ImagesiftBot|Omgilibot|peer39_crawler|YouBot|Timpibot|ICC-Crawler|AhrefsBot|SemrushBot|MJ12bot|DotBot|PetalBot|BLEXBot|MegaIndex|SeznamBot|DataForSeoBot/i;

const ALLOW = /Googlebot|Bingbot|DuckDuckBot|Applebot(?!-Extended)|ChatGPT-User|OAI-SearchBot|PerplexityBot|Perplexity-User|Claude-User|Claude-SearchBot|FirecrawlAgent|firecrawl|Context7Bot|Crawl4AI|Clawdbot|OpenClaw|Hermes/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') || '';
  if (ALLOW.test(ua)) return NextResponse.next();
  if (BLOCK.test(ua)) {
    return new NextResponse('disallowed by robots.txt', {
      status: 403,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon|robots\\.txt|sitemap\\.xml).*)',
};
