import type { ReactNode } from "react";
import type { Row } from "@/lib/domain";
import { summaryPairs } from "@/lib/domain";

export function Summary({ row, includeId }: { row: Row; includeId: boolean }) {
  const pairs = summaryPairs(row, includeId);
  return (
    <dl className="summary">
      {pairs.map(([label, value]) => (
        <span key={label} style={{ display: "contents" }}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </span>
      ))}
    </dl>
  );
}

export function ErrorText({ id, children }: { id: string; children?: string }) {
  return (
    <p className="field-error" id={id} role="alert">
      {children ? `Error: ${children}` : ""}
    </p>
  );
}

export function PanelHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} tabIndex={-1} style={{ marginBottom: 8 }}>
      {children}
    </h2>
  );
}
