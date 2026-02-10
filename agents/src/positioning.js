import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { POSITIONING_SYSTEM, buildPositioningUserPrompt } from './prompts/positioning.js';

/**
 * PositioningAgent: Combines DomainProfile + CompetitorSet → PositioningSummary.
 */
export async function runPositioning(domainId) {
    console.log(`[PositioningAgent] Starting for domain ${domainId}`);

    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    if (!profile) throw new Error('DomainProfile not found.');

    const competitors = await fetchFromBackend(`/api/agent/competitor_sets/${domainId}`);
    if (!competitors) throw new Error('CompetitorSet not found.');

    const userPrompt = buildPositioningUserPrompt(profile, competitors);
    const positioning = await callLLM(POSITIONING_SYSTEM, userPrompt, { maxTokens: 3000 });

    positioning.domainId = domainId;
    await postToBackend(`/api/agent/positioning_summaries/${domainId}`, positioning);

    console.log(`[PositioningAgent] PositioningSummary stored`);
    return positioning;
}
