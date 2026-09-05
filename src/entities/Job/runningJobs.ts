import { httpClient } from "@/shared/api/httpClient";

export interface RunningJobSummary {
  jobId: string;
  announcementId: string;
  announcementName: string;
  kind: "CLEAN" | "RESUME";
  status: "CREATED" | "RUNNING";
  phase: string | null;
  message: string | null;
  updatedAt: string;
  statusUrl: string;
}

interface RunningJobListResponse {
  jobs: RunningJobSummary[];
}

export async function listRunningJobs(
  signal?: AbortSignal,
): Promise<RunningJobSummary[]> {
  const response = await httpClient.get<RunningJobListResponse>(
    "/api/v1/jobs",
    { signal },
  );
  return response.data.jobs;
}
