import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Skeleton,
  Space,
} from "antd";
import { useEffect, useState } from "react";

import {
  getProduct,
  updateProduct,
  type Product,
} from "@/entities/Product/product";
import {
  normalizeProductInput,
  productToFormValues,
  type ProductFormValues,
} from "@/features/ProductWorkbench/model/productForm";
import { ProductFormFields } from "@/features/ProductWorkbench/ui/ProductFormFields";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { formatDateTime } from "@/shared/lib/format";

interface ProductEditDrawerProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdated: (product: Product) => void;
  onProductMissing: (productId: string) => void;
}

export function ProductEditDrawer({
  open,
  product,
  onClose,
  onUpdated,
  onProductMissing,
}: ProductEditDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const [latestProduct, setLatestProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const visibleProduct =
    latestProduct?.id === product?.id ? latestProduct : null;

  useEffect(() => {
    if (!open || !product) {
      return;
    }

    let disposed = false;

    const loadProduct = async () => {
      setLoading(true);
      setLoadError("");
      setLatestProduct(null);

      try {
        const freshProduct = await getProduct(product.id);
        if (!disposed) {
          setLatestProduct(freshProduct);
        }
      } catch (reason) {
        if (disposed) return;

        const apiError = getApiError(reason);
        if (apiError.code === "PRODUCT_NOT_FOUND") {
          message.error("该产品已不存在，正在刷新产品列表。");
          onProductMissing(product.id);
          return;
        }

        setLoadError(
          getApiErrorMessage(reason, "产品详情加载失败，请稍后重试。"),
        );
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadProduct();

    return () => {
      disposed = true;
    };
  }, [message, onProductMissing, open, product, reloadKey]);

  const closeDrawer = () => {
    if (!saving) onClose();
  };

  const handleSave = async (values: ProductFormValues) => {
    if (!product || !visibleProduct || saving) return;
    setSaving(true);

    try {
      const updatedProduct = await updateProduct(
        visibleProduct.id,
        normalizeProductInput(values),
      );
      setLatestProduct(updatedProduct);
      onUpdated(updatedProduct);
      message.success(`产品“${updatedProduct.name}”已更新。`);
      onClose();
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "产品更新失败，请稍后重试。", {
          INVALID_REQUEST: "请检查产品名称、关键词和简介。",
          PRODUCT_NAME_CONFLICT: "已有同名产品，请使用其他名称。",
          PRODUCT_NOT_FOUND: "该产品已不存在，正在刷新产品列表。",
        }),
      );

      if (apiError.code === "PRODUCT_NOT_FOUND") {
        onProductMissing(visibleProduct.id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      destroyOnHidden
      open={open}
      title="查看/编辑产品"
      width={560}
      maskClosable={!saving}
      onClose={closeDrawer}
      extra={
        <Space>
          <Button disabled={saving} onClick={closeDrawer}>
            取消
          </Button>
          <Button
            type="primary"
            disabled={!visibleProduct || Boolean(loadError)}
            loading={saving}
            onClick={() => form.submit()}
          >
            保存修改
          </Button>
        </Space>
      }
    >
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={
            <Button size="small" onClick={() => setReloadKey((value) => value + 1)}>
              重试
            </Button>
          }
        />
      ) : null}

      <Skeleton active loading={loading} paragraph={{ rows: 8 }}>
        {visibleProduct ? (
          <>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                { key: "id", label: "产品 ID", children: visibleProduct.id },
                {
                  key: "createdAt",
                  label: "创建时间",
                  children: formatDateTime(visibleProduct.createdAt),
                },
                {
                  key: "updatedAt",
                  label: "更新时间",
                  children: formatDateTime(visibleProduct.updatedAt),
                },
              ]}
            />
            <Form<ProductFormValues>
              key={visibleProduct.id}
              form={form}
              initialValues={productToFormValues(visibleProduct)}
              layout="vertical"
              requiredMark="optional"
              onFinish={(values) => void handleSave(values)}
              style={{ marginTop: 24 }}
            >
              <ProductFormFields />
            </Form>
          </>
        ) : null}
      </Skeleton>
    </Drawer>
  );
}
