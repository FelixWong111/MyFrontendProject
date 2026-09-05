import { httpClient } from "@/shared/api/httpClient";

export interface AnnouncementTreeFileNode {
  name: string;
  type: "file";
  fileId: string;
  originalName: string;
  sizeBytes: number;
}

export interface AnnouncementTreeDirectoryNode {
  name: string;
  type: "directory";
  children: AnnouncementTreeNode[];
}

export type AnnouncementTreeNode =
  | AnnouncementTreeFileNode
  | AnnouncementTreeDirectoryNode;

export interface AnnouncementTree {
  announcementId: string;
  root: AnnouncementTreeDirectoryNode;
}

export async function getAnnouncementTree(
  announcementId: string,
  signal?: AbortSignal,
): Promise<AnnouncementTree> {
  const response = await httpClient.get<AnnouncementTree>(
    `/api/v1/announcements/${announcementId}/tree`,
    { signal },
  );
  return response.data;
}
