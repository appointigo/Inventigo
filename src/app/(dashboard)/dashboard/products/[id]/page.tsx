"use client";

import { useRouter, useParams } from "next/navigation";
import { Spin } from "antd";
import ProductDetail from "@/modules/products/components/ProductDetail";
import { useProduct } from "@/modules/products/hooks/useProducts";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { product, loading } = useProduct(params.id);

  if (loading || !product) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <ProductDetail
        product={product}
        onEdit={() => router.push(`/dashboard/products/${params.id}/edit`)}
        onBack={() => router.push("/dashboard/products")}
      />
    </div>
  );
}
