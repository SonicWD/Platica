"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  accInUse,
  accNameTaken,
  blankForm,
  norm,
  buildRow,
  commitAdd,
  defaultDb,
  ERROR_ORDER,
  newId,
  sanitize,
  stamp,
  validate,
  type DB,
  type FormState,
  type Kind,
  type Row,
  type Saved,
} from "@/lib/domain";
import { loadPersisted, savePersisted } from "@/lib/storage";
import { postToSheet, rowCells, URL_RE, type Dest, type Op } from "@/lib/sheet";

export type View = "registrar" | "movs" | "config" | "sheets";

type SheetState = {
  dests: Dest[];
  activeId: string;
  queue: Op[];
  busy: boolean;
  error: string;
  lastOk: string;
  unconfirmed: boolean;
  seq: number;
  timer: number | null;
};

export type World = {
  db: DB;
  accSeq: number;
  records: Saved[];
  sheet: SheetState;
  form: FormState;
  editingId: string | null;
  phase: "form" | "confirm";
  confirmRow: Row | null;
  attempted: boolean;
  savedMsg: string;
  view: View;
  accMsg: string;
  sheetMsg: string;
  gsMsg: string;
};

function emptyWorld(): World {
  return {
    db: defaultDb(),
    accSeq: 2,
    records: [],
    sheet: { dests: [], activeId: "", queue: [], busy: false, error: "", lastOk: "", unconfirmed: false, seq: 0, timer: null },
    form: blankForm(),
    editingId: null,
    phase: "form",
    confirmRow: null,
    attempted: false,
    savedMsg: "",
    view: "registrar",
    accMsg: "",
    sheetMsg: "",
    gsMsg: "",
  };
}

function cloneForm(form: FormState): FormState {
  return JSON.parse(JSON.stringify(form)) as FormState;
}

export function useWorld() {
  const world = useRef<World>(emptyWorld());
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const api = useMemo(() => {
    const persist = () => {
      const w = world.current;
      savePersisted({
        db: w.db,
        accSeq: w.accSeq,
        records: w.records,
        dests: w.sheet.dests,
        activeId: w.sheet.activeId,
        seq: w.sheet.seq,
        queue: w.sheet.queue,
      });
    };

    const active = () => world.current.sheet.dests.find((d) => d.id === world.current.sheet.activeId) ?? null;

    async function flush() {
      const s = world.current.sheet;
      if (s.busy) return;
      s.busy = true;
      if (s.timer) window.clearTimeout(s.timer);
      s.timer = null;
      bump();
      try {
        while (s.queue.length) {
          const op = s.queue[0]!;
          const dest = s.dests.find((d) => d.id === op.dest);
          if (!dest) {
            s.queue.shift();
            continue;
          }
          const payload =
            op.type === "delete"
              ? { action: "delete", id: op.id }
              : op.type === "bulk"
                ? { action: "bulk", rows: op.rows }
                : { action: "upsert", id: op.id, row: op.row };
          const res = await postToSheet(dest, payload);
          if (!res.ok) {
            s.error = res.error;
            s.timer = window.setTimeout(() => {
              s.error = "";
              void flush();
            }, 30000);
            break;
          }
          s.queue.shift();
          s.error = "";
          s.lastOk = stamp().slice(11, 16);
          s.unconfirmed = !res.confirmed;
          if (op.type === "delete") delete dest.synced[op.id];
          else if (op.type === "bulk") op.ids.forEach((id) => {
            dest.synced[id] = true;
          });
          else dest.synced[op.id] = true;
          persist();
          bump();
        }
      } finally {
        s.busy = false;
        persist();
        bump();
      }
    }

    function enqueue(op: Op) {
      const dest = active();
      if (!dest) return;
      const s = world.current.sheet;
      s.queue = s.queue.filter((o) => !(o.dest === dest.id && o.id === op.id));
      s.queue.push({ ...op, dest: dest.id });
      persist();
      bump();
      void flush();
    }

    function enqueueRecord(rec: Saved) {
      enqueue({ dest: "", type: "upsert", id: rec.id, row: rowCells(rec.row) });
    }

    function resetForm() {
      const w = world.current;
      w.form = blankForm();
      w.editingId = null;
      w.attempted = false;
      w.phase = "form";
      w.confirmRow = null;
      w.savedMsg = "";
      bump();
    }

    return {
      flush,
      setView(view: View) {
        world.current.view = view;
        bump();
      },
      patchForm(partial: Partial<FormState>) {
        const w = world.current;
        Object.assign(w.form, partial);
        sanitize(w.form, w.db, w.records);
        bump();
      },
      review() {
        const w = world.current;
        w.attempted = true;
        sanitize(w.form, w.db, w.records);
        const errs = validate(w.form, w.db, w.records);
        if (Object.keys(errs).length) {
          bump();
          const first = ERROR_ORDER.find((k) => errs[k]);
          if (first) document.getElementById(`f-${first}`)?.focus();
          return;
        }
        const prior = w.editingId ? w.records.find((r) => r.id === w.editingId) : undefined;
        w.confirmRow = buildRow(w.form, w.editingId ?? "", prior?.row.registrado ?? stamp(), w.db);
        w.phase = "confirm";
        w.savedMsg = "";
        bump();
        requestAnimationFrame(() => document.getElementById("h-confirm")?.focus());
      },
      back() {
        world.current.phase = "form";
        bump();
      },
      save() {
        const w = world.current;
        sanitize(w.form, w.db, w.records);
        if (Object.keys(validate(w.form, w.db, w.records)).length) {
          w.phase = "form";
          w.attempted = true;
          bump();
          return;
        }
        let msg: string;
        if (w.editingId) {
          const i = w.records.findIndex((r) => r.id === w.editingId);
          const reg = w.records[i]!.row.registrado;
          const row = buildRow(w.form, w.editingId, reg, w.db);
          w.records[i] = { id: w.editingId, form: cloneForm(w.form), row };
          enqueueRecord(w.records[i]!);
          msg = `Cambios guardados en el movimiento ${w.editingId}.`;
        } else {
          const id = newId(w.records);
          const row = buildRow(w.form, id, w.confirmRow?.registrado || stamp(), w.db);
          const rec = { id, form: cloneForm(w.form), row };
          w.records.push(rec);
          enqueueRecord(rec);
          msg = `Movimiento guardado (${id}). Total: ${w.records.length}.`;
        }
        const dest = active();
        if (dest) msg += ` Se envía a «${dest.name}».`;
        w.form = blankForm();
        w.editingId = null;
        w.attempted = false;
        w.phase = "form";
        w.confirmRow = null;
        w.savedMsg = msg;
        persist();
        bump();
        window.scrollTo(0, 0);
      },
      resetForm,
      startEdit(id: string) {
        const w = world.current;
        const rec = w.records.find((r) => r.id === id);
        if (!rec) return;
        w.form = cloneForm(rec.form);
        sanitize(w.form, w.db, w.records);
        w.editingId = id;
        w.attempted = false;
        w.phase = "form";
        w.savedMsg = "";
        w.view = "registrar";
        bump();
      },
      deleteRecord(id: string) {
        const w = world.current;
        const i = w.records.findIndex((r) => r.id === id);
        if (i < 0) return;
        w.records.splice(i, 1);
        const dest = active();
        if (dest) {
          w.sheet.queue = w.sheet.queue.filter((o) => !(o.dest === dest.id && o.id === id));
          w.sheet.queue.push({ dest: dest.id, type: "delete", id });
          void flush();
        }
        if (w.editingId === id) resetForm();
        persist();
        bump();
      },
      commitList(kind: Kind, clean: string) {
        const item = commitAdd(world.current.db, kind, clean);
        persist();
        bump();
        return item;
      },
      renameAccount(id: string, name: string) {
        const w = world.current;
        const acc = w.db.accounts.find((a) => a.id === id);
        if (!acc) return;
        const v = name.replace(/\s+/g, " ").trim();
        if (!v) {
          w.accMsg = "El nombre no puede quedar vacío.";
          bump();
          return;
        }
        if (accNameTaken(w.db, v, id)) {
          w.accMsg = `Ya existe una cuenta, un medio o una deuda con el nombre «${v}».`;
          bump();
          return;
        }
        acc.name = v;
        w.accMsg = "";
        for (const r of w.records) {
          let changed = false;
          if (r.form.account === id) {
            r.row.cuenta = v;
            changed = true;
          }
          if ((r.form.type === "transf" || r.form.type === "ahorro") && r.form.cat === id) {
            r.row.categoria = v;
            changed = true;
          }
          if (r.form.type === "deuda" && r.form.cat === `card:${id}`) {
            r.row.categoria = v;
            changed = true;
          }
          if (changed) enqueueRecord(r);
        }
        sanitize(w.form, w.db, w.records);
        persist();
        bump();
      },
      addAccount(kind: "savings" | "card") {
        const w = world.current;
        const count = w.db.accounts.filter((a) => a.kind === kind).length;
        if (count >= 5) return;
        const base = kind === "savings" ? "Cuenta de ahorros " : "Tarjeta de crédito ";
        let n = 1;
        while (accNameTaken(w.db, base + n)) n++;
        const id = "a" + ++w.accSeq;
        w.db.accounts.push({ id, name: base + n, kind });
        w.accMsg = "";
        persist();
        bump();
      },
      removeAccount(id: string) {
        const w = world.current;
        const acc = w.db.accounts.find((a) => a.id === id);
        if (!acc) return;
        if (accInUse(w.records, id)) {
          w.accMsg = `«${acc.name}» tiene movimientos guardados. Cámbiale el nombre en lugar de quitarla.`;
          bump();
          return;
        }
        w.db.accounts = w.db.accounts.filter((a) => a.id !== id);
        w.accMsg = "";
        sanitize(w.form, w.db, w.records);
        persist();
        bump();
      },
      clearAccMsg() {
        world.current.accMsg = "";
        bump();
      },
      setActive(id: string) {
        world.current.sheet.activeId = id;
        world.current.sheet.error = "";
        persist();
        bump();
        void flush();
      },
      async testDest(id: string) {
        const w = world.current;
        const dest = w.sheet.dests.find((d) => d.id === id);
        if (!dest) return;
        w.sheetMsg = `Probando conexión con «${dest.name}»…`;
        bump();
        const res = await postToSheet(dest, { action: "ping" });
        w.sheetMsg = !res.ok
          ? `Falló la prueba con «${dest.name}»: ${res.error}`
          : res.confirmed
            ? `Conexión confirmada con «${dest.name}». Ya creó la pestaña y los encabezados si faltaban.`
            : `Se envió la prueba a «${dest.name}», pero el navegador no deja leer la respuesta de Google. Abre tu hoja y verifica que exista la pestaña «${dest.tab}» con encabezados.`;
        bump();
      },
      retry() {
        world.current.sheet.error = "";
        bump();
        void flush();
      },
      bulk() {
        const w = world.current;
        const dest = active();
        if (!dest || !w.records.length) return;
        w.sheet.queue = w.sheet.queue.filter((o) => !(o.dest === dest.id && o.type === "bulk"));
        w.sheet.queue.push({
          dest: dest.id,
          type: "bulk",
          id: "__bulk__",
          rows: w.records.map((r) => rowCells(r.row)),
          ids: w.records.map((r) => r.id),
        });
        w.sheetMsg = `Enviando ${w.records.length} movimientos a «${dest.name}». Los que ya existan se actualizan, no se duplican.`;
        persist();
        bump();
        void flush();
      },
      addDest(input: { name: string; tab: string; url: string; key: string }) {
        const w = world.current;
        const name = input.name.replace(/\s+/g, " ").trim();
        const tab = input.tab.replace(/\s+/g, " ").trim();
        const url = input.url.trim();
        const fail = (t: string) => t;
        if (!name) return fail("escribe un nombre para el destino.");
        if (w.sheet.dests.some((d) => norm(d.name) === norm(name))) return fail("ya existe un destino con ese nombre.");
        if (!tab || /[:\\/?*[\]]/.test(tab)) return fail("el nombre de la pestaña es obligatorio y no puede contener : \\ / ? * [ ].");
        if (!URL_RE.test(url)) return fail("la URL debe ser la de una aplicación web de Google Apps Script (https://script.google.com/macros/s/…/exec).");
        const dest: Dest = { id: "d" + ++w.sheet.seq, name, tab, url, key: input.key, synced: {} };
        w.sheet.dests.push(dest);
        if (!w.sheet.activeId) w.sheet.activeId = dest.id;
        w.sheetMsg = `Destino «${name}» guardado${w.sheet.activeId === dest.id ? " y seleccionado como activo" : ""}. Usa «Probar conexión» para verificarlo.`;
        persist();
        bump();
        return "";
      },
      removeDest(id: string) {
        const w = world.current;
        const dest = w.sheet.dests.find((d) => d.id === id);
        if (!dest) return;
        w.sheet.dests = w.sheet.dests.filter((d) => d.id !== id);
        w.sheet.queue = w.sheet.queue.filter((o) => o.dest !== id);
        if (w.sheet.activeId === id) w.sheet.activeId = "";
        w.sheetMsg = `Destino «${dest.name}» quitado de la app. No se borró nada de tu hoja.`;
        persist();
        bump();
      },
      setGsMsg(text: string) {
        world.current.gsMsg = text;
        bump();
      },
    };
  }, [bump]);

  useEffect(() => {
    const saved = loadPersisted();
    const w = world.current;
    if (saved) {
      w.db = saved.db;
      w.accSeq = saved.accSeq;
      w.records = saved.records;
      w.sheet.dests = saved.dests;
      w.sheet.activeId = saved.activeId;
      w.sheet.seq = saved.seq;
      w.sheet.queue = saved.queue;
    }
    w.form = blankForm();
    setReady(true);
    void api.flush();
    const onOnline = () => {
      if (world.current.sheet.queue.length) {
        world.current.sheet.error = "";
        void api.flush();
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      if (world.current.sheet.timer) window.clearTimeout(world.current.sheet.timer);
    };
  }, [api]);

  return { ready, tick, world: world.current, api };
}
