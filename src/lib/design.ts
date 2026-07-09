// Версии дизайн-системы. v1 — классическая (нейтральная, как при запуске),
// v2 — «Modern»: синий акцент, мягкие тени, крупные скругления (по референсу).
// Общие константы, безопасные и для клиента, и для сервера.

export type DesignVersion = "v1" | "v2";

export const DESIGN_COOKIE = "studiocrm-design";

export const DESIGN_LABELS: Record<DesignVersion, string> = {
  v1: "Классическое",
  v2: "Modern",
};
