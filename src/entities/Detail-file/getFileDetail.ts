import { httpClient } from "@/shared/api/httpClient";
import type { FileItem } from "@/entities/List-files/listFiles";

export interface Attachment {
  announcementId: string;
  announcementName: string;
  relativePath: string;
}

export interface FileDetail extends FileItem {
  attachments: Attachment[];
}

export async function getFileDetail(fileId: string): Promise<FileDetail> {
  const response = await httpClient.get<FileDetail>(
    `/api/v1/files/${fileId}`,
  );

  return response.data;
}
