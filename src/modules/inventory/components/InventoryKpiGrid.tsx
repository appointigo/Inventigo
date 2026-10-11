import type { ReactNode } from "react";
import styles from "./InventoryKpiGrid.module.css";

export type InventoryKpiTone = "blue" | "orange" | "red" | "purple" | "green" | "cyan";

export type InventoryKpi = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: InventoryKpiTone;
  secondary?: ReactNode;
};

export default function InventoryKpiGrid({
  items,
  label,
}: {
  items: InventoryKpi[];
  label: string;
}) {
  return (
    <section className={styles.container} aria-label={label}>
      <div className={styles.grid}>
        {items.map((item) => (
          <article className={styles.card} key={item.label}>
            <div className={`${styles.icon} ${styles[item.tone]}`} aria-hidden="true">
              {item.icon}
            </div>
            <span className={styles.label}>{item.label}</span>
            <strong className={styles.value}>{item.value}</strong>
            {item.secondary ? <span className={styles.secondary}>{item.secondary}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
