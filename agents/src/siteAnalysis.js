import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { SITE_ANALYSIS_SYSTEM, buildSiteAnalysisUserPrompt } from './prompts/siteAnalysis.js';

/**
 * SiteAnalysisAgent: Fetches crawled pages, calls LLM, stores DomainProfile.
 */
export async function runSiteAnalysis(domainId) {
    console.log(`[SiteAnalysisAgent] Starting analysis for domain ${domainId}`);

    // 1. Fetch domain info
    const domain = await fetchFromBackend(`/api/domains/${domainId}`);

    // 2. Fetch crawled pages
    const pages = await fetchFromBackend(`/api/domains/${domainId}/pages`);
    if (!pages || pages.length === 0) {
        throw new Error('No crawled pages found. Run the crawler first.');
    }

    // 3. Call LLM with site analysis prompts
    const userPrompt = buildSiteAnalysisUserPrompt(domainId, domain.url, pages);
    const profile = await callLLM(SITE_ANALYSIS_SYSTEM, userPrompt, { maxTokens: 4000 });

    // Ensure domainId is set
    profile.domainId = domainId;
    profile.url = domain.url;

    // 4. Store the DomainProfile
    await postToBackend(`/api/agent/domain_profiles/${domainId}`, profile);

    console.log(`[SiteAnalysisAgent] DomainProfile stored for ${domain.url}`);
    return profile;
}
