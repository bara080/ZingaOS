export type LogRocketSession = {
  id: string;
  sessionId: string;
  url: string;           // LogRocket replay URL
  pageUrl: string;       // Page being recorded
  duration: number;      // seconds
  hasErrors: boolean;
  errorCount: number;
  errors: { message: string; file: string; line: number }[];
  os: string;
  browser: string;
  identity: {
    uid: string;
    name: string;
    email: string;
  };
  lastSeen: string;      // ISO string
};

export type LogRocketSummary = {
  totalSessions: number;
  errorFreeRate: number | null;   // 0-100
  errorSessions: number;
  avgDuration: number | null;     // seconds
  trend: { date: string; sessions: number; errorSessions: number }[];
  topErrors: { message: string; count: number }[];
  recentSessions: LogRocketSession[];
};

export type LogRocketSessionsResponse = {
  data: LogRocketSession[];
  total: number;
  page: number;
  pageSize: number;
};
