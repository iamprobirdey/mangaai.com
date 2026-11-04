import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

function mac(value: string) {
  return crypto.createHmac("sha256", serverEnv.appSecret()).update(value).digest("base64url");
}

/** Returns `value.signature` so the value cannot be changed in the browser. */
export function sign(value: string) {
  return `${value}.${mac(value)}`;
}

export function verify(token: string | undefined | null): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const value = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(mac(value));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return value;
}
