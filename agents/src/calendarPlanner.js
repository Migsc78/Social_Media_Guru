import { callLLM, fetchFromBackend, postToBackend } from './llmClient.js';
import { CALENDAR_PLANNER_SYSTEM, buildCalendarPlannerUserPrompt } from './prompts/calendarPlanner.js';

/**
 * CalendarPlannerAgent: Produces 30-day CampaignCalendar.
 */
export async function runCalendarPlanner(domainId, options = {}) {
    console.log(`[CalendarPlannerAgent] Starting for domain ${domainId}`);

    const profile = await fetchFromBackend(`/api/agent/domain_profiles/${domainId}`);
    if (!profile) throw new Error('DomainProfile not found.');

    const strategy = await fetchFromBackend(`/api/agent/content_strategies/${domainId}`);
    if (!strategy) throw new Error('ContentStrategy not found.');

    const userPrompt = buildCalendarPlannerUserPrompt(profile, strategy, options);
    const calendar = await callLLM(CALENDAR_PLANNER_SYSTEM, userPrompt, { maxTokens: 8000, temperature: 0.8 });

    calendar.domainId = domainId;
    await postToBackend(`/api/agent/campaign_calendars/${domainId}`, calendar);

    console.log(`[CalendarPlannerAgent] CampaignCalendar stored (${calendar.posts?.length || 0} posts)`);
    return calendar;
}
