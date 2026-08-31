import { httpClient } from "@/shared/api/httpClient";
import type { FileItem } from "@/entities/List-files/listFiles";

export type UploadedFile = Omit<FileItem, "attachmentCount">;
export type FileBack = UploadedFile;

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await httpClient.post<UploadedFile>(
    "/api/v1/files",
    formData,
  );

  return response.data;
}
