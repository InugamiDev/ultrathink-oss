"use client";

import { AIChat } from "@/components/ai/ai-chat";
import type { PersonaSkill } from "@/lib/ai/types";

/* ─── CMO Persona ──────────────────────────────────────────────────── */

const CMO_SYSTEM_PROMPT = `You are the **Chief Marketing Officer (CMO)** of the user's project. You are an elite marketing strategist powered by AI, embedded in the UltraThink dashboard.

Your capabilities:
- **Live Market Research**: Search the web for real-time competitor data, market trends, industry news
- **Content Strategy**: Generate blog outlines, social media calendars, email sequences, ad copy
- **Brand Strategy**: Define positioning, messaging frameworks, tone of voice guidelines
- **Competitor Analysis**: Research and compare competitors, identify gaps and opportunities
- **SEO & Content**: Keyword suggestions, meta descriptions, content briefs
- **Audience Insights**: Build personas, analyze target demographics, map customer journeys
- **Campaign Planning**: Design multi-channel campaigns with timelines and KPIs

Guidelines:
- Always back claims with data. Search the web for current information when needed.
- Be actionable — give specific steps, not vague advice.
- Format responses with clear headings, bullet points, and tables where appropriate.
- When researching, cite your sources with URLs.
- Think like a startup CMO: scrappy, data-driven, results-oriented.
- Use markdown formatting for readability.`;

const CMO_SKILLS: PersonaSkill[] = [
  {
    type: "research",
    label: "Market Research",
    icon: "🔍",
    placeholder: "Research the market for AI-powered developer tools...",
    needsWebSearch: true,
  },
  {
    type: "competitor",
    label: "Competitor Intel",
    icon: "🎯",
    placeholder: "Analyze competitors of [your product]...",
    needsWebSearch: true,
  },
  {
    type: "content",
    label: "Content Strategy",
    icon: "📝",
    placeholder: "Create a content calendar for a B2B SaaS launch...",
  },
  {
    type: "copy",
    label: "Copy Generator",
    icon: "✍️",
    placeholder: "Write landing page copy for [product]...",
  },
  {
    type: "seo",
    label: "SEO Analysis",
    icon: "📈",
    placeholder: "SEO keyword strategy for [topic/niche]...",
    needsWebSearch: true,
  },
  {
    type: "campaign",
    label: "Campaign Plan",
    icon: "🚀",
    placeholder: "Plan a product launch campaign for...",
  },
  {
    type: "persona",
    label: "Audience Persona",
    icon: "👤",
    placeholder: "Build buyer personas for [target market]...",
    needsWebSearch: true,
  },
  {
    type: "brand",
    label: "Brand Strategy",
    icon: "💎",
    placeholder: "Define brand positioning for [product/company]...",
  },
];

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function CMOPage() {
  return (
    <AIChat
      systemPrompt={CMO_SYSTEM_PROMPT}
      skills={CMO_SKILLS}
      title="Your AI Chief Marketing Officer"
      subtitle="Live market research, competitor analysis, content strategy, and campaign planning — powered by Groq with thinking and web search."
      icon="📊"
      enableThinking={true}
    />
  );
}
