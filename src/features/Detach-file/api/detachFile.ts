import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import { httpClient } from "@/shared/api/httpClient";

export async function detachFile(
  announcementId: string,
  fileId: string,
): Promise<AnnouncementDetail> {
  const response = await httpClient.delete<AnnouncementDetail>(
    `/api/v1/announcements/${announcementId}/files/${fileId}`,
  );
  return response.data;
}
