import type { Supplier, SupplierFormValues } from "../types";

// TODO: Replace with Prisma queries when DB is connected

let suppliers: Supplier[] = [
  {
    id: "sup-1", name: "FashionHub Wholesale", contactPerson: "Rajesh Kumar",
    email: "rajesh@fashionhub.in", phone: "+91 98765 43210", address: "123 Textile Market, Surat, Gujarat",
    isActive: true, poCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "sup-2", name: "ActiveWear Distributors", contactPerson: "Priya Sharma",
    email: "priya@activewear.co.in", phone: "+91 87654 32109", address: "45 Sports Complex Road, Mumbai, Maharashtra",
    isActive: true, poCount: 2, createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "sup-3", name: "DenimWorld Pvt Ltd", contactPerson: "Amit Patel",
    email: "amit@denimworld.com", phone: "+91 76543 21098", address: "78 Jeans Lane, Ahmedabad, Gujarat",
    isActive: true, poCount: 1, createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "sup-4", name: "CasualTrend Exports", contactPerson: "Sneha Reddy",
    email: "sneha@casualtrend.in", phone: "+91 65432 10987", address: "12 Export Zone, Tirupur, Tamil Nadu",
    isActive: false, poCount: 0, createdAt: "2025-02-15T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z",
  },
];

let nextId = 5;

export const supplierService = {
  async list(): Promise<Supplier[]> {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Supplier | null> {
    return suppliers.find((s) => s.id === id) ?? null;
  },

  async create(values: SupplierFormValues): Promise<Supplier> {
    const now = new Date().toISOString();
    const supplier: Supplier = {
      id: `sup-${nextId++}`,
      name: values.name,
      contactPerson: values.contactPerson ?? null,
      email: values.email ?? null,
      phone: values.phone ?? null,
      address: values.address ?? null,
      isActive: values.isActive,
      poCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    suppliers.push(supplier);
    return supplier;
  },

  async update(id: string, values: Partial<SupplierFormValues>): Promise<Supplier | null> {
    const idx = suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = suppliers[idx];
    const updated: Supplier = {
      ...existing,
      name: values.name ?? existing.name,
      contactPerson: values.contactPerson !== undefined ? (values.contactPerson ?? null) : existing.contactPerson,
      email: values.email !== undefined ? (values.email ?? null) : existing.email,
      phone: values.phone !== undefined ? (values.phone ?? null) : existing.phone,
      address: values.address !== undefined ? (values.address ?? null) : existing.address,
      isActive: values.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    suppliers[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    if (suppliers[idx].poCount > 0) {
      throw new Error("Cannot delete supplier with existing purchase orders");
    }
    suppliers.splice(idx, 1);
    return true;
  },
};
