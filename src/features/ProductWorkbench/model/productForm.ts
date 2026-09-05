import type {
  Product,
  ProductInput,
} from "@/entities/Product/product";

export interface ProductFormValues {
  name: string;
  keywords?: string[];
  description: string;
}

export function normalizeProductInput(
  values: ProductFormValues,
): ProductInput {
  const keywords = [
    ...new Set(
      (values.keywords ?? [])
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ];

  return {
    name: values.name.trim(),
    keywords,
    description: values.description.trim(),
  };
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    keywords: product.keywords,
    description: product.description,
  };
}
