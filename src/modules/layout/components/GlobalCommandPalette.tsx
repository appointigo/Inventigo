"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Empty, Input, Modal, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Role } from "@prisma/client";
import { MODULE_NAVIGATION, getPrimaryNavigation } from "../constants";

const { Text } = Typography;

export default function GlobalCommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target;
        if (
          !open &&
          target instanceof HTMLElement &&
          (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        ) {
          return;
        }
        event.preventDefault();
        setActiveIndex(0);
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const commands = useMemo(() => {
    const primary = getPrimaryNavigation(role).map((item) => ({
      key: `area-${item.key}`,
      label: `Open ${item.name}`,
      group: "Business areas",
      path: item.path,
      icon: item.icon,
    }));
    const capabilities = MODULE_NAVIGATION.flatMap((module) =>
      module.roles.includes(role)
        ? module.items
            .filter((item) => item.roles.includes(role))
            .map((item) => ({
              key: `${module.key}-${item.key}`,
              label: item.name,
              group: module.label,
              path: item.path,
              icon: item.icon,
            }))
        : []
    );
    const unique = new Map<string, (typeof primary)[number]>();
    [...primary, ...capabilities].forEach((command) => {
      if (!unique.has(command.path)) unique.set(command.path, command);
    });
    return [...unique.values()];
  }, [role]);

  const visibleCommands = commands.filter((command) =>
    `${command.label} ${command.group}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <>
      <button className="command-trigger" type="button" onClick={() => { setActiveIndex(0); setOpen(true); }} aria-label="Open search and commands">
        <SearchOutlined />
        <span>Search or jump to…</span>
        <kbd>⌘ K</kbd>
      </button>
      <Modal open={open} onCancel={() => setOpen(false)} footer={null} width={620} centered title={null} styles={{ body: { padding: 0 } }}>
        <Input
          autoFocus
          variant="borderless"
          size="large"
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search products, customers, pages and actions"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => visibleCommands.length ? Math.min(current + 1, visibleCommands.length - 1) : 0);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const selected = visibleCommands[activeIndex];
              if (selected) navigate(selected.path);
            }
          }}
          style={{ padding: "18px 20px", borderBottom: "1px solid #eef2f7" }}
        />
        <div className="command-results">
          {visibleCommands.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching action" /> : visibleCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.key}
                type="button"
                className={`command-result ${index === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigate(command.path)}
              >
                <span className="command-result-icon"><Icon /></span>
                <span style={{ flex: 1 }}><Text strong>{command.label}</Text></span>
                <Text type="secondary" style={{ fontSize: 12 }}>{command.group}</Text>
              </button>
            );
          })}
        </div>
      </Modal>
      <style jsx>{`
        .command-trigger { width: min(360px, 34vw); height: 36px; display: flex; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafc; color: #64748b; cursor: pointer; font: inherit; text-align: left; }
        .command-trigger span { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .command-trigger kbd { border: 1px solid #dbe3ed; border-radius: 5px; padding: 1px 6px; background: #fff; color: #94a3b8; font-size: 11px; }
        @media (max-width: 900px) { .command-trigger { width: 38px; justify-content: center; padding: 0; } .command-trigger span, .command-trigger kbd { display: none; } }
      `}</style>
      <style jsx global>{`
        .command-results { max-height: 420px; overflow-y: auto; padding: 8px; }
        .command-results .ant-empty { margin-block: 36px; }
        .command-result { width: 100%; border: 0; background: transparent; display: flex; align-items: center; text-align: left; border-radius: 8px; padding: 10px 12px; cursor: pointer; gap: 10px; }
        .command-result:hover { background: #f1f5f9; }
        .command-result.active { background: #edf4ff; }
        .command-result-icon { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; background: #eff6ff; color: #2563eb; }
      `}</style>
    </>
  );
}
