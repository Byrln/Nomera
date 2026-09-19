"use client";
import { createContext, useContext } from "react";
// Embedded previews keep accessible overlays in their own document.
export const PortalHost = createContext<HTMLElement | undefined>(undefined);
export function usePortalHost() {
  return useContext(PortalHost);
}
