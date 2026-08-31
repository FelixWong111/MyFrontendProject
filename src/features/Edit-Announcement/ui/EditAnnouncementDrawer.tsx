import { EditOutlined } from "@ant-design/icons";
import { App, Button, Drawer, Form, Space } from "antd";
import { useState } from "react";

import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import { updateAnnouncement } from "@/features/Edit-Announcement/api/updateAnnouncement";
import {
  announcementToFormValues,
  announcementValuesToInput,
  type AnnouncementFormValues,
} from "@/features/Edit-Announcement/model/announcementForm";
import { AnnouncementFormFields } from "@/features/Edit-Announcement/ui/AnnouncementFormFields";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

interface EditAnnouncementDrawerProps {
  announcement: AnnouncementDetail;
  onUpdated: (announcement: AnnouncementDetail) => void;
  onStateMayHaveChanged: () => void;
}

export function EditAnnouncementDrawer({
  announcement,
  onUpdated,
  onStateMayHaveChanged,
}: EditAnnouncementDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AnnouncementFormValues>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showDrawer = () => {
    form.setFieldsValue(announcementToFormValues(announcement));
    setOpen(true);
  };

  const handleFinish = async (values: AnnouncementFormValues) => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateAnnouncement(
        announcement.id,
        announcementValuesToInput(values, announcement.detail.subLotIds),
      );
      onUpdated(updated);
      setOpen(false);
      message.success("公告详情已更新。");
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "公告详情更新失败，请稍后重试。", {
          INVALID_REQUEST: "请检查公告名称、日期和列表字段后重试。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
          DETAIL_NOT_FOUND: "这个存量公告缺少详情数据，请联系后端迁移。",
          SUB_LOT_IDS_MISMATCH:
            "子标包已发生变化，已刷新服务端数据，请确认后重新保存。",
        }),
      );

      if (
        error.code === "ANNOUNCEMENT_NOT_FOUND" ||
        error.code === "DETAIL_NOT_FOUND" ||
        error.code === "SUB_LOT_IDS_MISMATCH"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button type="primary" icon={<EditOutlined />} onClick={showDrawer}>
        编辑公告
      </Button>
      <Drawer
        destroyOnHidden
        open={open}
        title="编辑公告详情"
        width={720}
        maskClosable={!submitting}
        onClose={() => {
          if (!submitting) {
            setOpen(false);
          }
        }}
        extra={
          <Space>
            <Button disabled={submitting} onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              保存
            </Button>
          </Space>
        }
      >
        <Form<AnnouncementFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={(values) => void handleFinish(values)}
        >
          <AnnouncementFormFields />
        </Form>
      </Drawer>
    </>
  );
}
