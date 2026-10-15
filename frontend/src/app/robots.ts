import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export const dynamic = "force-static";

// Answer engines are welcome: being quoted by ChatGPT, Claude, Perplexity and Gemini is the point.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "Amazonbot", "meta-externalagent", "DuckAssistBot", "cohere-ai", "MistralAI-User"];
// Account pages and the bare embed pages (desktop overlay, extension popup, Word pane) aren't useful search results.
const PRIVATE = ["/dashboard/", "/auth/", "/desktop/", "/extension/", "/word/", "/welcome/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }, { userAgent: AI_BOTS, allow: "/", disallow: PRIVATE }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
