"use client";

import { useRef, useState } from "react";
import { fmtNum, toCsv, type Saved } from "@/lib/domain";
import { Summary } from "./bits";

export function MovementsPanel({
  records,
  onEdit,
  onDelete,
}: {
  records: Saved[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const detail = useRef<HTMLDialogElement>(null);
  const remove = useRef<HTMLDialogElement>(null);
  const csv = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<Saved | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvMsg, setCsvMsg] = useState("");
  const sorted = records.slice().sort((a, b) => (b.row.fecha + b.row.hora + b.row.registrado).localeCompare(a.row.fecha + a.row.hora + a.row.registrado));

  return (
    <section aria-labelledby="h-movs">
      <div className="toolbar">
        <h2 id="h-movs" tabIndex={-1}>
          Movimientos guardados
        </h2>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!records.length}
          onClick={() => {
            setCsvText(toCsv(records));
            setCsvMsg("");
            csv.current?.showModal();
          }}
        >
          Exportar CSV
        </button>
      </div>
      {!records.length ? (
        <div className="tablewrap">
          <p className="empty">Aún no hay movimientos guardados. Registra el primero en la pestaña Registrar.</p>
        </div>
      ) : (
        <div className="tablewrap">
          <table>
            <caption>
              {records.length === 1 ? "1 movimiento" : `${records.length} movimientos`}. La tabla es un resumen; el CSV incluye todos los campos.
            </caption>
            <thead>
              <tr>
                {["Fecha", "Hora", "Tipo", "Categoría / destino", "Cuenta o medio", "Persona", "Monto", "Monto en COP", "Acciones"].map((h) => (
                  <th key={h} scope="col" className={h.startsWith("Monto") ? "num" : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.row.fecha}</td>
                  <td>{rec.row.hora}</td>
                  <td>{rec.row.tipo}</td>
                  <td>
                    {rec.row.categoria}
                    {rec.row.empresa ? ` · ${rec.row.empresa}` : ""}
                  </td>
                  <td>{rec.row.cuenta}</td>
                  <td>{rec.row.persona || rec.row.quien}</td>
                  <td className="num">
                    {fmtNum(rec.row.monto)} {rec.row.moneda}
                  </td>
                  <td className="num">{fmtNum(rec.row.montoCop)}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label={`Ver movimiento ${rec.id}`}
                        onClick={() => {
                          setCurrent(rec);
                          detail.current?.showModal();
                        }}
                      >
                        Ver
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" aria-label={`Editar movimiento ${rec.id}`} onClick={() => onEdit(rec.id)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        aria-label={`Eliminar movimiento ${rec.id}`}
                        onClick={() => {
                          setCurrent(rec);
                          remove.current?.showModal();
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dialog ref={detail} aria-labelledby="dlg-detail">
        <h2 id="dlg-detail">Detalle del movimiento</h2>
        {current ? <Summary row={current.row} includeId /> : null}
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => detail.current?.close()}>
            Cerrar
          </button>
        </div>
      </dialog>
      <dialog ref={remove} aria-labelledby="dlg-del">
        <h2 id="dlg-del">¿Eliminar este movimiento?</h2>
        {current ? (
          <p>
            {current.row.tipo} del {current.row.fecha} por {fmtNum(current.row.monto)} {current.row.moneda} ({current.id}). Esta acción no se puede deshacer.
          </p>
        ) : null}
        <div className="actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (current) onDelete(current.id);
              remove.current?.close();
            }}
          >
            Eliminar
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => remove.current?.close()}>
            Cancelar
          </button>
        </div>
      </dialog>
      <dialog ref={csv} aria-labelledby="dlg-csv">
        <h2 id="dlg-csv">Exportar CSV</h2>
        <p className="help">Copia el contenido y pégalo en una hoja de cálculo o un archivo de texto (.csv).</p>
        <label htmlFor="csvText">Contenido CSV</label>
        <textarea id="csvText" className="input" readOnly value={csvText} />
        <p className="help" role="status">
          {csvMsg}
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(csvText);
                setCsvMsg("Copiado al portapapeles.");
              } catch {
                setCsvMsg("No se pudo copiar automáticamente. Selecciona el texto y cópialo con Ctrl+C.");
              }
            }}
          >
            Copiar
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => csv.current?.close()}>
            Cerrar
          </button>
        </div>
      </dialog>
    </section>
  );
}
