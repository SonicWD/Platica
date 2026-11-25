"use client";

import { useState } from "react";
import { GS_CODE } from "@/lib/sheet";
import type { Dest } from "@/lib/sheet";

export function SheetsPanel({
  dests,
  activeId,
  busy,
  queue,
  recordsCount,
  message,
  gsMsg,
  syncedCount,
  onActive,
  onTest,
  onRemove,
  onRetry,
  onBulk,
  onAdd,
  onGsMsg,
}: {
  dests: Dest[];
  activeId: string;
  busy: boolean;
  queue: { dest: string }[];
  recordsCount: number;
  message: string;
  gsMsg: string;
  syncedCount: (dest: Dest) => number;
  onActive: (id: string) => void;
  onTest: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: () => void;
  onBulk: () => void;
  onAdd: (input: { name: string; tab: string; url: string; key: string }) => string;
  onGsMsg: (text: string) => void;
}) {
  const [name, setName] = useState("");
  const [tab, setTab] = useState("Movimientos");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const active = dests.find((d) => d.id === activeId) ?? null;
  const pending = active ? queue.filter((o) => o.dest === active.id).length : 0;

  return (
    <section aria-labelledby="h-sheets">
      <h2 id="h-sheets" tabIndex={-1} style={{ marginBottom: 12 }}>
        Integración con Google Sheets
      </h2>
      <div className="card">
        <h3>Destinos guardados</h3>
        <p className="help" style={{ marginBottom: 12 }}>
          Cada persona agrega su propio destino (su hoja de Google) y lo elige como activo. Cada movimiento que guardes, edites o elimines se envía al destino activo. Platica no crea la hoja: tú la conectas con la URL de tu Apps Script.
        </p>
        {!dests.length ? <p className="help">Aún no hay destinos. Agrega el primero abajo.</p> : null}
        {dests.map((dest) => {
          const isActive = dest.id === activeId;
          return (
            <div key={dest.id} className={isActive ? "dest active" : "dest"}>
              <div>
                <strong>
                  {dest.name}
                  {isActive ? " (activo)" : ""}
                </strong>
                <div className="help">
                  Pestaña: {dest.tab} · {dest.url.slice(0, 60)}…
                </div>
              </div>
              <div className="actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={isActive} aria-label={`Usar ${dest.name} como destino activo`} onClick={() => onActive(dest.id)}>
                  Usar como activo
                </button>
                <button type="button" className="btn btn-secondary btn-sm" aria-label={`Probar conexión con ${dest.name}`} onClick={() => onTest(dest.id)}>
                  Probar conexión
                </button>
                <button type="button" className="btn btn-danger btn-sm" aria-label={`Quitar destino ${dest.name}`} onClick={() => onRemove(dest.id)}>
                  Quitar
                </button>
              </div>
            </div>
          );
        })}
        <div className="actions">
          <button type="button" className="btn btn-secondary" disabled={!active || !pending || busy} onClick={onRetry}>
            Reintentar envíos pendientes
          </button>
          <button type="button" className="btn btn-secondary" disabled={!active || !recordsCount || busy} onClick={onBulk}>
            Enviar todos los movimientos guardados
          </button>
        </div>
        <p className="help" role="status">
          {message}
        </p>
        {active ? <p className="help">{syncedCount(active)} movimientos de esta sesión ya figuran como enviados a este destino.</p> : null}
      </div>

      <div className="card">
        <h3>Agregar destino</h3>
        <form
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            const err = onAdd({ name, tab, url, key });
            if (err) {
              setError(err);
              return;
            }
            setError("");
            setName("");
            setUrl("");
            setKey("");
          }}
        >
          <div className="row">
            <div className="field">
              <label htmlFor="dName">Nombre del destino</label>
              <input id="dName" className="input" value={name} maxLength={60} placeholder="Ej.: Mi hoja personal" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="dTab">Nombre de la pestaña</label>
              <input id="dTab" className="input" value={tab} maxLength={60} onChange={(e) => setTab(e.target.value)} />
              <p className="help">Se crea sola si no existe.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dUrl">URL de la aplicación web (termina en /exec)</label>
            <input id="dUrl" className="input" type="url" value={url} placeholder="https://script.google.com/macros/s/.../exec" autoComplete="off" onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="dKey">
              Clave <span className="opt">(opcional)</span>
            </label>
            <input id="dKey" className="input" type="password" value={key} autoComplete="off" onChange={(e) => setKey(e.target.value)} />
            <p className="help">Debe ser igual a la que pongas en el script. Evita que otra persona con la URL escriba en tu hoja.</p>
          </div>
          {error ? (
            <p className="field-error" role="alert">
              Error: {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary">
            Guardar destino
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Cómo conectar tu hoja (una vez por persona)</h3>
        <ol className="steps">
          <li>Abre tu hoja de cálculo en Google Sheets.</li>
          <li>Ve a Extensiones → Apps Script, borra el contenido y pega el código de abajo.</li>
          <li>Si quieres usar clave, escríbela en la línea CLAVE del código.</li>
          <li>Pulsa Implementar → Nueva implementación → Aplicación web. En «Ejecutar como» elige Yo y en «Quién tiene acceso» elige Cualquier persona. Autoriza los permisos.</li>
          <li>Copia la URL que termina en /exec, pégala arriba y pulsa «Guardar destino». Luego usa «Probar conexión».</li>
        </ol>
        <p className="banner err" role="note">
          Seguridad: esta conexión usa una URL pública de escritura. La clave opcional no sustituye el inicio de sesión y puede ser visible para quienes tengan acceso a la app. Para varios usuarios, cada uno debe conectar su propia hoja y no compartir su URL ni su clave.
        </p>
        <p className="help">Cada fila se identifica por el ID del movimiento. Por eso, reenviar nunca crea duplicados.</p>
        <details>
          <summary>Ver código de Apps Script</summary>
          <label htmlFor="gsCode" style={{ display: "block", marginTop: 8 }}>
            Código para pegar en Apps Script
          </label>
          <textarea id="gsCode" className="input" readOnly value={GS_CODE} />
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(GS_CODE);
                  onGsMsg("Código copiado.");
                } catch {
                  onGsMsg("Quedó en el recuadro: cópialo con Ctrl+C.");
                }
              }}
            >
              Copiar código
            </button>
          </div>
          <p className="help" role="status">
            {gsMsg}
          </p>
        </details>
      </div>
    </section>
  );
}
