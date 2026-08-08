"use client";

import { createContext, useCallback, useContext, useState } from "react";
import QuickAdd from "./QuickAdd";

// The sheet is opened from two places — the bottom bar's centre control on
// phones, and a button in the top bar on wider screens — so its open state
// lives above both rather than being duplicated.
const AddSheetCtx = createContext<{ open: () => void } | null>(null);

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  return (
    <AddSheetCtx.Provider value={{ open }}>
      {children}
      <QuickAdd open={isOpen} onClose={() => setIsOpen(false)} />
    </AddSheetCtx.Provider>
  );
}

export function useAddSheet() {
  const ctx = useContext(AddSheetCtx);
  if (!ctx) throw new Error("useAddSheet must be used inside AddSheetProvider");
  return ctx;
}
