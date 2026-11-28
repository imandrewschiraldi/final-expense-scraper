"use client";

import { Modal } from "@/components/ui/Modal";
import { AgentLeadImportForm } from "@/components/agent/AgentLeadImportForm";

// Wraps the existing CSV import flow (file upload -> auto-guessed column
// mapping -> import, with duplicates skipped automatically) in a modal for
// the Contacts page's "Import" button, rather than its old inline toggle.
export function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  return (
    <Modal open onClose={onClose} title="Import Contacts" maxWidthClassName="max-w-xl">
      <AgentLeadImportForm
        onImported={() => {
          onImported();
          onClose();
        }}
      />
    </Modal>
  );
}
