/**
 * Platform constraints for post generation.
 */
export const PLATFORM_CONSTRAINTS = {
    twitter: {
        name: 'Twitter / X',
        maxChars: 280,
        maxHashtags: 5,
        supportsThreads: true,
        supportsLinks: true,
        mediaTypes: ['image', 'video', 'carousel'],
        toneDefault: 'concise, punchy, conversational',
        maxDailyPosts: 3,
        bestTimes: ['09:00', '12:00', '17:00', '20:00']
    },
    facebook: {
        name: 'Facebook',
        maxChars: 2000,
        maxHashtags: 3,
        supportsThreads: false,
        supportsLinks: true,
        mediaTypes: ['image', 'video', 'carousel'],
        toneDefault: 'conversational, engaging, storytelling',
        maxDailyPosts: 2,
        bestTimes: ['09:00', '13:00', '16:00']
    },
    instagram: {
        name: 'Instagram',
        maxChars: 2200,
        maxHashtags: 30,
        supportsThreads: false,
        supportsLinks: false,
        mediaTypes: ['image', 'video', 'carousel'],
        toneDefault: 'visual-first, aspirational, authentic',
        maxDailyPosts: 2,
        bestTimes: ['08:00', '12:00', '19:00']
    },
    linkedin: {
        name: 'LinkedIn',
        maxChars: 3000,
        maxHashtags: 5,
        supportsThreads: false,
        supportsLinks: true,
        mediaTypes: ['image', 'video', 'carousel'],
        toneDefault: 'professional, insightful, thought-leadership',
        maxDailyPosts: 2,
        bestTimes: ['08:00', '10:00', '17:00']
    },
    pinterest: {
        name: 'Pinterest',
        maxChars: 500,
        maxHashtags: 5,
        supportsThreads: false,
        supportsLinks: true,
        mediaTypes: ['image'],
        toneDefault: 'descriptive, keyword-rich, actionable',
        maxDailyPosts: 5,
        bestTimes: ['14:00', '20:00', '21:00']
    },
    tiktok: {
        name: 'TikTok',
        maxChars: 2200,
        maxHashtags: 5,
        supportsThreads: false,
        supportsLinks: false,
        mediaTypes: ['video'],
        toneDefault: 'trendy, casual, entertaining, authentic',
        maxDailyPosts: 2,
        bestTimes: ['07:00', '12:00', '19:00']
    }
};

export function getPlatformConstraint(platform) {
    return PLATFORM_CONSTRAINTS[platform] || PLATFORM_CONSTRAINTS.twitter;
}

export function getAllPlatformNames() {
    return Object.keys(PLATFORM_CONSTRAINTS);
}
