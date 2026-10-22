/** Compatibility boundary observed in the user-provided cn.orderlife.mobile 2.3.0 APK.
 * This describes the old desktop wire format; SyncExchange is NOT that format. */
export type LegacyStamp = [number, string];
export interface LegacyField {
  s: LegacyStamp;
  ctx: Record<string, number>;
  present: boolean;
  value?: unknown;
}
export interface LegacyRecord {
  birth: LegacyStamp;
  dead: LegacyStamp | null;
  fields: Record<string, LegacyField>;
}
export interface LegacyLanDelta {
  protocol: 1;
  records: Record<string, LegacyRecord>;
}
export interface LegacyLanRequest {
  revisions: Record<string, string>;
  delta: LegacyLanDelta;
}
export const legacyLanReference = {
  package: "cn.orderlife.mobile",
  version: "2.3.0",
  protocol: 1,
  syncRoute: "/v1/sync",
  foregroundIntervalMs: 15000,
  pairing: ["qr", "one-time-code"],
  kinds: ["projects", "tasks", "resources", "reviews"],
} as const;
export interface LegacyLanAdapter {
  /** Implementation must retain unknown desktop fields and revision contexts. */
  exportForDesktop(
    knownRevisions: Record<string, string>,
  ): Promise<LegacyLanRequest>;
  validateDesktopDelta(value: unknown): { valid: boolean; error?: string };
  /** Stage attachments and protect the current snapshot before committing. No implementation in this release. */
  stageDesktopChanges(
    delta: LegacyLanDelta,
  ): Promise<{ changes: number; conflicts: number }>;
}
export function validateLegacyLanDelta(value: any): {
  valid: boolean;
  error?: string;
} {
  const object = (x: any) => x && typeof x === "object" && !Array.isArray(x);
  const safe = (s: any) =>
    typeof s === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(s);
  const stamp = (x: any) =>
    Array.isArray(x) &&
    x.length === 2 &&
    Number.isSafeInteger(x[0]) &&
    x[0] > 0 &&
    safe(x[1]);
  const fail = () => ({ valid: false, error: "旧版局域网增量格式无效" });
  if (
    !object(value) ||
    value.protocol !== 1 ||
    !object(value.records) ||
    Object.keys(value.records).length > 25000
  )
    return fail();
  for (const [key, r] of Object.entries(value.records) as [
    string,
    LegacyRecord,
  ][]) {
    const [kind, id, ...extra] = key.split(":");
    if (
      extra.length ||
      !legacyLanReference.kinds.includes(kind as any) ||
      !safe(id) ||
      !object(r) ||
      !stamp(r.birth) ||
      (r.dead !== null && !stamp(r.dead)) ||
      !object(r.fields)
    )
      return fail();
    for (const [path, f] of Object.entries(r.fields)) {
      let parts;
      try {
        parts = JSON.parse(path);
      } catch {
        return fail();
      }
      if (
        !Array.isArray(parts) ||
        !parts.length ||
        parts.length > 2 ||
        parts.some(
          (p) =>
            typeof p !== "string" ||
            ["id", "__proto__", "constructor", "prototype"].includes(p),
        ) ||
        (parts.length === 2 &&
          (kind !== "tasks" ||
            parts[0] !== "doneInstances" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(parts[1]))) ||
        !object(f) ||
        !stamp(f.s) ||
        typeof f.present !== "boolean" ||
        !object(f.ctx) ||
        Object.entries(f.ctx).some(
          ([id, n]) => !safe(id) || !Number.isSafeInteger(n) || n < 0,
        ) ||
        (f.present && !Object.hasOwn(f, "value"))
      )
        return fail();
    }
  }
  return { valid: true };
}
