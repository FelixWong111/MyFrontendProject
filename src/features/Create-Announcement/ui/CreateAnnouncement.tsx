import { App, Button, Form, Input } from "antd";
import { useState } from "react";

import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import { createAnnouncement } from "@/features/Create-Announcement/api/createAnnouncement";
import { getApiErrorMessage } from "@/shared/api/apiError";

interface CreateAnnouncementValues {
  name: string;
}

interface CreateAnnouncementProps {
  onCreated: (announcement: AnnouncementDetail) => void;
}

export function CreateAnnouncement({ onCreated }: CreateAnnouncementProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateAnnouncementValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async ({ name }: CreateAnnouncementValues) => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const announcement = await createAnnouncement(name);
      form.resetFields();
      message.success(`公告“${announcement.name}”创建成功。`);
      onCreated(announcement);
    } catch (reason) {
      message.error(
        getApiErrorMessage(reason, "公告创建失败，请稍后重试。", {
          INVALID_REQUEST: "公告名称不能为空。",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form<CreateAnnouncementValues>
      form={form}
      layout="inline"
      onFinish={(values) => void handleFinish(values)}
    >
      <Form.Item
        name="name"
        rules={[{ required: true, whitespace: true, message: "请输入公告名称" }]}
      >
        <Input
          aria-label="公告名称"
          disabled={submitting}
          placeholder="输入公告名称"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          新建公告
        </Button>
      </Form.Item>
    </Form>
  );
}
