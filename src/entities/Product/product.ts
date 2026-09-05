import { httpClient } from "@/shared/api/httpClient";

export interface Product {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  keywords: string[];
  description: string;
}

interface ProductListResponse {
  products: Product[];
}

export async function listProducts(): Promise<Product[]> {
  const response = await httpClient.get<Product[] | ProductListResponse>(
    "/api/v1/products",
  );

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.data.products)) {
    return response.data.products;
  }

  throw new Error("产品列表接口返回了无法识别的数据格式");
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const response = await httpClient.post<Product>("/api/v1/products", input);
  return response.data;
}

export async function getProduct(productId: string): Promise<Product> {
  const response = await httpClient.get<Product>(
    `/api/v1/products/${productId}`,
  );
  return response.data;
}

export async function updateProduct(
  productId: string,
  input: ProductInput,
): Promise<Product> {
  const response = await httpClient.put<Product>(
    `/api/v1/products/${productId}`,
    input,
  );
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await httpClient.delete<void>(`/api/v1/products/${productId}`);
}
