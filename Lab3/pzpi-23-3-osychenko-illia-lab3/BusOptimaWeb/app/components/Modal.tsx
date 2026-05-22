import type { ReactNode } from "react";

import { Icon } from "@/components/ui";

export function Modal({
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel / Скасувати</button>
          {onSave && (
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              <Icon name="check" /> {saving ? "…" : "Save / Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
