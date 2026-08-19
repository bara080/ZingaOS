export type DeploymentState = 'READY' | 'ERROR' | 'BUILDING' | 'CANCELED' | 'QUEUED';

export type DeploymentEvent = {
  id: string;
  deploymentId: string;
  projectName: string;
  url: string;
  state: DeploymentState;
  target: 'production' | 'preview' | null;
  branch: string;
  commit: string;
  commitMessage: string;
  buildDuration: number | null;  // seconds
  createdAt: string;             // ISO string
};

export type VercelSummary = {
  lastDeployment: DeploymentEvent | null;
  totalDeployments: number;       // last 7 days
  successfulDeployments: number;
  failedDeployments: number;
  avgBuildDuration: number | null; // seconds
  trend: { date: string; deployments: number; failures: number }[];
  recentDeployments: DeploymentEvent[];
};

export type DeploymentsResponse = {
  data: DeploymentEvent[];
  total: number;
  page: number;
  pageSize: number;
};
