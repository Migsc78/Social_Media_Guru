import { Router } from 'express';
import { getDomain, getCrawledPages, getAgentData, storeAgentData, storePostDrafts } from '../db/database.js';
import { crawlDomain } from '../services/crawler.js';
import OpenAI from 'openai';
import { getAllSettings, getSetting } from '../db/database.js';

export const pipelineRoutes = Router();

// ─── LLM helper (inline, mirrors agents/src/llmClient.js) ──────

async function callLLM(systemPrompt, userPrompt, { temperature = 0.7, maxTokens = 4000 } = {}) {
    const settings = getAllSettings();
    const provider = settings.active_provider || 'openai';
    const prefix = provider;
    const apiKey = settings[`${prefix}_api_key`] || process.env.OPENAI_API_KEY || '';
    const baseURL = settings[`${prefix}_base_url`] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = settings[`${prefix}_model`] || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) throw new Error(`No API key configured for provider "${provider}". Go to Settings.`);

    const client = new OpenAI({ apiKey, baseURL });
    console.log(`[Pipeline LLM] ${provider} / ${model}`);

    const opts = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
    };

    // Retry with exponential backoff for rate limits
    const MAX_RETRIES = 4;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await client.chat.completions.create(opts);
            const content = response.choices[0]?.message?.content || '{}';
            // Strip markdown fences if present
            const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            return JSON.parse(cleaned);
        } catch (err) {
            const is429 = err.status === 429 || err.message?.includes('429');
            if (is429 && attempt < MAX_RETRIES) {
                const delay = attempt * 8000; // 8s, 16s, 24s
                console.log(`[Pipeline LLM] Rate limited (429). Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
}

// ─── Pipeline status + log tracking (in-memory) ────────────────

const pipelineRuns = new Map();  // domainId -> { status, currentStep, error, steps, logs[] }

function pipelineLog(domainId, level, message) {
    const run = pipelineRuns.get(domainId);
    if (!run) return;
    const entry = { time: new Date().toISOString(), level, message };
    run.logs.push(entry);
    // Keep last 100 entries
    if (run.logs.length > 100) run.logs.shift();
    console.log(`[Pipeline] ${message}`);
}

function updatePipelineRun(domainId, step, status, error = null) {
    const run = pipelineRuns.get(domainId) || { status: 'idle', currentStep: null, error: null, steps: {}, logs: [] };
    run.currentStep = step;
    run.status = status;
    run.error = error;
    if (step) run.steps[step] = status === 'error' ? 'error' : status === 'running' ? 'running' : 'done';
    pipelineRuns.set(domainId, run);
    if (error) pipelineLog(domainId, 'error', `❌ ${error}`);
}

// ─── Pipeline execution ────────────────────────────────────────

pipelineRoutes.post('/domains/:id/pipeline', async (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const domainId = domain.id;
        const existing = pipelineRuns.get(domainId);
        if (existing && existing.status === 'running') {
            return res.json({ success: true, message: 'Pipeline already running', ...existing });
        }

        // Respond immediately, run pipeline in background
        updatePipelineRun(domainId, 'crawl', 'running');
        res.json({ success: true, message: 'Pipeline started', domainId });

        // Run pipeline steps sequentially in the background
        runPipeline(domainId, domain, req.body || {}).catch(err => {
            console.error('[Pipeline] Fatal error:', err.message);
            updatePipelineRun(domainId, null, 'error', err.message);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function runPipeline(domainId, domain, opts) {
    const { maxPages = 20, maxDepth = 2 } = opts;

    try {
        // Step 1: Crawl
        pipelineLog(domainId, 'info', '🔍 Step 1/5: Crawling website...');
        updatePipelineRun(domainId, 'crawl', 'running');
        let pages = getCrawledPages(domainId);
        if (pages.length === 0) {
            pipelineLog(domainId, 'info', `Fetching up to ${maxPages} pages from ${domain.url}`);
            await crawlDomain(domainId, domain.url, { maxPages, maxDepth });
            pages = getCrawledPages(domainId);
        }
        updatePipelineRun(domainId, 'crawl', 'done');
        pipelineLog(domainId, 'success', `✅ Crawl complete — ${pages.length} pages indexed`);

        const siteContext = buildSiteContext(domain, pages);

        // Step 2: Site Analysis
        pipelineLog(domainId, 'info', '🧠 Step 2/5: Analyzing brand & site...');
        updatePipelineRun(domainId, 'siteAnalysis', 'running');
        pipelineLog(domainId, 'info', 'Sending site content to LLM for brand analysis...');
        const profile = await callLLM(
            'You are a brand strategist. Analyze the website and return a JSON brand profile with: brandSummary, targetAudience, uniqueSellingPoints (array), brandPersonality (array of traits), industry, competitors (array of names), strengths (array), weaknesses (array).',
            `Analyze this website:\n${siteContext}\n\nReturn valid JSON only.`,
            { temperature: 0.6, maxTokens: 3000 }
        );
        storeAgentData('domain_profiles', domainId, profile);
        updatePipelineRun(domainId, 'siteAnalysis', 'done');
        pipelineLog(domainId, 'success', `✅ Site analysis complete — industry: ${profile.industry || 'identified'}`);

        await new Promise(r => setTimeout(r, 3000));

        // Step 3: Competitor Research
        pipelineLog(domainId, 'info', '🏆 Step 3/5: Researching competitors...');
        updatePipelineRun(domainId, 'competitorResearch', 'running');
        pipelineLog(domainId, 'info', 'Identifying competitors and market position...');
        const competitors = await callLLM(
            'You are a competitive intelligence analyst. Based on the brand profile and website data, identify top competitors and analyze them. Return JSON with: competitors (array of {name, url, strengths, weaknesses, socialPresence}), marketPosition, opportunities (array).',
            `Brand: ${domain.name} (${domain.url})\nProfile: ${JSON.stringify(profile)}\n\nReturn valid JSON only.`,
            { temperature: 0.6, maxTokens: 3000 }
        );
        storeAgentData('competitor_sets', domainId, competitors);
        updatePipelineRun(domainId, 'competitorResearch', 'done');
        const competitorCount = competitors.competitors?.length || 0;
        pipelineLog(domainId, 'success', `✅ Competitor research complete — ${competitorCount} competitors analyzed`);

        await new Promise(r => setTimeout(r, 3000));

        // Step 4: Content Strategy
        pipelineLog(domainId, 'info', '📋 Step 4/5: Building content strategy...');
        updatePipelineRun(domainId, 'contentStrategy', 'running');
        pipelineLog(domainId, 'info', 'Creating content pillars, posting schedule, and tone guidelines...');
        const strategy = await callLLM(
            'You are a social media content strategist. Create a content strategy based on the brand profile, competitors, and target audience. Return JSON with: pillars (array of {name, description, percentage}), postingFrequency (object per platform), contentMix (array of {type, percentage}), toneGuidelines, hashtagStrategy, bestPostingTimes.',
            `Brand: ${domain.name}\nGoal: ${domain.primary_goal}\nProfile: ${JSON.stringify(profile)}\nCompetitors: ${JSON.stringify(competitors)}\n\nReturn valid JSON only.`,
            { temperature: 0.7, maxTokens: 4000 }
        );
        storeAgentData('content_strategies', domainId, strategy);
        updatePipelineRun(domainId, 'contentStrategy', 'done');
        const pillarCount = strategy.pillars?.length || 0;
        pipelineLog(domainId, 'success', `✅ Content strategy complete — ${pillarCount} content pillars defined`);

        await new Promise(r => setTimeout(r, 3000));

        // Step 5: Campaign Calendar (30-day)
        pipelineLog(domainId, 'info', '📅 Step 5/5: Generating 30-day campaign calendar...');
        updatePipelineRun(domainId, 'campaignCalendar', 'running');
        pipelineLog(domainId, 'info', 'Creating post schedule with captions and hashtags...');
        const calendar = await callLLM(
            `You are a social media campaign planner. Generate a 30-day content calendar starting from today (${new Date().toISOString().slice(0, 10)}). Return JSON with: posts (array of {date (YYYY-MM-DD), platform, contentType, topic, caption, hashtags (array), status: "draft"}).  Generate 2-3 posts per day across different platforms. Keep captions engaging and on-brand.`,
            `Brand: ${domain.name} (${domain.url})\nStrategy: ${JSON.stringify(strategy)}\nProfile: ${JSON.stringify(profile)}\n\nReturn valid JSON only.`,
            { temperature: 0.8, maxTokens: 8000 }
        );
        storeAgentData('campaign_calendars', domainId, calendar);
        updatePipelineRun(domainId, 'campaignCalendar', 'done');

        // Store posts from calendar as drafts
        const calendarPosts = calendar.posts || calendar.drafts || calendar.content || [];
        if (Array.isArray(calendarPosts) && calendarPosts.length > 0) {
            try {
                const postDrafts = calendarPosts.map(p => ({
                    platform: p.platform || 'twitter',
                    text: p.caption || p.body || p.content || p.topic || '',
                    scheduledDate: p.date || p.scheduled_date || null,
                    status: 'draft',
                    hashtags: p.hashtags || [],
                    contentType: p.contentType || p.content_type || 'post',
                }));
                storePostDrafts(domainId, null, postDrafts);
                pipelineLog(domainId, 'success', `✅ Calendar complete — ${postDrafts.length} posts generated`);
            } catch (draftErr) {
                pipelineLog(domainId, 'error', `⚠️ Failed to store drafts: ${draftErr.message}`);
            }
        } else {
            pipelineLog(domainId, 'info', 'Calendar generated but no individual posts to store as drafts');
        }

        updatePipelineRun(domainId, null, 'done');
        pipelineLog(domainId, 'success', '🎉 Pipeline complete! All steps finished successfully.');
    } catch (err) {
        pipelineLog(domainId, 'error', `Pipeline failed: ${err.message}`);
        updatePipelineRun(domainId, null, 'error', err.message);
    }
}

function buildSiteContext(domain, pages) {
    let ctx = `Website: ${domain.url}\nName: ${domain.name}\nGoal: ${domain.primary_goal}\nBrand Voice: ${domain.brand_voice_tone || 'professional'}\n\n`;
    ctx += `Crawled Pages (${pages.length}):\n`;
    for (const page of pages.slice(0, 10)) {
        ctx += `\n--- ${page.title || page.url} ---\n`;
        ctx += (page.body_text || '').slice(0, 500) + '\n';
    }
    return ctx;
}

// ─── Status endpoint ───────────────────────────────────────────

pipelineRoutes.get('/domains/:id/status', (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const pages = getCrawledPages(req.params.id);
        const profile = getAgentData('domain_profiles', req.params.id);
        const competitors = getAgentData('competitor_sets', req.params.id);
        const positioning = getAgentData('positioning_summaries', req.params.id);
        const strategy = getAgentData('content_strategies', req.params.id);
        const calendar = getAgentData('campaign_calendars', req.params.id);

        const run = pipelineRuns.get(req.params.id) || {};

        res.json({
            domainId: req.params.id,
            domain: domain.url,
            pipelineStatus: run.status || 'idle',
            currentStep: run.currentStep || null,
            error: run.error || null,
            logs: run.logs || [],
            steps: {
                crawl: { done: pages.length > 0, pageCount: pages.length, status: run.steps?.crawl || (pages.length > 0 ? 'done' : 'pending') },
                siteAnalysis: { done: !!profile, status: run.steps?.siteAnalysis || (profile ? 'done' : 'pending') },
                competitorResearch: { done: !!competitors, status: run.steps?.competitorResearch || (competitors ? 'done' : 'pending') },
                contentStrategy: { done: !!strategy, status: run.steps?.contentStrategy || (strategy ? 'done' : 'pending') },
                campaignCalendar: { done: !!calendar, status: run.steps?.campaignCalendar || (calendar ? 'done' : 'pending') },
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Crawl endpoint ────────────────────────────────────────────

pipelineRoutes.post('/domains/:id/crawl', async (req, res) => {
    try {
        const domain = getDomain(req.params.id);
        if (!domain) return res.status(404).json({ error: 'Domain not found' });

        const { maxPages = 20, maxDepth = 2 } = req.body || {};
        await crawlDomain(req.params.id, domain.url, { maxPages, maxDepth });
        const pages = getCrawledPages(req.params.id);
        res.json({ success: true, pagesCount: pages.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
