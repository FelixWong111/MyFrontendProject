import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";

import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import type { SubLot } from "@/entities/SubLot/subLot";
import { updateAnnouncement } from "@/features/Edit-Announcement/api/updateAnnouncement";
import { deleteSubLot } from "@/features/Manage-SubLots/api/subLotMutations";
import { useAnnouncementSubLots } from "@/features/Manage-SubLots/model/useAnnouncementSubLots";
import { SubLotFormDrawer } from "@/features/Manage-SubLots/ui/SubLotFormDrawer";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { formatCurrencyFromCents } from "@/shared/lib/format";

import styles from "./SubLotManager.module.css";

interface SubLotManagerProps {
  announcement: AnnouncementDetail;
  onAnnouncementUpdated: (announcement: AnnouncementDetail) => void;
  onStateMayHaveChanged: () => void;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function SubLotManager({
  announcement,
  onAnnouncementUpdated,
  onStateMayHaveChanged,
}: SubLotManagerProps) {
  const { message } = App.useApp();
  const { subLots, loading, error, refresh, applySubLot, removeSubLot } =
    useAnnouncementSubLots(announcement.id);
  const [draftOrderIds, setDraftOrderIds] = useState<string[] | null>(null);
  const [editingSubLot, setEditingSubLot] = useState<SubLot | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const canonicalOrder = useMemo(
    () => subLots.map((item) => item.id).join("|"),
    [subLots],
  );
  const orderedSubLots = useMemo(() => {
    if (!draftOrderIds) {
      return subLots;
    }

    const subLotsById = new Map(subLots.map((item) => [item.id, item]));
    if (
      draftOrderIds.length !== subLots.length ||
      draftOrderIds.some((id) => !subLotsById.has(id))
    ) {
      return subLots;
    }

    return draftOrderIds.map((id) => subLotsById.get(id) as SubLot);
  }, [draftOrderIds, subLots]);
  const currentOrder = orderedSubLots.map((item) => item.id).join("|");
  const orderChanged = draftOrderIds !== null && canonicalOrder !== currentOrder;

  const openCreator = () => {
    setEditingSubLot(null);
    setEditorOpen(true);
  };

  const openEditor = (subLot: SubLot) => {
    setEditingSubLot(subLot);
    setEditorOpen(true);
  };

  const handleSaved = (subLot: SubLot, created: boolean) => {
    setDraftOrderIds(null);
    applySubLot(subLot);
    if (created) {
      onStateMayHaveChanged();
      refresh();
    }
  };

  const handleDelete = async (subLot: SubLot) => {
    if (deletingId) {
      return;
    }

    setDeletingId(subLot.id);
    try {
      await deleteSubLot(announcement.id, subLot.id);
      setDraftOrderIds(null);
      removeSubLot(subLot.id);
      onStateMayHaveChanged();
      refresh();
      message.success(`子标包“${subLot.name}”已删除。`);
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "子标包删除失败，请稍后重试。", {
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
          SUB_LOT_NOT_FOUND: "这个子标包已不存在，正在刷新列表。",
        }),
      );
      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "SUB_LOT_NOT_FOUND"
      ) {
        refresh();
        onStateMayHaveChanged();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedSubLots.length) {
      return;
    }
    setDraftOrderIds(
      moveItem(orderedSubLots, fromIndex, toIndex).map((item) => item.id),
    );
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const fromIndex = orderedSubLots.findIndex((item) => item.id === draggedId);
    const toIndex = orderedSubLots.findIndex((item) => item.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      setDraftOrderIds(
        moveItem(orderedSubLots, fromIndex, toIndex).map((item) => item.id),
      );
    }
    setDraggedId(null);
  };

  const saveOrder = async () => {
    if (!orderChanged || savingOrder) {
      return;
    }

    setSavingOrder(true);
    try {
      const detail = announcement.detail;
      const updated = await updateAnnouncement(announcement.id, {
        name: announcement.name,
        detail: {
          tenderers: detail.tenderers,
          agents: detail.agents,
          deadline: detail.deadline,
          projectCode: detail.projectCode,
          qualifications: detail.qualifications,
          subLotIds: orderedSubLots.map((item) => item.id),
        },
      });
      setDraftOrderIds(null);
      onAnnouncementUpdated(updated);
      refresh();
      message.success("子标包顺序已保存。");
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "子标包排序保存失败，请稍后重试。", {
          INVALID_REQUEST: "当前排序数据无效，请刷新后重试。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
          SUB_LOT_IDS_MISMATCH:
            "子标包已发生变化，已刷新数据，请重新排序。",
        }),
      );
      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "SUB_LOT_IDS_MISMATCH"
      ) {
        setDraftOrderIds(null);
        refresh();
        onStateMayHaveChanged();
      }
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className={styles.manager}>
      <div className={styles.heading}>
        <div>
          <Typography.Title level={3}>子标包</Typography.Title>
          <Typography.Text type="secondary">
            共 {orderedSubLots.length} 个；拖动手柄或使用箭头调整展示顺序。
          </Typography.Text>
        </div>
        <Space wrap>
          {orderChanged ? (
            <Button onClick={() => setDraftOrderIds(null)}>撤销排序</Button>
          ) : null}
          <Button
            icon={<SaveOutlined />}
            disabled={!orderChanged}
            loading={savingOrder}
            onClick={() => void saveOrder()}
          >
            保存排序
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={orderChanged || savingOrder}
            onClick={openCreator}
          >
            新建子标包
          </Button>
        </Space>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={refresh}>
              重试
            </Button>
          }
        />
      ) : null}

      <Spin spinning={loading} tip="正在读取子标包...">
        {orderedSubLots.length ? (
          <div className={styles.list}>
            {orderedSubLots.map((subLot, index) => (
              <Card
                className={`${styles.subLotCard} ${
                  draggedId === subLot.id ? styles.dragging : ""
                }`}
                key={subLot.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(subLot.id)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.titleGroup}>
                    <span
                      className={styles.dragHandle}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`拖动${subLot.name}`}
                      onDragStart={() => setDraggedId(subLot.id)}
                      onDragEnd={() => setDraggedId(null)}
                    >
                      <HolderOutlined />
                    </span>
                    <div>
                      <Typography.Text className={styles.indexLabel}>
                        标包 {String(index + 1).padStart(2, "0")}
                      </Typography.Text>
                      <Typography.Title level={4}>{subLot.name}</Typography.Title>
                    </div>
                  </div>
                  <Space size={4} wrap>
                    <Button
                      type="text"
                      icon={<ArrowUpOutlined />}
                      aria-label="上移"
                      disabled={index === 0}
                      onClick={() => handleMove(index, index - 1)}
                    />
                    <Button
                      type="text"
                      icon={<ArrowDownOutlined />}
                      aria-label="下移"
                      disabled={index === orderedSubLots.length - 1}
                      onClick={() => handleMove(index, index + 1)}
                    />
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      disabled={orderChanged || savingOrder}
                      onClick={() => openEditor(subLot)}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除子标包"
                      description="删除后会同步从公告的子标包顺序中移除。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(subLot)}
                    >
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        disabled={orderChanged || savingOrder}
                        loading={deletingId === subLot.id}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>

                <div className={styles.amountGrid}>
                  <AmountItem
                    label="预估金额"
                    value={subLot.estimatedAmount}
                    note={subLot.estimatedAmountNote}
                  />
                  <AmountItem
                    label="最高限价"
                    value={subLot.maxPrice}
                    note={subLot.maxPriceNote}
                  />
                  <AmountItem
                    label="保证金"
                    value={subLot.deposit}
                    note={subLot.depositNote}
                  />
                </div>

                <div className={styles.qualifications}>
                  <Typography.Text type="secondary">专用资格</Typography.Text>
                  <div className={styles.tags}>
                    {subLot.qualifications.length ? (
                      subLot.qualifications.map((qualification) => (
                        <Tag key={qualification}>{qualification}</Tag>
                      ))
                    ) : (
                      <Typography.Text type="secondary">未填写</Typography.Text>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前公告尚未创建子标包"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreator}>
              创建第一个子标包
            </Button>
          </Empty>
        )}
      </Spin>

      <SubLotFormDrawer
        announcementId={announcement.id}
        open={editorOpen}
        subLot={editingSubLot}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
        onStateMayHaveChanged={() => {
          refresh();
          onStateMayHaveChanged();
        }}
      />
    </div>
  );
}

interface AmountItemProps {
  label: string;
  value: number | null;
  note: string | null;
}

function AmountItem({ label, value, note }: AmountItemProps) {
  return (
    <div className={styles.amountItem}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <strong>{formatCurrencyFromCents(value)}</strong>
      <small>{note ?? "暂无补充说明"}</small>
    </div>
  );
}
