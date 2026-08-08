"use client";

import { createContext, useCallback, useContext, useState } from "react";
import QuickAdd from "./QuickAdd";

// The sheet is opened from two places — the bottom bar's centre control on
// phones, and a button in the top bar on wider screens — so its open state
// lives above both rather than being duplicated.
const AddSheetCtx = createContext<{ open: () => void } | null>(null);

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Which day the sheet writes to, captured from ?d= at the moment it opens.
  // Reading it here rather than in an effect keeps it a plain event-time read,
  // and avoids dragging the whole layout into a Suspense boundary the way
  // useSearchParams would.
  const [viewing, setViewing] = useState<string | null>(null);

  const open = useCallback(() => {
    const d = new URLSearchParams(window.location.search).get("d");
    setViewing(d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
    setIsOpen(true);
  }, []);

  return (
    <AddSheetCtx.Provider value={{ open }}>
      {children}
      <QuickAdd open={isOpen} viewing={viewing} onClose={() => setIsOpen(false)} />
    </AddSheetCtx.Provider>
  );
}

export function useAddSheet() {
  const ctx = useContext(AddSheetCtx);
  if (!ctx) throw new Error("useAddSheet must be used inside AddSheetProvider");
  return ctx;
}
