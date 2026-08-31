import { App, Button, Drawer, Form, Space } from "antd";
import { useEffect, useState } from "react";

import type { SubLot } from "@/entities/SubLot/subLot";
import {
  createSubLot,
  updateSubLot,
} from "@/features/Manage-SubLots/api/subLotMutations";
import {
  subLotToFormValues,
  subLotValuesToInput,
  type SubLotFormValues,
} from "@/features/Manage-SubLots/model/subLotForm";
import { SubLotFormFields } from "@/features/Manage-SubLots/ui/SubLotFormFields";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

interface SubLotFormDrawerProps {
  announcementId: string;
  open: boolean;
  subLot: SubLot | null;
  onClose: () => void;
  onSaved: (subLot: SubLot, created: boolean) => void;
  onStateMayHaveChanged: () => void;
}

export function SubLotFormDrawer({
  announcementId,
  open,
  subLot,
  onClose,
  onSaved,
  onStateMayHaveChanged,
}: SubLotFormDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<SubLotFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.resetFields();
    form.setFieldsValue(
      subLot
        ? subLotToFormValues(subLot)
        : { name: "", qualifications: [] },
    );
  }, [form, open, subLot]);

  const handleFinish = async (values: SubLotFormValues) => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const input = subLotValuesToInput(values);
      const saved = subLot
        ? await updateSubLot(announcementId, subLot.id, input)
        : await createSubLot(announcementId, input);
      onSaved(saved, !subLot);
      message.success(subLot ? "子标包已更新。" : "子标包已创建。");
      onClose();
      form.resetFields();
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "子标包保存失败，请稍后重试。", {
          INVALID_REQUEST: "请检查名称、金额和资格要求后重试。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
          SUB_LOT_NOT_FOUND: "这个子标包已不存在，正在刷新列表。",
        }),
      );

      if (
        error.code === "ANNOUNCEMENT_NOT_FOUND" ||
        error.code === "SUB_LOT_NOT_FOUND"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      destroyOnHidden
      open={open}
      title={subLot ? "编辑子标包" : "新建子标包"}
      width={720}
      maskClosable={!submitting}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      extra={
        <Space>
          <Button disabled={submitting} onClick={onClose}>
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
      <Form<SubLotFormValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={(values) => void handleFinish(values)}
      >
        <SubLotFormFields />
      </Form>
    </Drawer>
  );
}
