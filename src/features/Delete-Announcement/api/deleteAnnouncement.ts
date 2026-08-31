import { httpClient } from "@/shared/api/httpClient";

export async function deleteAnnouncement(
  announcementId: string,
): Promise<void> {
  await httpClient.delete<void>(`/api/v1/announcements/${announcementId}`);
}
