import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListTodo,
  UserCog,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[]; // кто видит пункт меню
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Дашборд",
    href: "/",
    icon: LayoutDashboard,
    roles: ["OWNER", "MANAGER", "EMPLOYEE"],
  },
  {
    title: "Клиенты",
    href: "/clients",
    icon: Users,
    roles: ["OWNER", "MANAGER"],
  },
  {
    title: "Проекты",
    href: "/projects",
    icon: FolderKanban,
    roles: ["OWNER", "MANAGER", "EMPLOYEE"],
  },
  {
    title: "Задачи",
    href: "/tasks",
    icon: ListTodo,
    roles: ["OWNER", "MANAGER", "EMPLOYEE"],
  },
  {
    title: "Сотрудники",
    href: "/employees",
    icon: UserCog,
    roles: ["OWNER", "MANAGER"],
  },
  {
    title: "Финансы",
    href: "/finance",
    icon: Wallet,
    roles: ["OWNER", "MANAGER"], // менеджер — только просмотр (контроль в сервисах)
  },
  {
    title: "Настройки",
    href: "/settings",
    icon: Settings,
    roles: ["OWNER", "MANAGER", "EMPLOYEE"], // раздел организации внутри виден только владельцу
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
