import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { CONTENT_STRATEGY_SYSTEM, buildContentStrategyUserPrompt } from './prompts/contentStrategy.js';

/**
 * ContentStrategyAgent: Produces ContentStrategy from DomainProfile + PositioningSummary + preferences.
 */
export async function runContentStrategy(domainId, preferences = {}) {
    console.log(`[ContentStrategyAgent] Starting for domain ${domainId}`);

    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    if (!profile) throw new Error('DomainProfile not found.');

    const positioning = await fetchFromBackend(`/api/agent/positioning_summaries/${domainId}`);
    if (!positioning) throw new Error('PositioningSummary not found.');

    const userPrompt = buildContentStrategyUserPrompt(profile, positioning, preferences);
    const strategy = await callLLM(CONTENT_STRATEGY_SYSTEM, userPrompt, { maxTokens: 4000 });

    strategy.domainId = domainId;
    await postToBackend(`/api/agent/content_strategies/${domainId}`, strategy);

    console.log(`[ContentStrategyAgent] ContentStrategy stored (${strategy.contentPillars?.length || 0} pillars)`);
    return strategy;
}
