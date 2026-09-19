"use client";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
} from "react";
export const ThemeContext = createContext<{
  theme: string;
  style: CSSProperties;
}>({ theme: "atlas", style: {} });
export function ThemeProvider({
  theme,
  style,
  children,
}: {
  theme: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  return <ThemeContext value={{ theme, style }}>{children}</ThemeContext>;
}
export function useThemeDialog() {
  const value = useContext(ThemeContext);
  return {
    className: `nomera-storefront sf-${value.theme}`,
    style: value.style,
  };
}
