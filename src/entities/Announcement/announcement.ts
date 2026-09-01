import { httpClient } from "@/shared/api/httpClient";
import type { FileItem } from "@/entities/List-files/listFiles";

export type AnnouncementFile = Pick<
  FileItem,
  "fileId" | "originalName" | "sizeBytes"
> & {
  relativePath: string;
};

interface AnnouncementMetadata {
  id: string;
  name: string;
  lastModifiedTime: string;
  lastGeneratedCleanedAnnouncementTime: string | null;
  lastJobId: string | null;
}

export interface AnnouncementInfo {
  id: string;
  tenderers: string[];
  agents: string[];
  deadline: string | null;
  projectCode: string | null;
  qualifications: string[];
  subLotIds: string[];
}

export type AnnouncementInfoInput = Omit<AnnouncementInfo, "id">;

export interface UpdateAnnouncementInput {
  name: string;
  detail: AnnouncementInfoInput;
}

export interface AnnouncementListItem extends AnnouncementMetadata {
  fileCount: number;
}

export interface AnnouncementSearchHit {
  value: string;
  matchedKeywords: string[];
}

export interface AnnouncementSearchResult extends AnnouncementMetadata {
  hits: Record<string, AnnouncementSearchHit>;
}

export type AnnouncementListEntry =
  | AnnouncementListItem
  | AnnouncementSearchResult;

export interface AnnouncementSearchParams {
  keywords: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  page?: number;
  size?: number;
}

export interface AnnouncementSearchResponse {
  results: AnnouncementSearchResult[];
  page: number;
  size: number;
  total: number;
}

export interface AnnouncementDetail extends AnnouncementMetadata {
  files: AnnouncementFile[];
  detail: AnnouncementInfo;
}

export interface AnnouncementListResponse {
  announcements: AnnouncementListItem[];
}

export async function listAnnouncements(): Promise<AnnouncementListResponse> {
  const response = await httpClient.get<AnnouncementListResponse>(
    "/api/v1/announcements",
  );
  return response.data;
}

export async function searchAnnouncements(
  params: AnnouncementSearchParams,
  signal?: AbortSignal,
): Promise<AnnouncementSearchResponse> {
  const response = await httpClient.get<AnnouncementSearchResponse>(
    "/api/v1/announcements/search",
    { params, signal },
  );
  return response.data;
}

export async function getAnnouncementDetail(
  announcementId: string,
): Promise<AnnouncementDetail> {
  const response = await httpClient.get<AnnouncementDetail>(
    `/api/v1/announcements/${announcementId}`,
  );
  return response.data;
}
