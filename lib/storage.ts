import type { DB, Saved } from "./domain";
import type { Dest, Op } from "./sheet";

export type Persisted = {
  db: DB;
  accSeq: number;
  records: Saved[];
  dests: Dest[];
  activeId: string;
  seq: number;
  queue: Op[];
};

const KEY = "platica.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || !isRecord(data.db) || !Array.isArray(data.records) || !Array.isArray(data.dests)) return null;
    return {
      db: data.db as DB,
      accSeq: typeof data.accSeq === "number" ? data.accSeq : 2,
      records: data.records as Saved[],
      dests: (data.dests as Dest[]).map((d) => ({ ...d, synced: d.synced ?? {} })),
      activeId: typeof data.activeId === "string" ? data.activeId : "",
      seq: typeof data.seq === "number" ? data.seq : 0,
      queue: Array.isArray(data.queue) ? (data.queue as Op[]) : [],
    };
  } catch {
    return null;
  }
}

export function savePersisted(data: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* el navegador puede bloquear el almacenamiento; la sesión sigue en memoria */
  }
}
