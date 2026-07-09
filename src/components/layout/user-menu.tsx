"use client";

import { Check, LogOut, Palette } from "lucide-react";
import type { Role } from "@prisma/client";
import { logoutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/labels";
import { DESIGN_COOKIE, DESIGN_LABELS, type DesignVersion } from "@/lib/design";

function setDesign(version: DesignVersion) {
  document.cookie = `${DESIGN_COOKIE}=${version}; path=/; max-age=31536000; samesite=lax`;
  // Полная перезагрузка, чтобы data-design на <html> гарантированно обновился
  window.location.reload();
}

export function UserMenu({
  name,
  email,
  role,
  design,
}: {
  name: string;
  email: string;
  role: Role;
  design: DesignVersion;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm md:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Palette className="size-3.5" /> Оформление
        </DropdownMenuLabel>
        {(Object.keys(DESIGN_LABELS) as DesignVersion[]).map((version) => (
          <DropdownMenuItem key={version} onClick={() => setDesign(version)}>
            <span className="flex w-4 justify-center">
              {design === version && <Check className="size-4" />}
            </span>
            {DESIGN_LABELS[version]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()}>
          <LogOut className="size-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
