import {
  AccountBookOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  PercentageOutlined,
  RiseOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WarningOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { Role } from "@prisma/client";

export type NavigationItem = {
  key: string;
  path: string;
  name: string;
  icon: React.ComponentType;
  roles: Role[];
  match?: (pathname: string) => boolean;
};

export type ModuleNavigation = {
  key: string;
  label: string;
  roles: Role[];
  match: (pathname: string) => boolean;
  items: NavigationItem[];
};

export const ALL_ROLES: Role[] = [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.STAFF];
export const ADMIN_MANAGER: Role[] = [Role.OWNER, Role.ADMIN, Role.MANAGER];
export const ADMIN_ONLY: Role[] = [Role.OWNER, Role.ADMIN];

export const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  { key: "dashboard", path: "/dashboard", name: "Dashboard", icon: DashboardOutlined, roles: ALL_ROLES, match: (pathname) => pathname === "/dashboard" },
  {
    key: "sales", path: "/dashboard/billing", name: "Sales", icon: ShoppingCartOutlined, roles: ALL_ROLES,
    match: (pathname) => pathname.startsWith("/dashboard/billing") || pathname.startsWith("/dashboard/customers") || pathname.startsWith("/dashboard/sales") || pathname.startsWith("/dashboard/whatsapp"),
  },
  {
    key: "inventory", path: "/dashboard/products", name: "Inventory", icon: InboxOutlined, roles: ALL_ROLES,
    match: (pathname) => pathname.startsWith("/dashboard/products") || pathname.startsWith("/dashboard/stock") || pathname.startsWith("/dashboard/categories") || pathname.startsWith("/dashboard/brands") || pathname.startsWith("/dashboard/demand") || pathname.startsWith("/dashboard/inventory-intelligence"),
  },
  {
    key: "purchasing", path: "/dashboard/purchase-orders", name: "Purchasing", icon: ShopOutlined, roles: ADMIN_MANAGER,
    match: (pathname) => pathname.startsWith("/dashboard/purchase-orders") || pathname.startsWith("/dashboard/suppliers"),
  },
  { key: "finance", path: "/dashboard/expenses", name: "Finance", icon: AccountBookOutlined, roles: ADMIN_MANAGER, match: (pathname) => pathname.startsWith("/dashboard/expenses") },
  {
    key: "team", path: "/dashboard/attendance-leave", name: "Team", icon: TeamOutlined, roles: ALL_ROLES,
    match: (pathname) => pathname.startsWith("/dashboard/attendance") || pathname.startsWith("/dashboard/leaves") || pathname.startsWith("/dashboard/settings/team"),
  },
  { key: "reports", path: "/dashboard/reports", name: "Reports", icon: BarChartOutlined, roles: ADMIN_MANAGER, match: (pathname) => pathname.startsWith("/dashboard/reports") },
  {
    key: "settings", path: "/dashboard/settings", name: "Settings", icon: SettingOutlined, roles: ALL_ROLES,
    match: (pathname) => pathname.startsWith("/dashboard/settings") && !pathname.startsWith("/dashboard/settings/team"),
  },
];

export const MODULE_NAVIGATION: ModuleNavigation[] = [
  {
    key: "sales", label: "Sales", roles: ALL_ROLES, match: (pathname) => PRIMARY_NAV_ITEMS[1].match?.(pathname) ?? false,
    items: [
      { key: "pos", path: "/dashboard/billing", name: "POS / Billing", icon: DollarOutlined, roles: ALL_ROLES },
      { key: "transactions", path: "/dashboard/billing?view=history", name: "Transactions", icon: UnorderedListOutlined, roles: ALL_ROLES },
      { key: "customers", path: "/dashboard/customers", name: "Customers", icon: UserOutlined, roles: ALL_ROLES },
      { key: "customer-actions", path: "/dashboard/customers/action-center", name: "Action Center", icon: TeamOutlined, roles: ALL_ROLES },
      { key: "returns", path: "/dashboard/billing?view=return-exchange", name: "Returns & Exchanges", icon: FileTextOutlined, roles: ALL_ROLES },
      { key: "sales-analytics", path: "/dashboard/sales/analytics", name: "Analytics", icon: BarChartOutlined, roles: ALL_ROLES },
      { key: "owner-intelligence", path: "/dashboard/sales/analytics/owner", name: "Owner Intelligence", icon: RiseOutlined, roles: ADMIN_MANAGER },
      { key: "whatsapp", path: "/dashboard/whatsapp/overview", name: "WhatsApp", icon: WhatsAppOutlined, roles: ADMIN_ONLY },
    ],
  },
  {
    key: "inventory", label: "Inventory", roles: ALL_ROLES, match: (pathname) => PRIMARY_NAV_ITEMS[2].match?.(pathname) ?? false,
    items: [
      { key: "products", path: "/dashboard/products", name: "Products", icon: ShoppingOutlined, roles: ALL_ROLES },
      { key: "stock", path: "/dashboard/stock", name: "Stock", icon: InboxOutlined, roles: ALL_ROLES },
      { key: "categories", path: "/dashboard/categories", name: "Categories", icon: AppstoreOutlined, roles: ADMIN_MANAGER },
      { key: "brands", path: "/dashboard/brands", name: "Brands", icon: TagsOutlined, roles: ADMIN_MANAGER },
      { key: "movements", path: "/dashboard/stock?view=movements", name: "Stock Movement", icon: UnorderedListOutlined, roles: ALL_ROLES },
      { key: "intelligence", path: "/dashboard/inventory-intelligence", name: "Inventory Intelligence", icon: BarChartOutlined, roles: ALL_ROLES },
      { key: "product-intelligence", path: "/dashboard/inventory-intelligence/products", name: "Product Intelligence", icon: RiseOutlined, roles: ALL_ROLES },
      { key: "demand", path: "/dashboard/demand", name: "Demand Intelligence", icon: RiseOutlined, roles: ALL_ROLES },
      { key: "lost-opportunity", path: "/dashboard/demand/lost-opportunity", name: "Lost Opportunity", icon: WarningOutlined, roles: ALL_ROLES },
    ],
  },
  {
    key: "purchasing", label: "Purchasing", roles: ADMIN_MANAGER, match: (pathname) => PRIMARY_NAV_ITEMS[3].match?.(pathname) ?? false,
    items: [
      { key: "suppliers", path: "/dashboard/suppliers", name: "Suppliers", icon: ShopOutlined, roles: ADMIN_MANAGER },
      { key: "purchase-orders", path: "/dashboard/purchase-orders", name: "Purchase Orders", icon: FileTextOutlined, roles: ADMIN_MANAGER },
      { key: "goods-received", path: "/dashboard/purchase-orders?view=receiving", name: "Goods Received / Stock In", icon: InboxOutlined, roles: ADMIN_MANAGER },
      { key: "procurement-intelligence", path: "/dashboard/purchase-orders/intelligence", name: "Procurement Intelligence", icon: RiseOutlined, roles: ADMIN_MANAGER },
    ],
  },
  {
    key: "finance", label: "Finance", roles: ADMIN_MANAGER, match: (pathname) => PRIMARY_NAV_ITEMS[4].match?.(pathname) ?? false,
    items: [
      { key: "expenses", path: "/dashboard/expenses", name: "Expenses", icon: AccountBookOutlined, roles: ADMIN_MANAGER },
      { key: "expense-analytics", path: "/dashboard/expenses/analytics", name: "Expense Analytics", icon: BarChartOutlined, roles: ADMIN_MANAGER },
      { key: "profitability", path: "/dashboard/expenses/profitability", name: "Profitability", icon: RiseOutlined, roles: ADMIN_MANAGER },
      { key: "margin-leakage", path: "/dashboard/expenses/profitability/leakage", name: "Margin Leakage", icon: PercentageOutlined, roles: ADMIN_MANAGER },
      { key: "receivables", path: "/dashboard/expenses/receivables", name: "Receivables", icon: DollarOutlined, roles: ADMIN_MANAGER },
      { key: "gst", path: "/dashboard/expenses/gst", name: "GST & ITC", icon: PercentageOutlined, roles: ADMIN_MANAGER },
    ],
  },
  {
    key: "team", label: "Team", roles: ALL_ROLES, match: (pathname) => PRIMARY_NAV_ITEMS[5].match?.(pathname) ?? false,
    items: [
      { key: "members", path: "/dashboard/settings/team", name: "Members", icon: TeamOutlined, roles: ADMIN_ONLY },
      { key: "attendance", path: "/dashboard/attendance-leave?view=attendance", name: "Attendance", icon: CalendarOutlined, roles: ALL_ROLES },
      { key: "leave", path: "/dashboard/attendance-leave?view=leave", name: "Leave", icon: FileTextOutlined, roles: ALL_ROLES },
      { key: "roles", path: "/dashboard/settings/team?view=roles", name: "Roles & Permissions", icon: SettingOutlined, roles: ADMIN_ONLY },
    ],
  },
  {
    key: "reports", label: "Reports", roles: ADMIN_MANAGER, match: (pathname) => PRIMARY_NAV_ITEMS[6].match?.(pathname) ?? false,
    items: [
      { key: "reports-overview", path: "/dashboard/reports", name: "Reports Overview", icon: BarChartOutlined, roles: ADMIN_MANAGER },
      { key: "inventory-intelligence", path: "/dashboard/inventory-intelligence", name: "Inventory Intelligence", icon: InboxOutlined, roles: ADMIN_MANAGER },
      { key: "demand-intelligence", path: "/dashboard/demand", name: "Demand Intelligence", icon: ShoppingOutlined, roles: ADMIN_MANAGER },
      { key: "movement-history", path: "/dashboard/stock?view=movements", name: "Movement History", icon: UnorderedListOutlined, roles: ADMIN_MANAGER },
      { key: "store-performance", path: "/dashboard/reports/store-performance", name: "Store Performance", icon: ShopOutlined, roles: ADMIN_ONLY },
    ],
  },
  {
    key: "settings", label: "Settings", roles: ALL_ROLES, match: (pathname) => PRIMARY_NAV_ITEMS[7].match?.(pathname) ?? false,
    items: [
      { key: "profile", path: "/dashboard/settings?section=profile", name: "Business Profile", icon: UserOutlined, roles: ALL_ROLES },
      { key: "stores", path: "/dashboard/settings?section=stores", name: "Stores", icon: ShopOutlined, roles: ADMIN_ONLY },
      { key: "invoice-settings", path: "/dashboard/settings?section=invoices", name: "Invoice Settings", icon: FileTextOutlined, roles: ADMIN_ONLY },
      { key: "plan-billing", path: "/dashboard/settings?section=billing", name: "Plan & Billing", icon: DollarOutlined, roles: ADMIN_ONLY },
      { key: "promo-codes", path: "/dashboard/settings?section=promos", name: "Promo Codes", icon: TagsOutlined, roles: ADMIN_ONLY },
      { key: "appearance", path: "/dashboard/settings?section=appearance", name: "Appearance", icon: AppstoreOutlined, roles: ALL_ROLES },
      { key: "integrations", path: "/dashboard/settings/integrations", name: "Integrations", icon: WhatsAppOutlined, roles: ADMIN_ONLY },
    ],
  },
];

export function getPrimaryNavigation(role: Role) {
  if (role === Role.SUPER_ADMIN) return [];
  return PRIMARY_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getModuleNavigation(pathname: string, role: Role) {
  return MODULE_NAVIGATION.find((module) => module.roles.includes(role) && module.match(pathname));
}

export function getModuleItems(pathname: string, role: Role) {
  return getModuleNavigation(pathname, role)?.items.filter((item) => item.roles.includes(role)) ?? [];
}
