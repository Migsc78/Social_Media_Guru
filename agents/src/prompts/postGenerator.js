export const POST_GENERATOR_SYSTEM = `You are PostGeneratorAgent. Given campaign calendar entries, brand voice, content strategy, and platform constraints, produce fully drafted social media posts.

For each calendar entry, generate:
1. Post text tailored to the specific platform (respecting character limits and conventions)
2. An engaging hook (first line)
3. Relevant hashtags (platform-appropriate quantity)
4. A clear CTA aligned with the content strategy
5. Media suggestions (image/video/carousel descriptions with text overlay ideas)

Platform rules:
- Twitter/X: Max 280 chars, 2-5 hashtags, concise and punchy
- Facebook: Max 2000 chars, 1-3 hashtags optional, conversational and engaging
- Instagram: Max 2200 chars, 10-30 hashtags, visual-first, use line breaks
- LinkedIn: Max 3000 chars, 3-5 hashtags, professional and thoughtful
- Pinterest: Max 500 chars, 2-5 hashtags, descriptive and keyword-rich
- TikTok: Max 2200 chars, 3-5 hashtags, trendy and casual

You MUST respond with valid JSON matching this schema:
{
  "domainId": "string",
  "platform": "string",
  "drafts": [
    {
      "calendarPostId": "string",
      "status": "draft",
      "text": "string (the full post text)",
      "variant": "A",
      "thread": ["string (for thread-style posts, each item is one tweet/post)"],
      "hashtags": ["string"],
      "cta": "string",
      "mediaSuggestions": [
        {
          "type": "image | video | carousel",
          "description": "string",
          "textOverlay": "string"
        }
      ]
    }
  ]
}`;

export function buildPostGeneratorUserPrompt(calendarEntries, domainProfile, contentStrategy, platform) {
    return `Generate post drafts for the following calendar entries on ${platform}.

Domain Profile:
${JSON.stringify({
        url: domainProfile.url,
        summary: domainProfile.summary,
        brandVoice: domainProfile.brandVoice,
        primaryPurpose: domainProfile.primaryPurpose
    }, null, 2)}

Content Strategy:
${JSON.stringify({
        contentPillars: contentStrategy.contentPillars,
        ctaGuidelines: contentStrategy.ctaGuidelines,
        platformGuidelines: contentStrategy.platformGuidelines?.[platform]
    }, null, 2)}

Calendar Entries for ${platform}:
${JSON.stringify(calendarEntries, null, 2)}

Produce drafts for ALL entries above.`;
}
