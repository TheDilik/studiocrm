import "server-only";
import { cookies } from "next/headers";
import { DESIGN_COOKIE, type DesignVersion } from "@/lib/design";

/** Текущая версия дизайна из cookie (по умолчанию — классическая v1). */
export async function getDesignVersion(): Promise<DesignVersion> {
  const store = await cookies();
  return store.get(DESIGN_COOKIE)?.value === "v2" ? "v2" : "v1";
}
