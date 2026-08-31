import { httpClient } from "@/shared/api/httpClient";

export async function deleteFile(fileId: string): Promise<void> {
  await httpClient.delete<void>(`/api/v1/files/${fileId}`);
}
