import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Space,
  Typography,
} from "antd";
import { useState } from "react";

import {
  getAnnouncementDetail,
  type AnnouncementDetail,
} from "@/entities/Announcement/announcement";
import { createAnnouncement } from "@/features/Create-Announcement/api/createAnnouncement";
import { updateAnnouncement } from "@/features/Edit-Announcement/api/updateAnnouncement";
import {
  announcementValuesToInput,
  type AnnouncementFormValues,
} from "@/features/Edit-Announcement/model/announcementForm";
import { AnnouncementFormFields } from "@/features/Edit-Announcement/ui/AnnouncementFormFields";
import { createSubLot } from "@/features/Manage-SubLots/api/subLotMutations";
import {
  subLotValuesToInput,
  type SubLotFormValues,
} from "@/features/Manage-SubLots/model/subLotForm";
import { SubLotFormFields } from "@/features/Manage-SubLots/ui/SubLotFormFields";
import { getApiErrorMessage } from "@/shared/api/apiError";

import styles from "./CreateAnnouncement.module.css";

interface CreateAnnouncementValues extends AnnouncementFormValues {
  subLots?: SubLotFormValues[];
}

interface CreateAnnouncementProps {
  onCreated: (announcement: AnnouncementDetail) => void;
}

const INITIAL_VALUES: Partial<CreateAnnouncementValues> = {
  tenderers: [],
  agents: [],
  qualifications: [],
  subLots: [],
};

export function CreateAnnouncement({ onCreated }: CreateAnnouncementProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateAnnouncementValues>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");

  const closeDrawer = () => {
    if (!submitting) {
      setOpen(false);
      setProgressText("");
      form.resetFields();
    }
  };

  const handleFinish = async (values: CreateAnnouncementValues) => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setProgressText("正在创建公告...");
    let createdAnnouncement: AnnouncementDetail | null = null;

    try {
      createdAnnouncement = await createAnnouncement(values.name.trim());

      setProgressText("正在保存公告详情...");
      createdAnnouncement = await updateAnnouncement(
        createdAnnouncement.id,
        announcementValuesToInput(values, []),
      );

      const subLots = values.subLots ?? [];
      for (let index = 0; index < subLots.length; index += 1) {
        setProgressText(
          `正在创建子标包 ${index + 1} / ${subLots.length}...`,
        );
        await createSubLot(
          createdAnnouncement.id,
          subLotValuesToInput(subLots[index]),
        );
      }

      const latestAnnouncement = await getAnnouncementDetail(
        createdAnnouncement.id,
      );
      onCreated(latestAnnouncement);
      message.success(`公告“${latestAnnouncement.name}”及其子标包已创建。`);
      setOpen(false);
      form.resetFields();
    } catch (reason) {
      if (createdAnnouncement) {
        let latestAnnouncement = createdAnnouncement;
        try {
          latestAnnouncement = await getAnnouncementDetail(
            createdAnnouncement.id,
          );
        } catch {
          // 创建结果仍可用，详情刷新失败时保留最后一个成功响应。
        }
        onCreated(latestAnnouncement);
        message.warning(
          "公告已创建，但后续详情或子标包未全部完成。已打开该公告，可在工作台继续补充。",
        );
        setOpen(false);
        form.resetFields();
      } else {
        message.error(
          getApiErrorMessage(reason, "公告创建失败，请稍后重试。", {
            INVALID_REQUEST: "请检查公告和子标包字段后重试。",
          }),
        );
      }
    } finally {
      setSubmitting(false);
      setProgressText("");
    }
  };

  return (
    <>
      <Button
        block
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
      >
        新建公告
      </Button>
      <Drawer
        destroyOnHidden
        open={open}
        title="新建公告与子标包"
        width={780}
        maskClosable={!submitting}
        onClose={closeDrawer}
        extra={
          <Space>
            <Button disabled={submitting} onClick={closeDrawer}>
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              创建公告
            </Button>
          </Space>
        }
      >
        <Form<CreateAnnouncementValues>
          form={form}
          initialValues={INITIAL_VALUES}
          layout="vertical"
          requiredMark="optional"
          onFinish={(values) => void handleFinish(values)}
        >
          <Typography.Title level={4}>公告基本信息</Typography.Title>
          <AnnouncementFormFields />

          <div className={styles.sectionHeading}>
            <div>
              <Typography.Title level={4}>子标包</Typography.Title>
              <Typography.Text type="secondary">
                可暂不添加；创建成功后仍可在公告工作台中继续维护。
              </Typography.Text>
            </div>
          </div>

          <Form.List name="subLots">
            {(fields, { add, remove, move }) => (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {fields.map((field, index) => (
                  <Card
                    className={styles.subLotDraft}
                    key={field.key}
                    size="small"
                    title={`子标包 ${index + 1}`}
                    extra={
                      <Space size={4}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          aria-label="上移子标包"
                          disabled={index === 0 || submitting}
                          onClick={() => move(index, index - 1)}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          aria-label="下移子标包"
                          disabled={index === fields.length - 1 || submitting}
                          onClick={() => move(index, index + 1)}
                        />
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label="删除子标包草稿"
                          disabled={submitting}
                          onClick={() => remove(field.name)}
                        />
                      </Space>
                    }
                  >
                    <SubLotFormFields prefix={["subLots", field.name]} />
                  </Card>
                ))}
                <Button
                  block
                  type="dashed"
                  icon={<PlusOutlined />}
                  disabled={submitting}
                  onClick={() => add({ qualifications: [] })}
                >
                  添加子标包
                </Button>
              </Space>
            )}
          </Form.List>

          {progressText ? (
            <Typography.Text className={styles.progress} type="secondary">
              {progressText}
            </Typography.Text>
          ) : null}
        </Form>
      </Drawer>
    </>
  );
}
