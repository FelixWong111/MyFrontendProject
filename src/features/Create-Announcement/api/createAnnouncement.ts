import { httpClient } from "@/shared/api/httpClient";
import type { AnnouncementDetail } from "@/entities/Announcement/announcement";

export type Announcement = AnnouncementDetail;

export async function createAnnouncement(
  name: string,
): Promise<AnnouncementDetail> {
  const response = await httpClient.post<AnnouncementDetail>(
    "/api/v1/announcements",
    { name },
  );
  return response.data;
}
