import assert from "node:assert/strict";
import test from "node:test";
import { EXPENSE_BASE, commitAdd, copOf, defaultDb, digitVariant, fromScaled, stamp, toCsv, toScaled, tryAdd, blankForm } from "./domain.ts";

test("la fecha de registro no repite los segundos", () => {
  const s = stamp(new Date(2026, 10, 25, 3, 50, 12));
  assert.equal(s, "2026-11-25 03:50:12");
});

test("Hogar no ofrece la cuota del apartamento como ejemplo de gasto", () => {
  const hogar = EXPENSE_BASE.find((c) => c[0] === "Hogar");
  assert.ok(hogar);
  assert.equal(hogar[1].toLowerCase().includes("cuota"), false);
});

test("un número al final no se trata como nombre duplicado", () => {
  assert.equal(digitVariant("tarjeta de credito 1", "tarjeta de credito 2"), true);
  const db = defaultDb();
  db.otherDebts.push("Tarjeta de crédito 1");
  const r = tryAdd(db, "debt", "Tarjeta de crédito 2");
  assert.equal(r.status, "ok");
});

test("Mami se parece a Mamá", () => {
  const db = defaultDb();
  const r = tryAdd(db, "person", "Mami");
  assert.equal(r.status, "similar");
  if (r.status === "similar") assert.equal(r.item.label, "Mamá");
});

test("el monto en COP usa aritmética exacta", () => {
  const form = blankForm();
  form.amount = "10.10";
  form.currency = "USD";
  form.rate = "4000.125";
  const cop = copOf(form);
  assert.ok(cop);
  assert.equal(fromScaled(cop, 2, false), "40401.26");
});

test("el CSV no deja que una nota con = se abra como fórmula", () => {
  const form = blankForm();
  form.type = "ingreso";
  form.amount = "1";
  form.currency = "COP";
  const csv = toCsv([
    {
      id: "MOV-1",
      form,
      row: {
        id: "MOV-1",
        fecha: "2026-11-24",
        hora: "10:00:00",
        franja: "Mañana",
        tipo: "Ingreso",
        categoria: "Inversión",
        empresa: "",
        cuenta: "Efectivo",
        quien: "",
        persona: "",
        monto: "1.00",
        moneda: "COP",
        tasa: "1",
        montoCop: "1.00",
        deseo: "",
        fijo: "",
        nota: "=2+2",
        registrado: "2026-11-24 10:00:00",
      },
    },
  ]);
  assert.equal(csv.includes(",=2+2"), false);
  assert.equal(csv.includes("'=2+2"), true);
});

test("agregar una persona no duplica ignorando tildes", () => {
  const db = defaultDb();
  const r = tryAdd(db, "person", "  mama ");
  assert.equal(r.status, "exists");
  if (r.status === "exists") assert.equal(r.item.label, "Mamá");
  const created = tryAdd(db, "person", "Tía Ana");
  assert.equal(created.status, "ok");
  if (created.status === "ok") {
    commitAdd(db, "person", created.clean);
    assert.equal(db.persons.includes("Tía Ana"), true);
  }
  assert.equal(toScaled("10.2", 2), 1020n);
});
