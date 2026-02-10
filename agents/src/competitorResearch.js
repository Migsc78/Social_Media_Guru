import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { COMPETITOR_RESEARCH_SYSTEM, buildCompetitorResearchUserPrompt } from './prompts/competitorResearch.js';

/**
 * CompetitorResearchAgent: Uses DomainProfile to discover and analyze competitors.
 */
export async function runCompetitorResearch(domainId) {
    console.log(`[CompetitorResearchAgent] Starting for domain ${domainId}`);

    // 1. Fetch domain profile
    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    if (!profile) throw new Error('DomainProfile not found. Run SiteAnalysisAgent first.');

    // 2. Generate candidate competitors from content topics
    const candidates = generateCandidates(profile);

    // 3. Call LLM
    const userPrompt = buildCompetitorResearchUserPrompt(profile, candidates);
    const competitorSet = await callLLM(COMPETITOR_RESEARCH_SYSTEM, userPrompt, { maxTokens: 4000 });

    competitorSet.domainId = domainId;

    // 4. Store CompetitorSet
    await postToBackend(`/api/agent/competitor_sets/${domainId}`, competitorSet);

    console.log(`[CompetitorResearchAgent] CompetitorSet stored (${competitorSet.competitors?.length || 0} competitors)`);
    return competitorSet;
}

/**
 * Generate candidate competitors based on domain profile content.
 * In production, this would use search APIs (Google, Bing, SimilarWeb, etc.)
 */
function generateCandidates(profile) {
    const topics = profile.contentTopics?.map(t => t.name) || [];
    const purpose = profile.primaryPurpose || 'content_site';

    return {
        domainUrl: profile.url,
        primaryPurpose: purpose,
        contentTopics: topics,
        audienceSegments: profile.audienceSegments?.map(s => s.name) || [],
        note: 'Based on content analysis. In production, use search/API to discover actual competitor domains.'
    };
}
