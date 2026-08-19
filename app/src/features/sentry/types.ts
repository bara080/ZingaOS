export type SentryIssueLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export type SentryIssue = {
  issueId: string;
  title: string;
  level: SentryIssueLevel;
  culprit: string;
  environment: string;
  platform: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  alertRule?: string;
};

export type SentrySummary = {
  openIssues: number;
  crashFreeRate: number | null;
  errorRate: number | null;
  trend: { date: string; count: number }[];
  topIssues: { issueId: string; title: string; count: number; level: SentryIssueLevel }[];
  recentIssues: {
    issueId: string;
    title: string;
    level: SentryIssueLevel;
    culprit: string;
    lastSeen: string;
    permalink: string;
  }[];
};

export type SentryIssueListItem = {
  id: string;
  issueId: string;
  title: string;
  level: SentryIssueLevel;
  culprit: string;
  environment: string;
  count: number;
  lastSeen: string;
  permalink: string;
};

export type SentryIssuesResponse = {
  data: SentryIssueListItem[];
  total: number;
  page: number;
  pageSize: number;
};
