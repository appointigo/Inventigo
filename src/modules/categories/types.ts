export type AttributeField = {
  name: string;
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
};

export type CategoryFormValues = {
  name: string;
  slug: string;
  description?: string;
  attributeSchema: {
    fields: AttributeField[];
  };
  sizes: string[];
  storeId?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  attributeSchema: { fields: AttributeField[] };
  sizes: { id: string; label: string; sortOrder: number }[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
