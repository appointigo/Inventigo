import type { Role } from "@prisma/client";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  storeId: string | null;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: Role;
  storeId?: string | null;
  isActive?: boolean;
};

export type StoreRecord = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
};

export type CreateStoreInput = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
};

export type UpdateStoreInput = {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
};

export type BillingConfig = {
  taxRate: number;
  invoicePrefix: string;
};

export type AppSettings = {
  billingConfig: BillingConfig;
};
