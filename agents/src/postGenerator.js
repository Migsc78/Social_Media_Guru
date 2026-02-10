import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { POST_GENERATOR_SYSTEM, buildPostGeneratorUserPrompt } from './prompts/postGenerator.js';

/**
 * PostGeneratorAgent: Generates platform-specific post drafts from calendar entries.
 */
export async function runPostGenerator(domainId, options = {}) {
    const { platforms = ['twitter', 'facebook', 'linkedin', 'instagram'] } = options;
    console.log(`[PostGeneratorAgent] Starting for domain ${domainId}, platforms: ${platforms.join(', ')}`);

    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    if (!profile) throw new Error('DomainProfile not found.');

    const strategy = await fetchFromBackend(`/api/agent/content_strategies/${domainId}`);
    if (!strategy) throw new Error('ContentStrategy not found.');

    const calendar = await fetchFromBackend(`/api/agent/campaign_calendars/${domainId}`);
    if (!calendar) throw new Error('CampaignCalendar not found.');

    const allDrafts = [];

    for (const platform of platforms) {
        console.log(`[PostGeneratorAgent] Generating drafts for ${platform}...`);

        // Filter calendar entries for this platform
        const entries = (calendar.posts || []).filter(p => p.platform === platform);
        if (entries.length === 0) {
            console.log(`[PostGeneratorAgent] No calendar entries for ${platform}, skipping.`);
            continue;
        }

        // Process in batches of 10 to avoid token limits
        const batchSize = 10;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const userPrompt = buildPostGeneratorUserPrompt(batch, profile, strategy, platform);

            const result = await callLLM(POST_GENERATOR_SYSTEM, userPrompt, { maxTokens: 6000, temperature: 0.8 });

            const drafts = (result.drafts || []).map(d => ({
                ...d,
                platform,
                scheduledDate: batch.find(e => e.id === d.calendarPostId)?.date || null,
                scheduledTime: batch.find(e => e.id === d.calendarPostId)?.timeSlot || null,
                targetUrl: batch.find(e => e.id === d.calendarPostId)?.targetUrl || '',
                pillarId: batch.find(e => e.id === d.calendarPostId)?.pillarId || ''
            }));

            allDrafts.push(...drafts);
        }
    }

    // Store all drafts
    if (allDrafts.length > 0) {
        await postToBackend(`/api/domains/${domainId}/posts`, {
            calendarId: null,
            drafts: allDrafts
        });
    }

    console.log(`[PostGeneratorAgent] Total drafts generated: ${allDrafts.length}`);
    return allDrafts;
}

/**
 * Regenerate a single post draft with feedback.
 */
export async function regeneratePost(domainId, postId, feedback) {
    console.log(`[PostGeneratorAgent] Regenerating post ${postId} with feedback`);

    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    const strategy = await fetchFromBackend(`/api/agent/content_strategies/${domainId}`);
    const post = await fetchFromBackend(`/api/posts/${postId}`);

    if (!post) throw new Error('Post draft not found.');

    const systemPrompt = POST_GENERATOR_SYSTEM + `\n\nIMPORTANT: The user has provided feedback on a previous draft. Incorporate this feedback:\n"${feedback}"\n\nGenerate exactly ONE improved draft.`;

    const userPrompt = buildPostGeneratorUserPrompt(
        [{ id: post.calendar_post_id, date: post.scheduled_date, timeSlot: post.scheduled_time, platform: post.platform, pillarId: post.pillar_id, provisionalTitle: post.notes, targetUrl: post.target_url }],
        profile,
        strategy,
        post.platform
    );

    const result = await callLLM(systemPrompt, userPrompt, { maxTokens: 2000, temperature: 0.8 });
    const draft = result.drafts?.[0];

    if (draft) {
        // Update the existing post
        const updateData = {
            textContent: draft.text,
            hashtags: draft.hashtags,
            cta: draft.cta,
            mediaSuggestions: draft.mediaSuggestions,
            feedback
        };
        // We'd need a PUT endpoint for this
        console.log(`[PostGeneratorAgent] Post ${postId} regenerated`);
        return draft;
    }

    return null;
}
