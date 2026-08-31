import type {
  AnnouncementDetail,
  UpdateAnnouncementInput,
} from "@/entities/Announcement/announcement";
import { httpClient } from "@/shared/api/httpClient";

export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementDetail> {
  const response = await httpClient.put<AnnouncementDetail>(
    `/api/v1/announcements/${announcementId}`,
    input,
  );
  return response.data;
}
