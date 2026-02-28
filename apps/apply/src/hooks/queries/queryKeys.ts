export const queryKeys = {
  applications: {
    all: () => ['applications'] as const,
    byUser: (userId: string) => ['applications', 'user', userId] as const,
    byWard: (ward: string) => ['applications', 'ward', ward] as const,
    byStake: (stake: string) => ['applications', 'stake', stake] as const,
    detail: (id: string) => ['applications', id] as const,
  },
  recommendations: {
    all: () => ['recommendations'] as const,
    byLeader: (leaderId: string) => ['recommendations', 'leader', leaderId] as const,
    byWard: (ward: string) => ['recommendations', 'ward', ward] as const,
    byStake: (stake: string) => ['recommendations', 'stake', stake] as const,
    detail: (id: string) => ['recommendations', id] as const,
  },
  memos: {
    byApplication: (applicationId: string) => ['memos', 'application', applicationId] as const,
  },
  comments: {
    byRecommendation: (recommendationId: string) => ['comments', 'recommendation', recommendationId] as const,
    byApplication: (applicationId: string) => ['comments', 'application', applicationId] as const,
  },
  users: {
    all: () => ['users'] as const,
    detail: (uid: string) => ['users', uid] as const,
  },
  stakeWardChanges: {
    all: () => ['stakeWardChanges'] as const,
    pending: () => ['stakeWardChanges', 'pending'] as const,
  },
  conferences: {
    all: () => ['conferences'] as const,
    detail: (id: string) => ['conferences', id] as const,
  },
  positions: {
    all: () => ['positions'] as const,
    byConference: (conferenceId: string) => ['positions', 'conference', conferenceId] as const,
    detail: (id: string) => ['positions', id] as const,
  },
} as const
