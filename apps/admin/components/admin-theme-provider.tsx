"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";
type AdminThemeContextValue = {
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "nomera-admin-theme";
const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const theme: Theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : getSystemTheme();
    setResolvedTheme(theme);
    applyTheme(theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        const nextTheme = getSystemTheme();
        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
      }
    };
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, theme);
    setResolvedTheme(theme);
    applyTheme(theme);
  }, []);

  const value = useMemo(
    () => ({ resolvedTheme, setTheme }),
    [resolvedTheme, setTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider.");
  }
  return context;
}
