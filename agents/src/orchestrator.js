import 'dotenv/config';
import { runSiteAnalysis } from './siteAnalysis.js';
import { runCompetitorResearch } from './competitorResearch.js';
import { runPositioning } from './positioning.js';
import { runContentStrategy } from './contentStrategy.js';
import { runCalendarPlanner } from './calendarPlanner.js';
import { runPostGenerator } from './postGenerator.js';
import { fetchFromBackend, postToBackend } from './llmClient.js';

/**
 * OrchestratorAgent: Manages the full pipeline of analysis and content generation.
 *
 * Task Graph:
 *   crawl → siteAnalysis → competitorResearch → positioning → contentStrategy → calendarPlanner → postGenerator
 */

const TASKS = [
    {
        id: 'TASK_CRAWL',
        title: 'Crawl Domain',
        dependsOn: [],
        run: async (domainId, opts) => {
            await postToBackend(`/api/domains/${domainId}/crawl`, { maxPages: opts.maxPages || 20, maxDepth: opts.maxDepth || 3 });
        }
    },
    {
        id: 'TASK_SITE_ANALYSIS',
        title: 'Site Analysis',
        dependsOn: ['TASK_CRAWL'],
        run: async (domainId) => runSiteAnalysis(domainId)
    },
    {
        id: 'TASK_COMPETITOR_RESEARCH',
        title: 'Competitor Research',
        dependsOn: ['TASK_SITE_ANALYSIS'],
        run: async (domainId) => runCompetitorResearch(domainId)
    },
    {
        id: 'TASK_POSITIONING',
        title: 'Positioning Analysis',
        dependsOn: ['TASK_SITE_ANALYSIS', 'TASK_COMPETITOR_RESEARCH'],
        run: async (domainId) => runPositioning(domainId)
    },
    {
        id: 'TASK_CONTENT_STRATEGY',
        title: 'Content Strategy',
        dependsOn: ['TASK_POSITIONING'],
        run: async (domainId, opts) => runContentStrategy(domainId, opts.preferences || {})
    },
    {
        id: 'TASK_CALENDAR_PLANNER',
        title: 'Campaign Calendar',
        dependsOn: ['TASK_CONTENT_STRATEGY'],
        run: async (domainId, opts) => runCalendarPlanner(domainId, opts)
    },
    {
        id: 'TASK_POST_GENERATOR',
        title: 'Post Generation',
        dependsOn: ['TASK_CALENDAR_PLANNER'],
        run: async (domainId, opts) => runPostGenerator(domainId, opts)
    }
];

/**
 * Run the full pipeline for a domain.
 */
export async function runPipeline(domainId, options = {}) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  SMMA Pipeline - Domain: ${domainId}`);
    console.log(`${'═'.repeat(60)}\n`);

    const taskStatus = {};
    TASKS.forEach(t => { taskStatus[t.id] = 'todo'; });

    for (const task of TASKS) {
        // Check dependencies
        const depsReady = task.dependsOn.every(dep => taskStatus[dep] === 'done');
        if (!depsReady) {
            console.error(`[Orchestrator] BLOCKED: ${task.title} - waiting on dependencies`);
            taskStatus[task.id] = 'blocked';
            continue;
        }

        console.log(`\n▶ [${task.id}] ${task.title}`);
        taskStatus[task.id] = 'in_progress';

        try {
            await task.run(domainId, options);
            taskStatus[task.id] = 'done';
            console.log(`✓ [${task.id}] ${task.title} - DONE`);
        } catch (err) {
            console.error(`✗ [${task.id}] ${task.title} - FAILED: ${err.message}`);
            taskStatus[task.id] = 'blocked';
            // In v1, we stop on failure. Could continue with independent tasks in v2.
            break;
        }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  Pipeline Summary:');
    for (const task of TASKS) {
        const icon = taskStatus[task.id] === 'done' ? '✓' : taskStatus[task.id] === 'blocked' ? '✗' : '○';
        console.log(`  ${icon} ${task.title}: ${taskStatus[task.id]}`);
    }
    console.log(`${'═'.repeat(60)}\n`);

    return taskStatus;
}

// CLI entry point
if (process.argv[2]) {
    const domainId = process.argv[2];
    const platforms = process.argv[3]?.split(',') || ['twitter', 'facebook', 'linkedin', 'instagram'];

    runPipeline(domainId, { platforms })
        .then(status => {
            const allDone = Object.values(status).every(s => s === 'done');
            process.exit(allDone ? 0 : 1);
        })
        .catch(err => {
            console.error('Pipeline failed:', err);
            process.exit(1);
        });
}
