"use client";

import { useEffect, useState } from "react";
import { EXPENSE_BASE, kindMax, tryAdd, type DB, type Kind, type Opt } from "@/lib/domain";

const LISTS: [string, Kind, (db: DB) => string[], string][] = [
  ["Personas", "person", (db) => db.persons, "Comparte la lista entre «Quién me prestó» y «Persona relacionada»."],
  ["Empresas", "company", (db) => db.companies, "Se usan en ingresos de tipo Salario."],
  ["Categorías de gasto", "expcat", (db) => [...EXPENSE_BASE.map((c) => c[0]), ...db.expenseExtra], "Las nuevas se crean con «Otro» y no cambian movimientos anteriores."],
  ["Monedas", "currency", (db) => db.currencies, "Se guardan en mayúsculas."],
  [
    "Otras deudas",
    "debt",
    (db) => db.otherDebts,
    "La cuota del apartamento inicia aquí como otra deuda; regístrala como Pago de deuda, no como gasto de Hogar. Las tarjetas de crédito y «Préstamo de una persona» ya están incluidas automáticamente.",
  ],
];

export function ConfigPanel({
  db,
  accMsg,
  onRename,
  onAddAccount,
  onRemove,
  onAdd,
}: {
  db: DB;
  accMsg: string;
  onRename: (id: string, name: string) => void;
  onAddAccount: (kind: "savings" | "card") => void;
  onRemove: (id: string) => void;
  onAdd: (kind: Kind, clean: string) => Opt;
}) {
  const groups: [string, ("cash" | "nequi" | "daviplata" | "savings" | "card")[], "savings" | "card" | null][] = [
    ["Efectivo y billeteras", ["cash", "nequi", "daviplata"], null],
    ["Cuentas de ahorro (máximo 5)", ["savings"], "savings"],
    ["Tarjetas de crédito (máximo 5)", ["card"], "card"],
  ];

  return (
    <section aria-labelledby="h-conf">
      <h2 id="h-conf" tabIndex={-1} style={{ marginBottom: 12 }}>
        Cuentas, medios de pago y listas
      </h2>
      <div className="card">
        <h3>Medios de pago y cuentas</h3>
        <p className="help">Puedes cambiar los nombres. Hasta 5 cuentas de ahorro y 5 tarjetas de crédito. Si cambias un nombre, se actualiza también en los movimientos ya guardados.</p>
        {accMsg ? (
          <p className="field-error" role="alert">
            Aviso: {accMsg}
          </p>
        ) : (
          <p className="field-error" />
        )}
        {groups.map(([title, kinds, addKind]) => {
          const list = db.accounts.filter((a) => kinds.includes(a.kind));
          const full = addKind ? list.length >= 5 : false;
          return (
            <div key={title}>
              <h4 className="help" style={{ marginTop: 16 }}>
                {title}
              </h4>
              {list.map((acc) => (
                <NameRow key={acc.id} name={acc.name} removable={acc.kind === "savings" || acc.kind === "card"} onCommit={(v) => onRename(acc.id, v)} onRemove={() => onRemove(acc.id)} />
              ))}
              {addKind ? (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={full} onClick={() => onAddAccount(addKind)}>
                    {addKind === "savings" ? "Agregar cuenta de ahorro" : "Agregar tarjeta de crédito"}
                  </button>
                  {full ? <p className="help">Llegaste al máximo de 5.</p> : null}
                </>
              ) : null}
            </div>
          );
        })}
        <p className="help">«Préstamo» (alguien me prestó el dinero con el que pagué) es una opción fija y solo se ofrece en gastos. Las tarjetas de crédito solo se ofrecen como medio de pago en gastos; también aparecen como deuda elegible al registrar un pago de deuda.</p>
      </div>
      <div className="card">
        <h3>Listas que crecen</h3>
        <p className="help">Se alimentan también desde el formulario. Al agregar, la app evita duplicados (ignora mayúsculas, tildes y espacios).</p>
        {LISTS.map(([title, kind, read, help]) => (
          <ListBlock key={kind} title={title} kind={kind} items={read(db)} help={help} db={db} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function NameRow({ name, removable, onCommit, onRemove }: { name: string; removable: boolean; onCommit: (v: string) => void; onRemove: () => void }) {
  const [text, setText] = useState(name);
  useEffect(() => setText(name), [name]);
  return (
    <div className="acc-row">
      <input className="input" aria-label={`Nombre: ${name}`} value={text} maxLength={40} onChange={(e) => setText(e.target.value)} onBlur={() => onCommit(text)} />
      {removable ? (
        <button type="button" className="btn btn-secondary btn-sm" aria-label={`Quitar ${name}`} onClick={onRemove}>
          Quitar
        </button>
      ) : null}
    </div>
  );
}

function ListBlock({
  title,
  kind,
  items,
  help,
  db,
  onAdd,
}: {
  title: string;
  kind: Kind;
  items: string[];
  help: string;
  db: DB;
  onAdd: (kind: Kind, clean: string) => Opt;
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [similar, setSimilar] = useState<{ item: Opt; clean: string } | null>(null);

  function attempt(forceClean?: string) {
    const raw = forceClean ?? text;
    const result = tryAdd(db, kind, raw);
    setSimilar(null);
    if (result.status === "empty") return setMsg("Escribe un nombre.");
    if (result.status === "reserved") return setMsg("«Otro» no puede ser el nombre de una categoría. Escribe un nombre específico.");
    if (result.status === "exists") {
      setText("");
      setMsg(`Ya existía «${result.item.label}»; se seleccionó la existente.`);
      return;
    }
    if (result.status === "similar" && !forceClean) {
      setMsg("");
      setSimilar({ item: result.item, clean: result.clean });
      return;
    }
    const clean = result.status === "ok" ? result.clean : forceClean || "";
    if (!clean) return;
    onAdd(kind, clean);
    setText("");
    setMsg(`Se creó «${clean}».`);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h4>{title}</h4>
      <p className="help">{help}</p>
      <ul className="chips" aria-label={title}>
        {items.length ? items.map((n) => <li key={n}>{n}</li>) : <li className="muted">Aún no hay elementos</li>}
      </ul>
      <div className="newbox">
        <label htmlFor={`list-${kind}`}>Agregar a {title.toLowerCase()}</label>
        <div className="inline">
          <input
            id={`list-${kind}`}
            className="input"
            value={text}
            maxLength={kindMax(kind)}
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              attempt();
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => attempt()}>
            Agregar
          </button>
        </div>
        {msg ? (
          <p className="help" role="status">
            {msg}
          </p>
        ) : null}
        {similar ? (
          <div className="suggest">
            <p>¿Quisiste decir «{similar.item.label}»?</p>
            <div className="actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setSimilar(null); setText(""); setMsg(`Se seleccionó «${similar.item.label}».`); }}>
                Sí, usar «{similar.item.label}»
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => attempt(similar.clean)}>
                No, crear «{similar.clean}»
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
