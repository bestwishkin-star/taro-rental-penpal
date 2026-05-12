import type { OverviewPayload } from '@shared/contracts/overview';

const payload: OverviewPayload = {
  stats: [
    { label: 'Launch target', value: 'WeChat' },
    { label: 'Modules', value: '04' },
    { label: 'Shared pkg', value: 'Ready' }
  ],
  entries: [
    {
      title: 'Quick Login',
      tag: 'Auth',
      route: '/pages/login/index',
      description: 'Collect phone number authorization, profile setup, and onboarding actions.'
    },
    {
      title: 'Story Feed',
      tag: 'Community',
      route: '/pages/rental/index',
      description: 'Browse story-first posts with photos, comments, favorites, and reports.'
    },
    {
      title: 'Chat Entry',
      tag: 'Message',
      route: '/pages/chat/index',
      description: 'Enter the message inbox and drive the first conversation with structured prompts.'
    }
  ],
  sections: [
    {
      title: 'Modular Domains',
      description: 'Split features, shared utilities, and page shells to keep concerns isolated.'
    },
    {
      title: 'Multi-Platform Ready',
      description: 'WeChat is the first target, while Douyin and JD hooks stay available for later.'
    },
    {
      title: 'Shared Contracts',
      description: 'Move cross-end types into packages/shared so API fields do not drift over time.'
    }
  ]
};

export function getOverviewPayload() {
  return payload;
}
