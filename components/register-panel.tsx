"use client";

import { useEffect, useState } from "react";
import {
  FIELD_KEYS,
  TYPES,
  TYPE_ORDER,
  copOf,
  fieldHint,
  fieldLabel,
  fieldOptions,
  fmtNum,
  franja,
  fromScaled,
  isVisible,
  kindMax,
  NOTE_MAX,
  newInputLabel,
  newKind,
  newLabel,
  tidyDecimal,
  todayStr,
  tryAdd,
  validate,
  type DB,
  type FieldKey,
  type FormState,
  type Kind,
  type Opt,
  type Row,
  type Saved,
} from "@/lib/domain";
import { ErrorText, Summary } from "./bits";

type AddFn = (kind: Kind, clean: string) => Opt;

export function RegisterPanel({
  db,
  records,
  form,
  editingId,
  attempted,
  phase,
  confirmRow,
  savedMsg,
  onPatch,
  onReview,
  onBack,
  onSave,
  onReset,
  onAdd,
}: {
  db: DB;
  records: Saved[];
  form: FormState;
  editingId: string | null;
  attempted: boolean;
  phase: "form" | "confirm";
  confirmRow: Row | null;
  savedMsg: string;
  onPatch: (partial: Partial<FormState>) => void;
  onReview: () => void;
  onBack: () => void;
  onSave: () => void;
  onReset: () => void;
  onAdd: AddFn;
}) {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const refresh = () => setToday(todayStr());
    refresh();
    const id = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const errs = attempted ? validate(form, db, records) : {};
  if (!attempted && (form.type === "transf" || form.type === "ahorro") && form.account && form.cat && form.account === form.cat) {
    errs.account = "La cuenta de origen no puede ser la misma que la de destino.";
    errs.cat = "El destino no puede ser la misma cuenta de origen.";
  }
  const count = Object.keys(errs).length;
  const cop = copOf(form);
  const showMoney = !!form.type;

  if (phase === "confirm" && confirmRow) {
    return (
      <section className="card" aria-labelledby="h-confirm">
        <h2 id="h-confirm" tabIndex={-1}>
          Confirma el movimiento
        </h2>
        <p className="help">Revisa el resumen. Si algo no está bien, vuelve a corregirlo.</p>
        <Summary row={confirmRow} includeId={!!confirmRow.id} />
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onSave}>
            Guardar movimiento
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Corregir
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="h-reg">
      {savedMsg ? (
        <p className="banner ok" role="status">
          {savedMsg}
        </p>
      ) : null}
      {editingId ? (
        <p className="banner info">
          Estás editando el movimiento {editingId}. Si alguna respuesta ya no es válida, tendrás que elegirla de nuevo.
        </p>
      ) : null}
      <h2 id="h-reg" tabIndex={-1}>
        {editingId ? "Editar movimiento" : "Nuevo movimiento"}
      </h2>
      <p className="help" style={{ marginBottom: 16 }}>
        Las preguntas aparecen según el tipo de movimiento que elijas.
      </p>
      {attempted && count > 0 ? (
        <p className="banner err" role="alert">
          {count === 1 ? "Hay 1 respuesta por corregir antes de continuar." : `Hay ${count} respuestas por corregir antes de continuar.`}
        </p>
      ) : null}
      <form
        aria-labelledby="h-reg"
        onSubmit={(e) => {
          e.preventDefault();
          onReview();
        }}
      >
        <div className="row">
          <div className="field">
            <label htmlFor="f-date">Fecha del movimiento</label>
            <input
              id="f-date"
              className="input"
              type="date"
              max={today}
              value={form.date}
              aria-invalid={errs.date ? true : undefined}
              aria-describedby="e-date"
              onFocus={() => setToday(todayStr())}
              onChange={(e) => onPatch({ date: e.target.value })}
            />
            <p className="help">No se permiten fechas futuras. Hora de este dispositivo.</p>
            <ErrorText id="e-date">{errs.date}</ErrorText>
          </div>
          <div className="field">
            <label htmlFor="f-time">Hora</label>
            <input
              id="f-time"
              className="input"
              type="time"
              step={1}
              value={form.time}
              aria-invalid={errs.time ? true : undefined}
              aria-describedby="e-time"
              onChange={(e) => onPatch({ time: e.target.value })}
            />
            {form.time ? <span className="derived">Franja del día: {franja(form.time)}</span> : null}
            <ErrorText id="e-time">{errs.time}</ErrorText>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-type">Tipo de movimiento</label>
          <select
            id="f-type"
            className="input"
            value={form.type}
            aria-invalid={errs.type ? true : undefined}
            aria-describedby="e-type"
            onChange={(e) => onPatch({ type: e.target.value as FormState["type"] })}
          >
            <option value="">Selecciona…</option>
            {TYPE_ORDER.map((k) => (
              <option key={k} value={k}>
                {TYPES[k]}
              </option>
            ))}
          </select>
          <ErrorText id="e-type">{errs.type}</ErrorText>
        </div>

        {FIELD_KEYS.filter((key) => key !== "currency").map((key) =>
          isVisible(form, key) ? (
            <Picker
              key={key}
              field={key}
              db={db}
              records={records}
              form={form}
              error={errs[key]}
              onPatch={onPatch}
              onAdd={onAdd}
            />
          ) : null,
        )}

        {showMoney ? (
          <>
            <div className="row">
              <div className="field">
                <label htmlFor="f-amount">Monto</label>
                <input
                  id="f-amount"
                  className="input"
                  inputMode="decimal"
                  value={form.amount}
                  aria-invalid={errs.amount ? true : undefined}
                  aria-describedby="e-amount"
                  onChange={(e) => onPatch({ amount: tidyDecimal(e.target.value) })}
                />
                <p className="help">Mayor que cero, hasta 2 decimales. Máximo 9.999.999.999,99.</p>
                <ErrorText id="e-amount">{errs.amount}</ErrorText>
              </div>
              <Picker field="currency" db={db} records={records} form={form} error={errs.currency} onPatch={onPatch} onAdd={onAdd} />
            </div>
            {form.currency !== "COP" ? (
              <div className="field">
                <label htmlFor="f-rate">¿Cuánto es la tasa de cambio?</label>
                <input
                  id="f-rate"
                  className="input"
                  inputMode="decimal"
                  value={form.rate}
                  aria-invalid={errs.rate ? true : undefined}
                  aria-describedby="e-rate"
                  onChange={(e) => onPatch({ rate: tidyDecimal(e.target.value) })}
                />
                <p className="help">Pesos colombianos (COP) por 1 unidad de la moneda. Hasta 4 decimales.</p>
                <ErrorText id="e-rate">{errs.rate}</ErrorText>
              </div>
            ) : null}
            <p className="help" role="status">
              {form.currency === "COP"
                ? cop != null
                  ? `Monto en COP: ${fmtNum(fromScaled(cop, 2, false))} (tasa 1)`
                  : ""
                : cop != null
                  ? `Monto en COP = monto × tasa = ${fmtNum(fromScaled(cop, 2, false))} COP`
                  : "Escribe el monto y la tasa para calcular el monto en COP."}
            </p>
          </>
        ) : null}

        {form.type === "gasto" ? (
          <>
            <fieldset className="field" id="f-need" tabIndex={-1} aria-describedby="e-need">
              <legend>¿Podrías vivir sin esto 3 meses?</legend>
              <div className="radios">
                {(
                  [
                    ["si", "Sí"],
                    ["no", "No"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input type="radio" name="need" value={value} checked={form.need === value} onChange={() => onPatch({ need: value })} />
                    {label}
                  </label>
                ))}
              </div>
              {form.need ? <span className="derived">Se guardará como: {form.need === "si" ? "Deseo" : "Necesidad"}</span> : null}
              <ErrorText id="e-need">{errs.need}</ErrorText>
            </fieldset>
            <fieldset className="field" id="f-fixvar" tabIndex={-1} aria-describedby="e-fixvar">
              <legend>Fijo o variable</legend>
              <div className="radios">
                {(
                  [
                    ["fijo", "Fijo"],
                    ["variable", "Variable"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="fixvar"
                      value={value}
                      checked={form.fixvar === value}
                      onChange={() => onPatch({ fixvar: value })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <ErrorText id="e-fixvar">{errs.fixvar}</ErrorText>
            </fieldset>
          </>
        ) : null}

        {showMoney ? (
          <div className="field">
            <label htmlFor="f-note">
              Nota <span className="opt">(opcional)</span>
            </label>
            <input
              id="f-note"
              className="input"
              maxLength={NOTE_MAX}
              value={form.note}
              aria-invalid={errs.note ? true : undefined}
              aria-describedby="e-note"
              onChange={(e) => onPatch({ note: e.target.value })}
            />
            <p className="help">
              {form.note.length} / {NOTE_MAX} caracteres
            </p>
            <ErrorText id="e-note">{errs.note}</ErrorText>
          </div>
        ) : null}

        {showMoney ? (
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Revisar y confirmar
            </button>
            {editingId ? (
              <button type="button" className="btn btn-secondary" onClick={onReset}>
                Cancelar edición
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onReset}>
                Limpiar formulario
              </button>
            )}
          </div>
        ) : null}
      </form>
    </section>
  );
}

function Picker({
  field,
  db,
  records,
  form,
  error,
  onPatch,
  onAdd,
}: {
  field: FieldKey;
  db: DB;
  records: Saved[];
  form: FormState;
  error?: string;
  onPatch: (partial: Partial<FormState>) => void;
  onAdd: AddFn;
}) {
  const kind = newKind(form, field);
  const options = fieldOptions(db, records, form, field);
  const hint = field === "cat" || field === "account" ? fieldHint(form) : "";
  const value = form[field];

  return (
    <div className="field">
      <label htmlFor={`f-${field}`}>{fieldLabel(form, field)}</label>
      <select
        id={`f-${field}`}
        className="input"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`e-${field}`}
        onChange={(e) => onPatch({ [field]: e.target.value })}
      >
        {field !== "currency" ? <option value="">Selecciona…</option> : null}
        <Grouped options={options} />
        {kind ? <option value="__new__">{newLabel(form, field)}</option> : null}
      </select>
      {hint ? <p className="help">{hint}</p> : null}
      {kind && value === "__new__" ? (
        <AddBox
          kind={kind}
          label={newInputLabel(form, field)}
          db={db}
          onCreate={(clean) => {
            const item = onAdd(kind, clean);
            onPatch({ [field]: item.value });
          }}
          onPick={(item) => onPatch({ [field]: item.value })}
        />
      ) : null}
      <ErrorText id={`e-${field}`}>{error}</ErrorText>
    </div>
  );
}

function Grouped({ options }: { options: Opt[] }) {
  const loose: Opt[] = [];
  const groups = new Map<string, Opt[]>();
  for (const opt of options) {
    if (!opt.group) loose.push(opt);
    else {
      const list = groups.get(opt.group) ?? [];
      list.push(opt);
      groups.set(opt.group, list);
    }
  }
  return (
    <>
      {loose.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {[...groups.entries()].map(([label, opts]) => (
        <optgroup key={label} label={label}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function AddBox({
  kind,
  label,
  db,
  onCreate,
  onPick,
}: {
  kind: Kind;
  label: string;
  db: DB;
  onCreate: (clean: string) => void;
  onPick: (item: Opt) => void;
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [similar, setSimilar] = useState<{ item: Opt; clean: string } | null>(null);
  const id = `add-${kind}-${label}`;

  function attempt() {
    const result = tryAdd(db, kind, text);
    setSimilar(null);
    if (result.status === "empty") return setMsg("Escribe un nombre.");
    if (result.status === "reserved") return setMsg("«Otro» no puede ser el nombre de una categoría. Escribe un nombre específico.");
    if (result.status === "exists") {
      setText("");
      setMsg(`Ya existía «${result.item.label}»; se seleccionó la existente.`);
      onPick(result.item);
      return;
    }
    if (result.status === "similar") {
      setMsg("");
      setSimilar({ item: result.item, clean: result.clean });
      return;
    }
    setText("");
    setMsg(`Se creó «${result.clean}».`);
    onCreate(result.clean);
  }

  return (
    <div className="newbox">
      <label htmlFor={id}>{label}</label>
      <div className="inline">
        <input
          id={id}
          className="input"
          value={text}
          maxLength={kindMax(kind)}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            attempt();
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={attempt}>
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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSimilar(null);
                setText("");
                setMsg(`Se seleccionó «${similar.item.label}».`);
                onPick(similar.item);
              }}
            >
              Sí, usar «{similar.item.label}»
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const clean = similar.clean;
                setSimilar(null);
                setText("");
                setMsg(`Se creó «${clean}».`);
                onCreate(clean);
              }}
            >
              No, crear «{similar.clean}»
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
