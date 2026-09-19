"use client";

import { Button } from "@nomera/ui/components/button";
import {
  ChartColumn,
  ChartNoAxesCombined,
  MapIcon,
  Tickets,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdminPrimaryNavigation({
  canDashboard,
  variant,
}: {
  canDashboard: boolean;
  variant: "desktop" | "bottom";
}) {
  const path = usePathname();
  const dashboard = useTranslations("Dashboard");
  const tours = useTranslations("Tours");
  const navigation = useTranslations("Navigation");
  const design = useTranslations("AdminDesign");
  const links = [
    ...(canDashboard
      ? [
          {
            href: "/dashboard",
            label: dashboard("title"),
            Icon: ChartNoAxesCombined,
          },
        ]
      : []),
    { href: "/tours", label: tours("title"), Icon: MapIcon },
    { href: "/bookings", label: navigation("bookings"), Icon: Tickets },
    { href: "/customers", label: navigation("customers"), Icon: Users },
    { href: "/reports", label: navigation("reports"), Icon: ChartColumn },
  ];

  return (
    <nav
      className={
        variant === "desktop" ? "dashboard-primary-nav" : "dashboard-bottom-nav"
      }
      aria-label={design("navigation")}
      style={
        variant === "bottom"
          ? { gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {links.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return variant === "bottom" ? (
          <Button
            asChild
            variant="ghost"
            data-active={active || undefined}
            key={href}
          >
            <Link href={href} aria-current={active ? "page" : undefined}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </Button>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            data-active={active || undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
