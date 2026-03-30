export const miniProgramPlatforms = ['weapp', 'tt', 'jd'] as const;

export type MiniProgramPlatform = (typeof miniProgramPlatforms)[number];
