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

export interface AnnouncementListItem extends AnnouncementMetadata {
  fileCount: number;
}

export interface AnnouncementDetail extends AnnouncementMetadata {
  files: AnnouncementFile[];
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

export async function getAnnouncementDetail(
  announcementId: string,
): Promise<AnnouncementDetail> {
  const response = await httpClient.get<AnnouncementDetail>(
    `/api/v1/announcements/${announcementId}`,
  );
  return response.data;
}
