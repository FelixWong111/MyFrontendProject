import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  AnnouncementDetail,
  UpdateAnnouncementInput,
} from "@/entities/Announcement/announcement";

export interface AnnouncementFormValues {
  name: string;
  tenderers?: string[];
  agents?: string[];
  deadline?: Dayjs | null;
  projectCode?: string | null;
  qualifications?: string[];
}

function cleanStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function announcementValuesToInput(
  values: AnnouncementFormValues,
  subLotIds: string[],
): UpdateAnnouncementInput {
  const projectCode = values.projectCode?.trim();

  return {
    name: values.name.trim(),
    detail: {
      tenderers: cleanStringList(values.tenderers),
      agents: cleanStringList(values.agents),
      deadline: values.deadline?.format("YYYY-MM-DD") ?? null,
      projectCode: projectCode || null,
      qualifications: cleanStringList(values.qualifications),
      subLotIds,
    },
  };
}

export function announcementToFormValues(
  announcement: AnnouncementDetail,
): AnnouncementFormValues {
  return {
    name: announcement.name,
    tenderers: announcement.detail.tenderers,
    agents: announcement.detail.agents,
    deadline: announcement.detail.deadline
      ? dayjs(announcement.detail.deadline, "YYYY-MM-DD")
      : null,
    projectCode: announcement.detail.projectCode,
    qualifications: announcement.detail.qualifications,
  };
}
