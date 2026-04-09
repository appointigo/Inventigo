"use client";

import React, { memo, useRef, useEffect } from "react";
import {
  KPICard,
  KPIGlow,
  KPIIconWrap,
  KPILabel,
  KPIValue,
  KPIDelta,
} from "./PlatformAdminDashboard.styled";

interface Props {
  label: string;
  value: number;
  delta?: string;
  positive?: boolean;
  neutral?: boolean;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

const PlatformAdminKPICard = memo(function PlatformAdminKPICard({
  label,
  value,
  delta,
  positive,
  neutral,
  icon,
  color,
  delay = 0,
}: Props) {
  const valRef = useRef<HTMLDivElement>(null);

  // Animated counter on mount
  useEffect(() => {
    const el = valRef.current;
    if (!el || value === 0) { if (el) el.textContent = "0"; return; }
    const duration = 800;
    const stepTime  = 16;
    const steps     = Math.floor(duration / stepTime);
    let   step      = 0;

    const timer = setInterval(() => {
      step++;
      el.textContent = String(Math.round((value * step) / steps));
      if (step >= steps) {
        el.textContent = String(value);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <KPICard delay={delay}>
      <KPIGlow color={color} />
      <KPIIconWrap color={color}>{icon}</KPIIconWrap>
      <KPILabel>{label}</KPILabel>
      <KPIValue ref={valRef}>{value}</KPIValue>
      {delta && (
        <KPIDelta positive={positive} neutral={neutral}>
          {delta}
        </KPIDelta>
      )}
    </KPICard>
  );
});

export default PlatformAdminKPICard;
