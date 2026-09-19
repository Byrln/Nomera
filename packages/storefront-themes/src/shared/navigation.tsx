"use client";
import type { StorefrontInput } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nomera/ui/components/sheet";
import { Menu } from "lucide-react";
import { type ReactNode, useState } from "react";
import { themeTokens } from "../tokens";
import type { StorefrontLabels } from "../types";
export function MobileNavigation({
  data,
  labels,
  children,
}: {
  data: Pick<
    StorefrontInput,
    "theme" | "storeName" | "primaryColor" | "accentColor" | "font"
  >;
  labels: StorefrontLabels;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="sf-menu-trigger"
          aria-label={labels.ui.menu}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        className={`nomera-storefront sf-${data.theme} sf-mobile-sheet`}
        style={themeTokens(data)}
        closeLabel={labels.ui.close}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a[href]")) setOpen(false);
        }}
      >
        <SheetHeader>
          <SheetTitle>{data.storeName}</SheetTitle>
          <SheetDescription>{labels.ui.menu}</SheetDescription>
        </SheetHeader>
        <nav className="sf-mobile-links" aria-label={labels.ui.menu}>
          {children}
        </nav>
        <SheetClose asChild>
          <Button variant="outline">{labels.ui.close}</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
