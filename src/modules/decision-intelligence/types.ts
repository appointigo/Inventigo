export type DecisionSeverity = "LOW" | "MEDIUM" | "HIGH";
export type DecisionEntityType = "PRODUCT" | "CUSTOMER" | "RECEIVABLE" | "DEMAND";

export type DecisionInsight<TType extends string = string> = {
  type: TType;
  severity: DecisionSeverity;
  entityType: DecisionEntityType;
  entityId: string;
  title: string;
  reasons: string[];
};
