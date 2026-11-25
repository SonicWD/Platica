"use client";

import { useState, type KeyboardEvent } from "react";
import { ConfigPanel } from "./config-panel";
import { MovementsPanel } from "./movements-panel";
import { RegisterPanel } from "./register-panel";
import { SheetsPanel } from "./sheets-panel";
import { useWorld, type View } from "./use-world";

const TABS: [View, string, string][] = [
  ["registrar", "Registrar", "tab-registrar"],
  ["movs", "Movimientos", "tab-movs"],
  ["config", "Cuentas y listas", "tab-config"],
  ["sheets", "Google Sheets", "tab-sheets"],
];

export function PlaticaApp() {
  const { ready, world, api } = useWorld();
  const [focusTick, setFocusTick] = useState(0);
  void focusTick;

  if (!ready) {
    return (
      <main className="wrap">
        <h1>Platica</h1>
        <p role="status">Cargando tus movimientos…</p>
      </main>
    );
  }

  const w = world;
  const active = w.sheet.dests.find((d) => d.id === w.sheet.activeId) ?? null;
  const pending = active ? w.sheet.queue.filter((o) => o.dest === active.id).length : 0;
  const unsynced = active
    ? w.sheet.queue.some((o) => o.dest === active.id && o.type === "bulk")
      ? 0
      : w.records.filter((r) => !active.synced[r.id] && !w.sheet.queue.some((o) => o.dest === active.id && o.id === r.id)).length
    : 0;

  let sync = "Sin destino seleccionado: los movimientos solo quedan en este navegador.";
  if (active) {
    sync = `Destino «${active.name}» (pestaña ${active.tab}). `;
    if (w.sheet.busy) sync += "Enviando…";
    else if (w.sheet.error) sync += `No se pudo enviar: ${w.sheet.error} Quedan ${pending} pendientes; se reintenta cada 30 segundos.`;
    else if (pending) sync += `${pending} envíos pendientes.`;
    else {
      sync += `Al día${w.sheet.lastOk ? ` (último envío ${w.sheet.lastOk}${w.sheet.unconfirmed ? ", sin confirmación de Google: revisa tu hoja" : ""})` : ""}.`;
    }
    if (unsynced) {
      sync += ` ${unsynced} ${unsynced === 1 ? "movimiento guardado aún no está" : "movimientos guardados aún no están"} en esta hoja: usa «Enviar todos los movimientos guardados».`;
    }
  }

  function choose(view: View, moveFocus: boolean) {
    api.setView(view);
    if (!moveFocus) return;
    const heading = view === "registrar" ? "h-reg" : view === "movs" ? "h-movs" : view === "config" ? "h-conf" : "h-sheets";
    requestAnimationFrame(() => document.getElementById(heading)?.focus());
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const order = TABS.map((t) => t[0]);
    const index = order.indexOf(w.view);
    const next =
      event.key === "Home" ? order[0]! : event.key === "End" ? order[order.length - 1]! : event.key === "ArrowRight" ? order[(index + 1) % order.length]! : order[(index - 1 + order.length) % order.length]!;
    choose(next, false);
    setFocusTick((n) => n + 1);
    const id = TABS.find((t) => t[0] === next)?.[2];
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.focus();
    });
  }

  return (
    <main className="wrap">
      <header>
        <h1>Platica</h1>
        <p className="lede">Registra el dinero que ya se movió: una fila por movimiento. No calcula saldos, deudas pendientes ni análisis.</p>
        <p className="notice" role="note">
          Los movimientos y las listas quedan guardados en este navegador. La hoja de Google no se crea sola: conéctala, como hasta ahora, en la pestaña Google Sheets con la URL de tu Apps Script.
        </p>
      </header>

      {w.view === "registrar" ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <label htmlFor="destSel">Destino en Google Sheets</label>
          <select id="destSel" className="input" value={w.sheet.activeId} onChange={(e) => api.setActive(e.target.value)}>
            <option value="">Ninguno (solo en este navegador)</option>
            {w.sheet.dests.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="help" role="status">
            {sync}
          </p>
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Secciones" onKeyDown={onTabKey}>
        {TABS.map(([view, label, id]) => (
          <button
            key={view}
            id={id}
            type="button"
            role="tab"
            aria-selected={w.view === view}
            tabIndex={w.view === view ? 0 : -1}
            onClick={() => choose(view, true)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-labelledby={TABS.find((t) => t[0] === w.view)?.[2]}>
        {w.view === "registrar" ? (
          <RegisterPanel
            db={w.db}
            records={w.records}
            form={w.form}
            editingId={w.editingId}
            attempted={w.attempted}
            phase={w.phase}
            confirmRow={w.confirmRow}
            savedMsg={w.savedMsg}
            onPatch={api.patchForm}
            onReview={api.review}
            onBack={api.back}
            onSave={api.save}
            onReset={api.resetForm}
            onAdd={api.commitList}
          />
        ) : null}
        {w.view === "movs" ? <MovementsPanel records={w.records} onEdit={api.startEdit} onDelete={api.deleteRecord} /> : null}
        {w.view === "config" ? (
          <ConfigPanel db={w.db} accMsg={w.accMsg} onRename={api.renameAccount} onAddAccount={api.addAccount} onRemove={api.removeAccount} onAdd={api.commitList} />
        ) : null}
        {w.view === "sheets" ? (
          <SheetsPanel
            dests={w.sheet.dests}
            activeId={w.sheet.activeId}
            busy={w.sheet.busy}
            queue={w.sheet.queue}
            recordsCount={w.records.length}
            message={w.sheetMsg || sync}
            gsMsg={w.gsMsg}
            syncedCount={(dest) => Object.keys(dest.synced).length}
            onActive={api.setActive}
            onTest={(id) => void api.testDest(id)}
            onRemove={api.removeDest}
            onRetry={api.retry}
            onBulk={api.bulk}
            onAdd={api.addDest}
            onGsMsg={api.setGsMsg}
          />
        ) : null}
      </div>
    </main>
  );
}
