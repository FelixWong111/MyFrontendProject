import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import { httpClient } from "@/shared/api/httpClient";

export interface AttachFileRequest {
  fileId: string;
  relativePath: string;
}

export async function attachFile(
  announcementId: string,
  request: AttachFileRequest,
): Promise<AnnouncementDetail> {
  const response = await httpClient.post<AnnouncementDetail>(
    `/api/v1/announcements/${announcementId}/files`,
    request,
  );
  return response.data;
}
