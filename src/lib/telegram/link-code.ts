// Короткоживущий код привязки Telegram-аккаунта к пользователю StudioCRM,
// без отдельной таблицы в БД — подписан через AUTH_SECRET, живёт 15 минут.
import "server-only";
import { createHmac } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const DEFAULT_TTL_MS = 15 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
}

export function createLinkCode(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

/** Возвращает userId, если код валиден и не истёк, иначе null. */
export function verifyLinkCode(code: string, ttlMs = DEFAULT_TTL_MS): string | null {
  try {
    const decoded = Buffer.from(code, "base64url").toString("utf8");
    const [userId, tsRaw, sig] = decoded.split(".");
    if (!userId || !tsRaw || !sig) return null;
    if (sign(`${userId}.${tsRaw}`) !== sig) return null;
    const ts = Number(tsRaw);
    if (Number.isNaN(ts) || Date.now() - ts > ttlMs) return null;
    return userId;
  } catch {
    return null;
  }
}
