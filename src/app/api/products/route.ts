import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";

const KNOWN_FILTER_KEYS = new Set([
  "search",
  "categoryId",
  "category",
  "brandId",
  "brand",
  "page",
  "pageSize",
  "limit",
  "storeId",
  "isActive",
]);

const buildAttributeFilters = (searchParams: URLSearchParams) => {
  const filters: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (KNOWN_FILTER_KEYS.has(key)) return;

    if (filters[key]) {
      const existing = filters[key];
      filters[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      filters[key] = value;
    }
  });

  return filters;
};

export const GET = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.has("page") ? Number(searchParams.get("page")) : undefined;
    const pageSizeParam = searchParams.has("pageSize")
      ? Number(searchParams.get("pageSize"))
      : searchParams.has("limit")
      ? Number(searchParams.get("limit"))
      : undefined;

    const categoryId = searchParams.get("categoryId") || searchParams.get("category") || undefined;
    const brandId = searchParams.get("brandId") || searchParams.get("brand") || undefined;
    const filters = {
      storeId: searchParams.get("storeId") || undefined,
      categoryId,
      brandId,
      sizeId: searchParams.get("sizeId") || undefined,
      search: searchParams.get("search") || undefined,
      isActive: searchParams.has("isActive") ? searchParams.get("isActive") === "true" : undefined,
      ...(pageParam !== undefined ? { page: pageParam } : {}),
      ...(pageSizeParam !== undefined ? { pageSize: pageSizeParam } : {}),
    };

    const attributeFilters = buildAttributeFilters(searchParams);
    const hasPagination = Number.isFinite(pageParam) || Number.isFinite(pageSizeParam) || searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("limit");

    let categoryAttributeSchema = null;
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { attributeSchema: true },
      });
      categoryAttributeSchema = (category?.attributeSchema as { fields: Array<{ name: string; type: string; options?: string[]; required: boolean }> }) ?? { fields: [] };
    }

    const result = await productService.listPaginatedWithAttributes(user.orgId, {
      ...filters,
      attributeFilters: Object.keys(attributeFilters).length ? attributeFilters : undefined,
      categoryAttributeSchema: categoryAttributeSchema ?? undefined,
    });

    return NextResponse.json({
      ...result,
      categoryAttributeSchema,
    });
  } catch (err) {
    console.error("[products GET]", err);
    return NextResponse.json({ error: "Internal server error found" }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const body = await request.json();
    if (!body.name || !body.sku || !body.categoryId || !body.brandId) {
      return NextResponse.json({ error: "name, sku, categoryId, and brandId are required" }, { status: 400 });
    }
    if (typeof body.mrp !== "number" || body.mrp <= 0) {
      return NextResponse.json({ error: "mrp must be a positive number" }, { status: 400 });
    }
    if (typeof body.basePrice !== "number" || body.basePrice <= 0) {
      return NextResponse.json({ error: "basePrice must be a positive number" }, { status: 400 });
    }
    if (typeof body.costPrice !== "number" || body.costPrice <= 0) {
      return NextResponse.json({ error: "costPrice must be a positive number" }, { status: 400 });
    }
    const product = await productService.create(user.orgId, body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[products POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
