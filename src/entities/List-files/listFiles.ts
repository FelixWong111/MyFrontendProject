import { httpClient } from "@/shared/api/httpClient";

export interface FileListResponse {
  files: FileItem[];
  page: number;
  size: number;
  total: number;
}

export type ListBack = FileListResponse;

export interface FileItem {
  fileId: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  attachmentCount: number;
}

export async function listFiles(
  page: number,
  size: number,
): Promise<FileListResponse> {
  const response = await httpClient.get<FileListResponse>("/api/v1/files", {
    params: {
      page,
      size,
    },
  });

  return response.data;
}
