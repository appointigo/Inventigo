export type SupplierFormValues = {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  poCount: number;
  createdAt: string;
  updatedAt: string;
};
