import { NextResponse } from "next/server";
import { productService } from "@/modules/products/services/productService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import type { AttributeField } from "@/modules/categories/types";

const KNOWN_FILTER_KEYS = new Set([
  "search",
  "categoryId",
  "category",
  "brandId",
  "brand",
  "sizeId",
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
    if (!value || value === "undefined" || value === "null") return;

    if (filters[key]) {
      const existing = filters[key];
      filters[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      filters[key] = value;
    }
  });

  return filters;
};

const getOptionalParam = (searchParams: URLSearchParams, key: string) => {
  const value = searchParams.get(key)?.trim();
  if (!value || value === "undefined" || value === "null") return undefined;
  return value;
};

const getPositiveIntegerParam = (searchParams: URLSearchParams, key: string) => {
  const value = getOptionalParam(searchParams, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
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
    const pageParam = getPositiveIntegerParam(searchParams, "page");
    const pageSizeParam =
      getPositiveIntegerParam(searchParams, "pageSize") ??
      getPositiveIntegerParam(searchParams, "limit");

    const categoryId =
      getOptionalParam(searchParams, "categoryId") ?? getOptionalParam(searchParams, "category");
    const brandId =
      getOptionalParam(searchParams, "brandId") ?? getOptionalParam(searchParams, "brand");
    const isActiveParam = getOptionalParam(searchParams, "isActive");
    const filters = {
      storeId: getOptionalParam(searchParams, "storeId") ?? user.storeId ?? undefined,
      categoryId,
      brandId,
      sizeId: getOptionalParam(searchParams, "sizeId"),
      search: getOptionalParam(searchParams, "search"),
      isActive: isActiveParam ? isActiveParam === "true" : undefined,
      ...(pageParam !== undefined ? { page: pageParam } : {}),
      ...(pageSizeParam !== undefined ? { pageSize: pageSizeParam } : {}),
    };

    const attributeFilters = buildAttributeFilters(searchParams);
    let categoryAttributeSchema = null;
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, orgId: user.orgId },
        select: { attributeSchema: true },
      });
      categoryAttributeSchema = (category?.attributeSchema as { fields: AttributeField[] }) ?? {
        fields: [],
      };
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.sku || !body.categoryId || !body.brandId) {
      return NextResponse.json(
        { error: "name, sku, categoryId, and brandId are required" },
        { status: 400 }
      );
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
};
