import type { SubLot, SubLotInput } from "@/entities/SubLot/subLot";
import { httpClient } from "@/shared/api/httpClient";

export async function createSubLot(
  announcementId: string,
  input: SubLotInput,
): Promise<SubLot> {
  const response = await httpClient.post<SubLot>(
    `/api/v1/announcements/${announcementId}/sub-lots`,
    input,
  );
  return response.data;
}

export async function updateSubLot(
  announcementId: string,
  subLotId: string,
  input: SubLotInput,
): Promise<SubLot> {
  const response = await httpClient.put<SubLot>(
    `/api/v1/announcements/${announcementId}/sub-lots/${subLotId}`,
    input,
  );
  return response.data;
}

export async function deleteSubLot(
  announcementId: string,
  subLotId: string,
): Promise<void> {
  await httpClient.delete<void>(
    `/api/v1/announcements/${announcementId}/sub-lots/${subLotId}`,
  );
}
