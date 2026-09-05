import { httpClient } from "@/shared/api/httpClient";

export type CleanJobStatus =
  | "CREATED"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export interface CleanJobAccepted {
  jobId: string;
  announcementId: string;
  status: Extract<CleanJobStatus, "CREATED" | "RUNNING">;
  accepted: true;
  statusUrl: string;
}

export interface CleanJobProgress {
  phaseIndex: number;
  phaseCount: number;
  phaseName: string;
  phaseMessage: string;
  files: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    byStatus: Record<string, number>;
  };
}

export interface CleanJob {
  jobId: string;
  announcementId: string | null;
  status: CleanJobStatus;
  phase: string | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  progress: CleanJobProgress;
  error: { code: string; message: string } | null;
}

export interface ExtractionAccepted {
  announcementId: string;
  lastExtractionStatus: "RUNNING";
}

export interface MatchAccepted {
  announcementId: string;
  lastMatchStatus: "RUNNING";
}

export interface AnnouncementMatchResult {
  announcementId: string;
  possible: boolean;
  reason: string;
  matchedProducts: string[];
  matchedKeywords: string[];
  relevantSubLots: string[];
  supportingEvidence: string[];
  risks: string[];
  matchedAt: string;
}

export async function cleanAnnouncement(
  announcementId: string,
): Promise<CleanJobAccepted> {
  const response = await httpClient.post<CleanJobAccepted>(
    `/api/v1/announcements/${announcementId}/clean`,
    {},
  );
  return response.data;
}

export async function getCleanJob(jobId: string): Promise<CleanJob> {
  const response = await httpClient.get<CleanJob>(`/api/v1/jobs/${jobId}`);
  return response.data;
}

export async function extractAnnouncement(
  announcementId: string,
): Promise<ExtractionAccepted> {
  const response = await httpClient.post<ExtractionAccepted>(
    `/api/v1/announcements/${announcementId}/extract`,
    {},
  );
  return response.data;
}

export async function matchAnnouncement(
  announcementId: string,
): Promise<MatchAccepted> {
  const response = await httpClient.post<MatchAccepted>(
    `/api/v1/announcements/${announcementId}/match`,
    {},
  );
  return response.data;
}

export async function getAnnouncementMatchResult(
  announcementId: string,
): Promise<AnnouncementMatchResult> {
  const response = await httpClient.get<AnnouncementMatchResult>(
    `/api/v1/announcements/${announcementId}/match-result`,
  );
  return response.data;
}
