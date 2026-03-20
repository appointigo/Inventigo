export type CategoryFormValues = {
  name: string;
  slug: string;
  description?: string;
  attributeSchema: {
    fields: AttributeField[];
  };
  sizes: string[];
};

export type AttributeField = {
  name: string;
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
};
