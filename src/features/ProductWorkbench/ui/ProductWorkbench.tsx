import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { useCallback, useEffect, useState } from "react";

import {
  createProduct,
  deleteProduct,
  listProducts,
  type Product,
} from "@/entities/Product/product";
import {
  normalizeProductInput,
  type ProductFormValues,
} from "@/features/ProductWorkbench/model/productForm";
import { ProductEditDrawer } from "@/features/ProductWorkbench/ui/ProductEditDrawer";
import { ProductFormFields } from "@/features/ProductWorkbench/ui/ProductFormFields";
import {
  getApiError,
  getApiErrorMessage,
} from "@/shared/api/apiError";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./ProductWorkbench.module.css";

export function ProductWorkbench() {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await listProducts());
    } catch (reason) {
      setError(getApiErrorMessage(reason, "产品列表加载失败，请稍后重试。"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProducts]);

  const openCreateDrawer = () => {
    form.resetFields();
    form.setFieldsValue({ keywords: [] });
    setCreateOpen(true);
  };

  const closeCreateDrawer = () => {
    if (!creating) setCreateOpen(false);
  };

  const handleCreate = async (values: ProductFormValues) => {
    if (creating) return;
    setCreating(true);

    try {
      const created = await createProduct(normalizeProductInput(values));
      setProducts((current) => [...current, created]);
      setCreateOpen(false);
      form.resetFields();
      message.success(`产品“${created.name}”已创建。`);
    } catch (reason) {
      message.error(
        getApiErrorMessage(reason, "产品创建失败，请稍后重试。", {
          INVALID_REQUEST: "请检查产品名称、关键词和简介。",
          PRODUCT_NAME_CONFLICT: "已有同名产品，请使用其他名称。",
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (deletingId) return;
    setDeletingId(product.id);

    try {
      await deleteProduct(product.id);
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      message.success(`产品“${product.name}”已删除。`);
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "产品删除失败，请稍后重试。", {
          PRODUCT_NOT_FOUND: "该产品已不存在，正在刷新列表。",
        }),
      );
      if (apiError.code === "PRODUCT_NOT_FOUND") void loadProducts();
    } finally {
      setDeletingId(null);
    }
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product,
      ),
    );
    setEditingProduct(null);
  };

  const handleProductMissing = useCallback(
    (productId: string) => {
      setEditingProduct(null);
      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      );
      void loadProducts();
    },
    [loadProducts],
  );

  const columns: TableProps<Product>["columns"] = [
    {
      title: "产品名称",
      dataIndex: "name",
      key: "name",
      width: 220,
      render: (name: string, product) => (
        <div className={styles.productName}>
          <span className={styles.productIcon} aria-hidden="true">
            <TagsOutlined />
          </span>
          <span>
            <Typography.Text strong>{name}</Typography.Text>
            <Typography.Text copyable={{ text: product.id }} type="secondary">
              {product.id}
            </Typography.Text>
          </span>
        </div>
      ),
    },
    {
      title: "匹配关键词",
      dataIndex: "keywords",
      key: "keywords",
      width: 260,
      render: (keywords: string[]) =>
        keywords.length ? (
          <Space size={[5, 5]} wrap>
            {keywords.map((keyword) => (
              <Tag color="cyan" key={keyword}>
                {keyword}
              </Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">未设置</Typography.Text>
        ),
    },
    {
      title: "产品简介",
      dataIndex: "description",
      key: "description",
      render: (description: string) => (
        <Typography.Paragraph
          className={styles.description}
          ellipsis={{ rows: 3, tooltip: description }}
        >
          {description}
        </Typography.Paragraph>
      ),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (updatedAt: string) => formatDateTime(updatedAt),
    },
    {
      title: "操作",
      key: "actions",
      width: 190,
      align: "right",
      render: (_, product) => (
        <Space size={2}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => setEditingProduct(product)}
          >
            查看/编辑
          </Button>
          <Popconfirm
            title="删除产品"
            description="删除不会改变已有匹配结果中的产品名称快照。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(product)}
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              loading={deletingId === product.id}
              aria-label={`删除产品${product.name}`}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className={styles.workbench}>
      <div className={styles.heading}>
        <div>
          <div className={styles.titleRow}>
            <Typography.Title level={1}>产品工作台</Typography.Title>
            <Tag color="cyan">{products.length} 个产品</Tag>
          </div>
          <Typography.Paragraph>
            维护企业可供产品、匹配关键词和能力简介，公告匹配会使用这里的全部产品。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
          新增产品
        </Button>
      </div>

      <Card className={styles.tableCard} variant="borderless">
        {error ? (
          <Alert
            className={styles.error}
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void loadProducts()}>
                重试
              </Button>
            }
          />
        ) : null}
        <Table<Product>
          rowKey="id"
          columns={columns}
          dataSource={products}
          loading={loading}
          pagination={false}
          scroll={{ x: 980 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无产品，新增后即可用于公告匹配。"
              />
            ),
          }}
        />
      </Card>

      <Drawer
        destroyOnHidden
        open={createOpen}
        title="新增产品"
        width={560}
        maskClosable={!creating}
        onClose={closeCreateDrawer}
        extra={
          <Space>
            <Button disabled={creating} onClick={closeCreateDrawer}>
              取消
            </Button>
            <Button
              type="primary"
              loading={creating}
              onClick={() => form.submit()}
            >
              创建产品
            </Button>
          </Space>
        }
      >
        <Form<ProductFormValues>
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ keywords: [] }}
          onFinish={(values) => void handleCreate(values)}
        >
          <ProductFormFields />
        </Form>
      </Drawer>

      <ProductEditDrawer
        open={Boolean(editingProduct)}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdated={handleProductUpdated}
        onProductMissing={handleProductMissing}
      />
    </section>
  );
}
