export const TYPES = {
  ingreso: "Ingreso",
  gasto: "Gasto o compra",
  ahorro: "Ahorro",
  deuda: "Pago de deuda",
  transf: "Transferencia entre mis propias cuentas",
  prestamo: "Préstamo que hice",
} as const;

export type MovementType = keyof typeof TYPES;
export const TYPE_ORDER: MovementType[] = ["ingreso", "gasto", "ahorro", "deuda", "transf", "prestamo"];

export const EXPENSE_BASE: [string, string][] = [
  ["Hogar", "Administración, servicios, reparaciones"],
  ["Alimentación", "Mercado, comidas fuera de casa"],
  ["Transporte", "Pasajes, gasolina, parqueadero, mantenimiento"],
  ["Universidad", "Cuotas o matrícula, materiales, transporte, alimentación"],
  ["Salud", ""],
  ["Cuidado personal y ropa", ""],
  ["Ocio y entretenimiento", ""],
  ["Celular, internet y suscripciones", ""],
  ["Impuestos, trámites y bancarios", ""],
  ["Viajes", ""],
  ["Regalos y donaciones", ""],
  ["Mascotas", ""],
];

export const INCOME: [string, string][] = [
  ["Salario", "Se asocia al nombre de la empresa"],
  ["Beneficio empresarial", ""],
  ["Inversión", ""],
  ["Regalos", "Se asocia a quién lo dio"],
  ["Devolución de préstamo", "Se asocia a quién pagó"],
];

export const FOR_WHOM = ["YO", "PAREJA", "FAMILIA", "AMIGOS"] as const;
export const LOAN_DEBT = "Préstamo de una persona";
export const MAX_AMOUNT = "9999999999.99";
export const MAX_RATE = "999999.9999";
export const NOTE_MAX = 200;

export type AccountKind = "cash" | "nequi" | "daviplata" | "savings" | "card";
export type Account = { id: string; name: string; kind: AccountKind };

export type DB = {
  accounts: Account[];
  persons: string[];
  companies: string[];
  expenseExtra: string[];
  currencies: string[];
  otherDebts: string[];
};

export type FormState = {
  date: string;
  time: string;
  type: MovementType | "";
  cat: string;
  empresa: string;
  account: string;
  lender: string;
  person: string;
  amount: string;
  currency: string;
  rate: string;
  need: "" | "si" | "no";
  fixvar: "" | "fijo" | "variable";
  note: string;
};

export type Row = {
  id: string;
  fecha: string;
  hora: string;
  franja: string;
  tipo: string;
  categoria: string;
  empresa: string;
  cuenta: string;
  quien: string;
  persona: string;
  monto: string;
  moneda: string;
  tasa: string;
  montoCop: string;
  deseo: string;
  fijo: string;
  nota: string;
  registrado: string;
};

export type Saved = { id: string; form: FormState; row: Row };
export type Opt = { value: string; label: string; group?: string };
export type Kind = "person" | "company" | "expcat" | "currency" | "debt";
export type FieldKey = "cat" | "empresa" | "account" | "lender" | "person" | "currency";

export const COLS: [keyof Row, string][] = [
  ["id", "ID"],
  ["fecha", "Fecha"],
  ["hora", "Hora"],
  ["franja", "Franja del día"],
  ["tipo", "Tipo de movimiento"],
  ["categoria", "Categoría"],
  ["empresa", "Empresa"],
  ["cuenta", "Cuenta o medio de pago"],
  ["quien", "Quién me prestó"],
  ["persona", "Persona relacionada / Para quién"],
  ["monto", "Monto"],
  ["moneda", "Moneda"],
  ["tasa", "Tasa de cambio"],
  ["montoCop", "Monto en COP"],
  ["deseo", "Deseo o necesidad"],
  ["fijo", "Fijo o variable"],
  ["nota", "Nota"],
  ["registrado", "Fecha y hora de registro"],
];

const NONCARD: AccountKind[] = ["cash", "nequi", "daviplata", "savings"];
const ALLKINDS: AccountKind[] = ["cash", "nequi", "daviplata", "savings", "card"];
const FIELD_ORDER: FieldKey[] = ["cat", "empresa", "account", "lender", "person", "currency"];

export function defaultDb(): DB {
  return {
    accounts: [
      { id: "cash", name: "Efectivo", kind: "cash" },
      { id: "nequi", name: "Nequi", kind: "nequi" },
      { id: "daviplata", name: "Daviplata", kind: "daviplata" },
      { id: "a1", name: "Cuenta de ahorros 1", kind: "savings" },
      { id: "a2", name: "Tarjeta de crédito 1", kind: "card" },
    ],
    persons: ["Mamá", "Papá"],
    companies: [],
    expenseExtra: [],
    currencies: ["COP", "USD"],
    otherDebts: ["Cuota del apartamento"],
  };
}

export function blankForm(now = new Date()): FormState {
  return {
    date: todayStr(now),
    time: nowStr(now),
    type: "",
    cat: "",
    empresa: "",
    account: "",
    lender: "",
    person: "",
    amount: "",
    currency: "COP",
    rate: "",
    need: "",
    fixvar: "",
    note: "",
  };
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowStr(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function stamp(d = new Date()): string {
  return `${todayStr(d)} ${nowStr(d)}`;
}

export function franja(t: string): string {
  const hh = parseInt(t.slice(0, 2), 10);
  if (Number.isNaN(hh)) return "";
  if (hh < 6) return "Madrugada";
  if (hh < 12) return "Mañana";
  if (hh < 18) return "Tarde";
  if (hh < 21) return "Noche";
  return "Pasadas las 9 p. m.";
}

export function norm(s: string): string {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanText(kind: Kind, raw: string): string {
  const t = String(raw).replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (kind === "currency") return t.toUpperCase();
  return t.replace(/(^|\s)(\S)/gu, (_m, a: string, b: string) => a + b.toUpperCase());
}

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n]!;
}

function allow(kind: Kind, len: number): number {
  if (kind === "currency") return 1;
  return len <= 3 ? 0 : len <= 8 ? 1 : 2;
}

/** "Tarjeta de crédito 1" y "Tarjeta de crédito 2" no son un error de tipeo. */
export function digitVariant(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let digit = 0;
  let other = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    const ad = /\d/.test(a[i] ?? "");
    const bd = /\d/.test(b[j] ?? "");
    if (ad || bd) digit++;
    else other++;
    if (a.length - i > b.length - j) i++;
    else if (b.length - j > a.length - i) j++;
    else {
      i++;
      j++;
    }
  }
  digit += a.length - i + (b.length - j);
  return digit > 0 && other === 0;
}

export function existing(db: DB, kind: Kind): Opt[] {
  if (kind === "person") return db.persons.map((n) => ({ value: n, label: n }));
  if (kind === "company") return db.companies.map((n) => ({ value: n, label: n }));
  if (kind === "expcat") {
    return [...EXPENSE_BASE.map((c) => c[0]), ...db.expenseExtra].map((n) => ({ value: n, label: n }));
  }
  if (kind === "currency") return db.currencies.map((n) => ({ value: n, label: n }));
  return [
    ...db.accounts.filter((a) => a.kind === "card").map((a) => ({ value: `card:${a.id}`, label: a.name })),
    { value: "loan", label: LOAN_DEBT },
    ...db.otherDebts.map((n) => ({ value: `other:${n}`, label: n })),
  ];
}

export type AddResult =
  | { status: "empty" }
  | { status: "reserved" }
  | { status: "exists"; item: Opt }
  | { status: "similar"; item: Opt; clean: string }
  | { status: "ok"; clean: string };

const KIND_MAX: Record<Kind, number> = { person: 60, company: 80, expcat: 60, currency: 10, debt: 80 };
export const kindMax = (kind: Kind) => KIND_MAX[kind];

export function tryAdd(db: DB, kind: Kind, raw: string): AddResult {
  const clean = cleanText(kind, raw);
  if (!clean) return { status: "empty" };
  const n = norm(clean);
  if (kind === "expcat" && n === "otro") return { status: "reserved" };
  const ex = existing(db, kind);
  const hit = ex.find((e) => norm(e.label) === n);
  if (hit) return { status: "exists", item: hit };
  let best: Opt | null = null;
  let bestD = 99;
  for (const e of ex) {
    const en = norm(e.label);
    if (digitVariant(en, n)) continue;
    const d = lev(en, n);
    if (d <= allow(kind, Math.max(en.length, n.length)) && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (best) return { status: "similar", item: best, clean };
  return { status: "ok", clean };
}

export function commitAdd(db: DB, kind: Kind, clean: string): Opt {
  if (kind === "person") {
    db.persons.push(clean);
    return { value: clean, label: clean };
  }
  if (kind === "company") {
    db.companies.push(clean);
    return { value: clean, label: clean };
  }
  if (kind === "expcat") {
    db.expenseExtra.push(clean);
    return { value: clean, label: clean };
  }
  if (kind === "currency") {
    db.currencies.push(clean);
    return { value: clean, label: clean };
  }
  db.otherDebts.push(clean);
  return { value: `other:${clean}`, label: clean };
}

export function accOf(db: DB, id: string): Account | undefined {
  return db.accounts.find((a) => a.id === id);
}

export function accName(db: DB, id: string): string {
  if (id === "loan") return "Préstamo";
  return accOf(db, id)?.name ?? "";
}

function accGroup(a: Account): string {
  if (a.kind === "savings") return "Cuentas de ahorro";
  if (a.kind === "card") return "Tarjetas de crédito";
  return "Efectivo y billeteras";
}

function accOpts(db: DB, kinds: AccountKind[], withLoan: boolean): Opt[] {
  const o = db.accounts.filter((a) => kinds.includes(a.kind)).map((a) => ({ value: a.id, label: a.name, group: accGroup(a) }));
  if (withLoan) o.push({ value: "loan", label: "Préstamo", group: "Préstamo (alguien me prestó el dinero)" });
  return o;
}

export function lenders(records: Saved[]): string[] {
  return [...new Set(records.map((r) => r.row.quien).filter(Boolean))];
}

export function isVisible(form: FormState, key: FieldKey): boolean {
  if (key === "cat") return !!form.type && form.type !== "prestamo";
  if (key === "empresa") return form.type === "ingreso" && form.cat === "Salario";
  if (key === "account" || key === "currency") return !!form.type;
  if (key === "lender") return form.type === "gasto" && form.account === "loan";
  return (
    form.type === "gasto" ||
    form.type === "prestamo" ||
    (form.type === "ingreso" && (form.cat === "Regalos" || form.cat === "Devolución de préstamo")) ||
    (form.type === "deuda" && form.cat === "loan")
  );
}

export function fieldLabel(form: FormState, key: FieldKey): string {
  if (key === "cat") {
    return (
      {
        gasto: "Categoría del gasto",
        ingreso: "Categoría del ingreso",
        deuda: "¿A qué deuda le estás pagando?",
        transf: "¿Hacia qué cuenta o entidad va el dinero?",
        ahorro: "¿A qué entidad estás enviando el dinero para ahorrar?",
      } as Record<string, string>
    )[form.type] ?? "Categoría";
  }
  if (key === "empresa") return "Nombre de la empresa";
  if (key === "account") {
    if (form.type === "gasto") return "¿Con qué pagaste?";
    if (form.type === "ingreso") return "¿Dónde entró el dinero?";
    return "¿De qué cuenta sale el dinero?";
  }
  if (key === "lender") return "¿Quién te prestó?";
  if (key === "currency") return "Moneda";
  if (form.type === "gasto") return "¿Para quién fue el gasto?";
  if (form.type === "prestamo") return "¿A quién le prestaste?";
  if (form.type === "deuda") return "¿A quién le estás pagando?";
  if (form.cat === "Regalos") return "¿Quién te lo dio?";
  return "¿Quién te devolvió el dinero?";
}

export function fieldOptions(db: DB, records: Saved[], form: FormState, key: FieldKey): Opt[] {
  if (key === "cat") {
    if (form.type === "gasto") {
      return [...EXPENSE_BASE.map((c) => ({ value: c[0], label: c[0] })), ...db.expenseExtra.map((n) => ({ value: n, label: n }))];
    }
    if (form.type === "ingreso") return INCOME.map((c) => ({ value: c[0], label: c[0] }));
    if (form.type === "deuda") {
      return [
        ...db.accounts.filter((a) => a.kind === "card").map((a) => ({ value: `card:${a.id}`, label: a.name, group: "Tarjetas de crédito" })),
        { value: "loan", label: LOAN_DEBT, group: "Préstamos" },
        ...db.otherDebts.map((n) => ({ value: `other:${n}`, label: n, group: "Otras deudas" })),
      ];
    }
    return accOpts(db, NONCARD, false);
  }
  if (key === "empresa") return db.companies.map((n) => ({ value: n, label: n }));
  if (key === "account") return form.type === "gasto" ? accOpts(db, ALLKINDS, true) : accOpts(db, NONCARD, false);
  if (key === "lender") return db.persons.map((n) => ({ value: n, label: n }));
  if (key === "currency") return db.currencies.map((n) => ({ value: n, label: n }));
  if (form.type === "gasto") return FOR_WHOM.map((v) => ({ value: v, label: v }));
  if (form.type === "deuda") {
    const known = lenders(records);
    const first = db.persons.filter((p) => known.includes(p));
    const rest = db.persons.filter((p) => !known.includes(p));
    return [
      ...first.map((p) => ({ value: p, label: p, group: "Personas que te han prestado" })),
      ...rest.map((p) => ({ value: p, label: p, group: first.length ? "Otras personas" : undefined })),
    ];
  }
  return db.persons.map((n) => ({ value: n, label: n }));
}

export function newKind(form: FormState, key: FieldKey): Kind | null {
  if (key === "cat") return form.type === "gasto" ? "expcat" : form.type === "deuda" ? "debt" : null;
  if (key === "empresa") return "company";
  if (key === "lender") return "person";
  if (key === "person") return form.type === "gasto" ? null : "person";
  if (key === "currency") return "currency";
  return null;
}

export function newLabel(form: FormState, key: FieldKey): string {
  if (key === "cat" && form.type === "gasto") return "Otro (crear categoría nueva)…";
  if (key === "cat") return "+ Agregar otra deuda…";
  if (key === "currency") return "Otra…";
  if (key === "empresa") return "+ Agregar empresa nueva…";
  return "+ Agregar persona nueva…";
}

export function newInputLabel(form: FormState, key: FieldKey): string {
  if (key === "cat" && form.type === "gasto") return "Nombre de la categoría nueva";
  if (key === "cat") return "Nombre de la deuda";
  if (key === "currency") return "Escribe la moneda (por ejemplo, EUR)";
  if (key === "empresa") return "Nombre de la empresa";
  return "Nombre de la persona";
}

export function fieldHint(form: FormState): string {
  if (form.type === "deuda" && form.cat) {
    return "Registra aquí el pago total, también cuando pagues una tarjeta de crédito; no registres ese pago como gasto. No se separan capital e intereses.";
  }
  if (form.account === "loan") return "Este gasto no sale de ninguna de tus cuentas.";
  const table = form.type === "gasto" ? EXPENSE_BASE : form.type === "ingreso" ? INCOME : [];
  const found = table.find((c) => c[0] === form.cat);
  if (found?.[1]) return (form.type === "gasto" ? "Ejemplos: " : "") + found[1] + ".";
  return "";
}

export function sanitize(form: FormState, db: DB, records: Saved[]): void {
  for (const key of FIELD_ORDER) {
    if (!isVisible(form, key)) {
      form[key] = key === "currency" ? "COP" : "";
      continue;
    }
    if (form[key] === "__new__" && newKind(form, key)) continue;
    if (form[key] && !fieldOptions(db, records, form, key).some((o) => o.value === form[key])) {
      form[key] = key === "currency" ? "COP" : "";
    }
  }
  if (!(form.type && form.currency !== "COP")) form.rate = "";
  if (form.type !== "gasto") {
    form.need = "";
    form.fixvar = "";
  }
}

export function tidyDecimal(raw: string): string {
  const t = raw.trim();
  if (t.includes(",") && !t.includes(".")) return t.replace(",", ".");
  return t;
}

const reAmount = /^(\d+(\.\d{1,2})?|\.\d{1,2})$/;
const reRate = /^(\d+(\.\d{1,4})?|\.\d{1,4})$/;

export function toScaled(str: string, dec: number): bigint {
  const p = String(str).split(".");
  return BigInt((p[0] || "0") + (p[1] || "").padEnd(dec, "0").slice(0, dec));
}

export function fromScaled(b: bigint, dec: number, trim: boolean): string {
  const neg = b < 0n;
  const s = (neg ? -b : b).toString().padStart(dec + 1, "0");
  const i = s.slice(0, -dec);
  let f = s.slice(-dec);
  if (trim) f = f.replace(/0+$/, "");
  return (neg ? "-" : "") + (f ? `${i}.${f}` : i);
}

export function fmtNum(s: string): string {
  if (s === "") return "";
  const p = String(s).split(".");
  const i = p[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return p[1] ? `${i},${p[1]}` : i;
}

export function copOf(form: FormState): bigint | null {
  if (!reAmount.test(form.amount)) return null;
  const cents = toScaled(form.amount, 2);
  if (form.currency === "COP") return cents;
  if (!reRate.test(form.rate)) return null;
  return (cents * toScaled(form.rate, 4) + 5000n) / 10000n;
}

export function catLabel(db: DB, form: FormState): string {
  if (!form.cat || form.type === "prestamo") return "";
  if (form.type === "transf" || form.type === "ahorro") return accName(db, form.cat);
  if (form.type === "deuda") {
    if (form.cat === "loan") return LOAN_DEBT;
    if (form.cat.startsWith("card:")) return accName(db, form.cat.slice(5));
    return form.cat.slice(6);
  }
  return form.cat;
}

export function buildRow(form: FormState, id: string, registrado: string, db: DB): Row {
  const cop = copOf(form);
  return {
    id,
    fecha: form.date,
    hora: form.time,
    franja: franja(form.time),
    tipo: form.type ? TYPES[form.type] : "",
    categoria: catLabel(db, form),
    empresa: form.empresa || "",
    cuenta: accName(db, form.account),
    quien: form.lender || "",
    persona: form.person || "",
    monto: fromScaled(toScaled(form.amount, 2), 2, false),
    moneda: form.currency,
    tasa: form.currency === "COP" ? "1" : fromScaled(toScaled(form.rate, 4), 4, true),
    montoCop: cop == null ? "" : fromScaled(cop, 2, false),
    deseo: form.type === "gasto" ? (form.need === "no" ? "Necesidad" : "Deseo") : "",
    fijo: form.type === "gasto" ? (form.fixvar === "fijo" ? "Fijo" : "Variable") : "",
    nota: form.note.trim(),
    registrado,
  };
}

export function validate(form: FormState, db: DB, records: Saved[], now = new Date()): Record<string, string> {
  const e: Record<string, string> = {};
  const pending = "Escribe el nombre nuevo y pulsa «Agregar», o elige otra opción.";
  if (!form.date) e.date = "Indica la fecha del movimiento.";
  else if (form.date > todayStr(now)) e.date = "La fecha no puede ser futura: la app solo registra movimientos que ya ocurrieron.";
  if (!form.time) e.time = "Indica la hora.";
  else if (form.date && !e.date) {
    const [y, m, d] = form.date.split("-").map(Number);
    const [hh, mm, ss = 0] = form.time.split(":").map(Number);
    if (new Date(y!, m! - 1, d, hh, mm, ss) > now) e.time = "La hora no puede ser futura.";
  }
  if (!form.type) e.type = "Selecciona el tipo de movimiento.";
  for (const key of FIELD_ORDER) {
    if (!isVisible(form, key)) continue;
    if (form[key] === "__new__") e[key] = pending;
    else if (!form[key]) e[key] = "Esta respuesta es obligatoria.";
  }
  if ((form.type === "transf" || form.type === "ahorro") && form.account && form.cat && form.account === form.cat) {
    e.account = "La cuenta de origen no puede ser la misma que la de destino.";
    e.cat = "El destino no puede ser la misma cuenta de origen.";
  }
  if (form.type) {
    if (!form.amount) e.amount = "Indica el monto.";
    else if (!reAmount.test(form.amount)) e.amount = "Usa solo números, con hasta 2 decimales.";
    else if (toScaled(form.amount, 2) <= 0n) e.amount = "El monto debe ser mayor que cero.";
    else if (toScaled(form.amount, 2) > toScaled(MAX_AMOUNT, 2)) e.amount = `El monto máximo es ${fmtNum(fromScaled(toScaled(MAX_AMOUNT, 2), 2, true))}.`;
    if (form.currency !== "COP") {
      if (!form.rate) e.rate = "Indica la tasa de cambio.";
      else if (!reRate.test(form.rate)) e.rate = "Usa solo números, con hasta 4 decimales.";
      else if (toScaled(form.rate, 4) <= 0n) e.rate = "La tasa debe ser mayor que cero.";
      else if (toScaled(form.rate, 4) > toScaled(MAX_RATE, 4)) e.rate = "La tasa es demasiado grande.";
    }
  }
  if (form.type === "gasto") {
    if (!form.need) e.need = "Responde esta pregunta.";
    if (!form.fixvar) e.fixvar = "Elige Fijo o Variable.";
  }
  if (form.note.length > NOTE_MAX) e.note = "Máximo 200 caracteres.";
  return e;
}

export function summaryPairs(row: Row, includeId: boolean): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, label] of COLS) {
    if (key === "id" && !includeId) continue;
    let v = row[key];
    if (v === "") continue;
    if (key === "monto") v = `${fmtNum(v)} ${row.moneda}`;
    if (key === "montoCop") v = `${fmtNum(v)} COP`;
    if (key === "tasa") v = fmtNum(v);
    if (key === "moneda") continue;
    out.push([label, v]);
  }
  return out;
}

export type Cell = string | number;

export function formulaSafe(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

export function sheetRow(row: Row): Cell[] {
  return COLS.map(([key]) => {
    const v = row[key];
    if ((key === "monto" || key === "tasa" || key === "montoCop") && v !== "") return Number(v);
    const s = formulaSafe(String(v ?? ""));
    return s;
  });
}

export function toCsv(records: Saved[]): string {
  const esc = (v: string) => {
    const safe = formulaSafe(v);
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = records.slice().sort((a, b) => (a.row.fecha + a.row.hora + a.row.registrado).localeCompare(b.row.fecha + b.row.hora + b.row.registrado));
  return [COLS.map((c) => esc(c[1])).join(","), ...rows.map((r) => COLS.map((c) => esc(String(r.row[c[0]] ?? ""))).join(","))].join("\n");
}

export function newId(records: Saved[], now = new Date()): string {
  let id = "";
  do {
    const d = now;
    id = `MOV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (records.some((r) => r.id === id));
  return id;
}

export function accNameTaken(db: DB, name: string, exceptId?: string): boolean {
  const n = norm(name);
  if (n === norm("Préstamo")) return true;
  if (db.otherDebts.some((d) => norm(d) === n)) return true;
  return db.accounts.some((a) => a.id !== exceptId && norm(a.name) === n);
}

export function accInUse(records: Saved[], id: string): boolean {
  return records.some(
    (r) =>
      r.form.account === id ||
      ((r.form.type === "transf" || r.form.type === "ahorro") && r.form.cat === id) ||
      (r.form.type === "deuda" && r.form.cat === `card:${id}`),
  );
}

export const FIELD_KEYS: FieldKey[] = FIELD_ORDER;
export const ERROR_ORDER = ["date", "time", "type", ...FIELD_ORDER, "amount", "rate", "need", "fixvar", "note"];
