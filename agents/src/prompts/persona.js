/**
 * PersonaAgent – Generates target audience personas based on
 * crawled site data, competitor research, and domain goals.
 */

export function buildSystemPrompt() {
    return `You are PersonaAgent, a marketing strategist specializing in audience research and buyer persona creation.

Your task: Analyze the provided website data, competitor information, and business goals to create detailed, actionable buyer personas.

Each persona must be a realistic, specific person — not a vague demographic segment. Give them a name, specific age, job title, daily struggles, and motivations. The persona should feel like someone you could actually meet.

CRITICAL RULES:
- Create 2-3 distinct personas (primary, secondary, and optionally tertiary)
- Base personas on EVIDENCE from the site content, not assumptions
- Each persona must have different pain points and motivations
- Include specific social media platform preferences with reasoning
- Include specific content format preferences (video, long-form, infographics, etc.)
- Include buying triggers and objections specific to this product/service
- Mark one persona as "primary" (the highest-value target)

Return valid JSON matching the schema below.`;
}

export function buildUserPrompt(siteData) {
    return `Analyze this business and create detailed buyer personas:

## Business Information
- **URL**: ${siteData.url}
- **Name**: ${siteData.name}
- **Primary Goal**: ${siteData.primaryGoal}
- **Current Audience Description**: ${siteData.audienceDescription || 'Not provided'}
- **Brand Voice**: ${siteData.brandVoiceTone} / ${siteData.brandVoiceFormality}

## Crawled Site Content
${siteData.pages?.map(p => `### ${p.title || p.url}
Type: ${p.page_type || 'unknown'}
${p.body_text?.slice(0, 800) || ''}`).join('\n\n') || 'No crawled content available.'}

## Competitor Information
${siteData.competitors ? JSON.stringify(siteData.competitors, null, 2).slice(0, 2000) : 'No competitor data available.'}

## Domain Profile
${siteData.profile ? JSON.stringify(siteData.profile, null, 2).slice(0, 1500) : 'No profile data available.'}

---

Return a JSON object with this exact structure:
{
  "personas": [
    {
      "name": "Full Name (e.g. Sarah Mitchell)",
      "avatarEmoji": "emoji that represents this persona",
      "isPrimary": true,
      "demographics": {
        "ageRange": "28-35",
        "gender": "Female",
        "location": "Urban US, tier-1 cities",
        "incomeRange": "$60K-$90K",
        "education": "Bachelor's degree",
        "jobTitle": "Marketing Manager",
        "industry": "B2B SaaS"
      },
      "psychographics": {
        "values": ["efficiency", "career growth", "work-life balance"],
        "interests": ["productivity tools", "industry podcasts", "professional development"],
        "lifestyle": "Busy professional juggling multiple projects",
        "attitudes": "Early adopter, values ROI over trends"
      },
      "painPoints": [
        "Specific pain point 1 related to the product/service",
        "Specific pain point 2",
        "Specific pain point 3"
      ],
      "motivations": [
        "What drives them to seek a solution",
        "What success looks like for them"
      ],
      "buyingTriggers": [
        "Specific event or situation that triggers purchase consideration"
      ],
      "objections": [
        "Why they might hesitate to buy/sign up"
      ],
      "preferredPlatforms": ["linkedin", "twitter"],
      "contentPreferences": {
        "formats": ["case studies", "how-to guides", "short videos"],
        "topics": ["productivity", "team management", "industry trends"],
        "tonePreference": "professional but approachable"
      },
      "onlineBehavior": {
        "activeHours": "8am-6pm weekdays, sporadic weekends",
        "contentConsumption": "Skims headlines, deep-reads what resonates",
        "engagementStyle": "Shares useful content, comments on thought leadership"
      },
      "keywords": ["term they search for", "phrase they use"]
    }
  ]
}`;
}
