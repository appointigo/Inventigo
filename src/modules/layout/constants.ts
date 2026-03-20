import { DashboardOutlined, ShoppingOutlined, AppstoreOutlined, TagsOutlined, InboxOutlined, FileTextOutlined, ScanOutlined, BarChartOutlined, SettingOutlined, ShopOutlined, AlertOutlined, DollarOutlined } from "@ant-design/icons";
import { Role } from "@prisma/client";

export type MenuItem = {
  path: string;
  name: string;
  icon: React.ComponentType;
  roles: Role[]; // Which roles can see this menu item
  children?: MenuItem[];
};

const ALL_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.STAFF];
const ADMIN_MANAGER: Role[] = [Role.ADMIN, Role.MANAGER];
const ADMIN_ONLY: Role[] = [Role.ADMIN];

export const MENU_ITEMS: MenuItem[] = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: DashboardOutlined,
    roles: ALL_ROLES,
  },
  {
    path: "/dashboard/products",
    name: "Products",
    icon: ShoppingOutlined,
    roles: ALL_ROLES,
  },
  {
    path: "/dashboard/categories",
    name: "Categories",
    icon: AppstoreOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/brands",
    name: "Brands",
    icon: TagsOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/stock",
    name: "Stock",
    icon: InboxOutlined,
    roles: ALL_ROLES,
  },
  {
    path: "/dashboard/suppliers",
    name: "Suppliers",
    icon: ShopOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/purchase-orders",
    name: "Purchase Orders",
    icon: FileTextOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/alerts",
    name: "Alerts",
    icon: AlertOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/billing",
    name: "Billing",
    icon: DollarOutlined,
    roles: ALL_ROLES,
  },
  {
    path: "/dashboard/scan",
    name: "Barcode Scan",
    icon: ScanOutlined,
    roles: ALL_ROLES,
  },
  {
    path: "/dashboard/reports",
    name: "Reports",
    icon: BarChartOutlined,
    roles: ADMIN_MANAGER,
  },
  {
    path: "/dashboard/settings",
    name: "Settings",
    icon: SettingOutlined,
    roles: ADMIN_ONLY,
  },
];

/**
 * Filter menu items based on user role.
 */
export function getMenuForRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}
