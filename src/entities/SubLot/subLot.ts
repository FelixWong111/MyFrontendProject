import { httpClient } from "@/shared/api/httpClient";

export interface SubLot {
  id: string;
  announcementId: string;
  name: string;
  estimatedAmount: number | null;
  estimatedAmountNote: string | null;
  maxPrice: number | null;
  maxPriceNote: string | null;
  deposit: number | null;
  depositNote: string | null;
  qualifications: string[];
}

export type SubLotInput = Omit<SubLot, "id" | "announcementId">;

interface SubLotListResponse {
  subLots: SubLot[];
}

export async function listSubLots(announcementId: string): Promise<SubLot[]> {
  const response = await httpClient.get<SubLotListResponse>(
    `/api/v1/announcements/${announcementId}/sub-lots`,
  );
  return response.data.subLots;
}
