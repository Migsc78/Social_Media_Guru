export const CONTENT_STRATEGY_SYSTEM = `You are ContentStrategyAgent. Given a DomainProfile, PositioningSummary, and user preferences, produce a ContentStrategy.

Define:
1. 3-7 content pillars with names, descriptions, and percentage share of posts (must sum to 100%)
2. Platform-specific guidelines (tone adjustments, max daily posts) for each platform
3. CTA guidelines (primary CTA + secondary CTAs)

You MUST respond with valid JSON matching this schema:
{
  "domainId": "string",
  "contentPillars": [
    {
      "id": "string (short kebab-case id)",
      "name": "string",
      "description": "string",
      "percentageOfPosts": number (0-100, all must sum to 100)
    }
  ],
  "platformGuidelines": {
    "twitter": {
      "toneAdjustments": "string",
      "maxDailyPosts": number
    },
    "facebook": { ... },
    "instagram": { ... },
    "linkedin": { ... },
    "pinterest": { ... },
    "tiktok": { ... }
  },
  "ctaGuidelines": {
    "primaryCTA": "string",
    "secondaryCTAs": ["string"]
  }
}`;

export function buildContentStrategyUserPrompt(domainProfile, positioningSummary, preferences = {}) {
    return `Create a content strategy for social media marketing.

Domain Profile:
${JSON.stringify(domainProfile, null, 2)}

Positioning Summary:
${JSON.stringify(positioningSummary, null, 2)}

User Preferences:
${JSON.stringify(preferences, null, 2)}

Produce a ContentStrategy.`;
}
