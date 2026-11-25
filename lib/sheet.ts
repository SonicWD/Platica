import { COLS, formulaSafe, type Cell, type Row } from "./domain";

export type Dest = {
  id: string;
  name: string;
  tab: string;
  url: string;
  key: string;
  synced: Record<string, true>;
};

export type Op =
  | { dest: string; type: "upsert"; id: string; row: Cell[] }
  | { dest: string; type: "delete"; id: string }
  | { dest: string; type: "bulk"; id: "__bulk__"; rows: Cell[][]; ids: string[] };

export const URL_RE = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+\/|macros\/)s\/[\w-]+\/exec$/;

export const GS_CODE = `// Pega este código en Extensiones > Apps Script de TU hoja de Google.
// Opcional: escribe aquí la misma clave que pondrás en la app.
const CLAVE = '';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    if (CLAVE && d.key !== CLAVE) return salida({ ok: false, error: 'Clave incorrecta' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tab = String(d.tab || 'Movimientos');
    const sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    if (sh.getLastRow() === 0 && d.headers) {
      sh.getRange(1, 1, 1, d.headers.length).setValues([d.headers]);
      sh.setFrozenRows(1);
    }
    if (d.action === 'ping') return salida({ ok: true });
    if (d.action === 'delete') {
      const r = buscar(sh, d.id);
      if (r > 0) sh.deleteRow(r);
      return salida({ ok: true });
    }
    const rows = d.action === 'bulk' ? d.rows : [d.row];
    rows.forEach(function (row) {
      const r = buscar(sh, row[0]);
      if (r > 0) sh.getRange(r, 1, 1, row.length).setValues([row]);
      else sh.appendRow(row);
    });
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function buscar(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}`;

export function headers(): string[] {
  return COLS.map((c) => c[1]);
}

export function rowCells(row: Row): Cell[] {
  return COLS.map(([key]) => {
    const v = row[key];
    if ((key === "monto" || key === "tasa" || key === "montoCop") && v !== "") return Number(v);
    return formulaSafe(String(v ?? ""));
  });
}

export async function postToSheet(
  dest: Dest,
  payload: Record<string, unknown>,
): Promise<{ ok: true; confirmed: boolean } | { ok: false; error: string }> {
  const body = JSON.stringify({ key: dest.key, tab: dest.tab, headers: headers(), ...payload });
  const headersInit = { "Content-Type": "text/plain;charset=utf-8" };
  try {
    const res = await fetch(dest.url, { method: "POST", headers: headersInit, body });
    let parsed: { ok?: boolean; error?: string } | null = null;
    try {
      parsed = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      parsed = null;
    }
    if (!parsed) {
      return {
        ok: false,
        error: "Respuesta inesperada del script. Revisa que esté implementado como aplicación web con acceso «Cualquier persona».",
      };
    }
    return parsed.ok ? { ok: true, confirmed: true } : { ok: false, error: parsed.error || "El script respondió con un error." };
  } catch {
    try {
      await fetch(dest.url, { method: "POST", mode: "no-cors", headers: headersInit, body });
      return { ok: true, confirmed: false };
    } catch {
      return { ok: false, error: "No hay conexión con Google o el navegador bloqueó el envío." };
    }
  }
}
