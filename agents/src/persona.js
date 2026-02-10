/**
 * PersonaAgent orchestration – fetches site data, calls LLM, stores personas.
 */
import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts/persona.js';

export async function runPersonaGeneration(domainId) {
    console.log(`[PersonaAgent] Generating personas for domain ${domainId}`);

    // Fetch all available data
    const [domain, pages, profile, competitors] = await Promise.all([
        fetchFromBackend(`/api/domains/${domainId}`),
        fetchFromBackend(`/api/domains/${domainId}/pages`).catch(() => []),
        fetchFromBackend(`/api/agent/domain_profiles/${domainId}`).catch(() => null),
        fetchFromBackend(`/api/agent/competitor_sets/${domainId}`).catch(() => null),
    ]);

    const siteData = {
        url: domain.url,
        name: domain.name,
        primaryGoal: domain.primary_goal,
        audienceDescription: domain.audience_description,
        brandVoiceTone: domain.brand_voice_tone,
        brandVoiceFormality: domain.brand_voice_formality,
        pages,
        profile,
        competitors,
    };

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(siteData);

    const result = await callLLM(systemPrompt, userPrompt, {
        temperature: 0.8,
        maxTokens: 6000,
    });

    if (!result.personas || !Array.isArray(result.personas)) {
        throw new Error('PersonaAgent returned invalid data: missing personas array');
    }

    // Store personas via backend API
    const stored = await postToBackend(`/api/personas/${domainId}`, {
        personas: result.personas,
    });

    console.log(`[PersonaAgent] Generated ${result.personas.length} personas for domain ${domainId}`);
    return stored;
}
