"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import { getModuleItems, getModuleNavigation } from "../constants";

function isSelected(pathname: string, search: string, target: string) {
  if (pathname === "/dashboard/attendance" && target === "/dashboard/attendance-leave?view=attendance") return true;
  if (pathname === "/dashboard/leaves" && target === "/dashboard/attendance-leave?view=leave") return true;
  const [targetPath, targetSearch = ""] = target.split("?");
  if (pathname !== targetPath && !pathname.startsWith(`${targetPath}/`)) return false;
  if (!targetSearch) return pathname !== targetPath || !search;
  const currentParams = new URLSearchParams(search);
  return [...new URLSearchParams(targetSearch).entries()].every(([key, value]) => currentParams.get(key) === value);
}

export default function ModuleNavigationBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeModule = getModuleNavigation(pathname, role);
  const items = getModuleItems(pathname, role);

  if (!activeModule || pathname === "/dashboard") return null;
  const search = searchParams.toString();

  return (
    <nav className="module-navigation" aria-label={`${activeModule.label} navigation`}>
      <div className="module-navigation-inner">
        <span className="module-navigation-title">{activeModule.label}</span>
        <div className="module-navigation-scroll">
          {items.map((item) => {
            const Icon = item.icon;
            const selected = isSelected(pathname, search, item.path);
            return (
              <button key={item.key} type="button" className={selected ? "active" : ""} onClick={() => router.push(item.path)}>
                <Icon /><span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .module-navigation { background: var(--bg-surface); border-bottom: 1px solid var(--border-primary); }
        .module-navigation-inner { min-height: 48px; display: flex; align-items: center; gap: 20px; padding: 0 24px; }
        .module-navigation-title { color: var(--text-primary); font-weight: 650; }
        .module-navigation-scroll { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
        .module-navigation-scroll::-webkit-scrollbar { display: none; }
        button { border: 0; background: transparent; color: var(--text-muted); height: 47px; padding: 0 10px; display: inline-flex; gap: 7px; align-items: center; white-space: nowrap; cursor: pointer; border-bottom: 2px solid transparent; font: inherit; font-size: 13px; }
        button:hover { color: #2563eb; }
        button.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
        @media (max-width: 800px) { .module-navigation-inner { padding: 0 16px; gap: 10px; } .module-navigation-title { display: none; } }
      `}</style>
    </nav>
  );
}
