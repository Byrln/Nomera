"use client";
import {
  dashboardFilterSchema,
  defaultDashboardFilter,
} from "@nomera/schemas/dashboard";
import { Avatar, AvatarFallback } from "@nomera/ui/components/avatar";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nomera/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@nomera/ui/components/field";
import { Input } from "@nomera/ui/components/input";
import { SidebarTrigger, useSidebar } from "@nomera/ui/components/sidebar";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  PanelLeftClose,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { searchWorkspace } from "./admin-header-actions";
import { AdminPrimaryNavigation } from "./admin-navigation";

type Result = {
  id: string;
  kind: "tour" | "customer" | "booking";
  title: string;
  detail: string;
  href: string;
};
export function AdminHeader({
  workspace,
  email,
  pending,
  preferences,
  signOut,
  canDashboard = true,
  variant = "default",
}: {
  workspace: string;
  email: string;
  pending: number | null;
  preferences: ReactNode;
  signOut: ReactNode;
  canDashboard?: boolean;
  variant?: "default" | "dashboard";
}) {
  const t = useTranslations("AdminDesign");
  const locale = useLocale();
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, transition] = useTransition();
  const request = useRef(0);
  const [dateOpen, setDateOpen] = useState(false);
  const defaults = defaultDashboardFilter();
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const [draft, setDraft] = useState({ from, to });
  const [invalid, setInvalid] = useState(false);
  const reporting = [
    "/dashboard",
    "/finance",
    "/marketing",
    "/reports",
  ].includes(path);
  const formatDate = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso)))
      return iso;
    if (locale === "mn") return iso.replaceAll("-", ".");
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso}T12:00:00Z`));
  };
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <header
      className={`admin-topbar${variant === "dashboard" ? " dashboard-topbar" : ""}`}
    >
      {variant === "dashboard" ? (
        <>
          <Link className="dashboard-brand" href="/dashboard">
            <Image
              src="/images/dashboard-mark.svg"
              alt=""
              width={28}
              height={28}
              priority
            />
            <span>NOMERA</span>
          </Link>
          <AdminPrimaryNavigation
            canDashboard={canDashboard}
            variant="desktop"
          />
        </>
      ) : (
        <>
          <div className="admin-mobile-nav">
            <SidebarTrigger label={t("navigation")} />
          </div>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="admin-topbar-search"
                aria-label={t("search")}
              >
                <Search aria-hidden="true" />
                <span>{t("search")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl" closeLabel={t("close")}>
              <DialogHeader>
                <DialogTitle>{t("search")}</DialogTitle>
                <DialogDescription>{t("searchHint")}</DialogDescription>
              </DialogHeader>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const id = ++request.current;
                  setFailed(false);
                  transition(async () => {
                    const response = await searchWorkspace(search);
                    if (id !== request.current) return;
                    if (response.data) setResults(response.data);
                    else {
                      setResults([]);
                      setFailed(true);
                    }
                  });
                }}
              >
                <Input
                  aria-label={t("search")}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setResults([]);
                    request.current++;
                  }}
                  minLength={2}
                  maxLength={120}
                  required
                  type="search"
                  placeholder={t("search")}
                />
                <Button disabled={busy} type="submit">
                  {t(busy ? "searching" : "find")}
                </Button>
              </form>
              <div className="admin-search-results" aria-live="polite">
                {failed ? (
                  <p className="text-destructive">{t("searchError")}</p>
                ) : results.length ? (
                  results.map((result) => (
                    <Button
                      asChild
                      variant="ghost"
                      key={`${result.kind}-${result.id}`}
                      onClick={() => setSearchOpen(false)}
                    >
                      <Link href={result.href}>
                        <span>
                          <strong>{result.title}</strong>
                          <small>
                            {t(`kind.${result.kind}`)} · {result.detail}
                          </small>
                        </span>
                      </Link>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("searchEmpty")}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      <div className="admin-topbar-tools">
        {variant === "default" && reporting && (
          <Dialog
            open={dateOpen}
            onOpenChange={(open) => {
              if (open) {
                setDraft({ from, to });
                setInvalid(false);
              }
              setDateOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="admin-date-button"
                aria-label={t("dateRange")}
              >
                <CalendarDays aria-hidden="true" />
                <span>
                  {formatDate(from)} – {formatDate(to)}
                </span>
                <ChevronDown aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent closeLabel={t("close")}>
              <DialogHeader>
                <DialogTitle>{t("dateRange")}</DialogTitle>
                <DialogDescription>{t("dateHint")}</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const parsed = dashboardFilterSchema.safeParse({
                    from: form.get("from"),
                    to: form.get("to"),
                    currency: params.get("currency") ?? "MNT",
                  });
                  setInvalid(!parsed.success);
                  if (parsed.success) {
                    const query = new URLSearchParams(params.toString());
                    query.set("from", parsed.data.from);
                    query.set("to", parsed.data.to);
                    router.push(`${path}?${query}`);
                    setDateOpen(false);
                  }
                }}
              >
                <Field>
                  <FieldLabel htmlFor="admin-date-from">{t("from")}</FieldLabel>
                  <Input
                    id="admin-date-from"
                    name="from"
                    type="date"
                    value={draft.from}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-date-to">{t("to")}</FieldLabel>
                  <Input
                    id="admin-date-to"
                    name="to"
                    type="date"
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                    required
                  />
                </Field>
                {invalid && <FieldError>{t("dateInvalid")}</FieldError>}
                <Button type="submit">{t("apply")}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="admin-notification"
              aria-label={t("notifications")}
            >
              <Bell aria-hidden="true" />
              {pending !== null && pending > 0 && (
                <span className="admin-notification-dot" />
              )}
            </Button>
          </DialogTrigger>
          <DialogContent closeLabel={t("close")}>
            <DialogHeader>
              <DialogTitle>{t("notifications")}</DialogTitle>
              <DialogDescription>
                {pending === null
                  ? t("searchError")
                  : t("pending", { count: pending })}
              </DialogDescription>
            </DialogHeader>
            <Button asChild variant="outline">
              <Link href="/bookings?status=pending">{t("reviewBookings")}</Link>
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="admin-account"
              aria-label={t("account")}
            >
              <Avatar className="admin-account-avatar">
                <AvatarFallback>
                  {(email || workspace).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="admin-account-copy">
                <strong>{email || workspace}</strong>
                <small>{workspace}</small>
              </span>
              <ChevronDown aria-hidden="true" className="max-md:hidden" />
            </Button>
          </DialogTrigger>
          <DialogContent closeLabel={t("close")}>
            <DialogHeader>
              <DialogTitle>{t("account")}</DialogTitle>
              <DialogDescription>
                {email}
                <br />
                {workspace}
              </DialogDescription>
            </DialogHeader>
            <Button asChild variant="outline">
              <Link href="/workspaces">
                <Building2 aria-hidden="true" />
                {t("switchWorkspace")}
              </Link>
            </Button>
            {preferences}
            {signOut}
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
export function AdminCollapse() {
  const { toggleSidebar, state } = useSidebar();
  const t = useTranslations("AdminDesign");
  return (
    <Button
      variant="ghost"
      onClick={toggleSidebar}
      aria-label={t(state === "expanded" ? "collapse" : "expand")}
    >
      <PanelLeftClose aria-hidden="true" />
      <span className="admin-collapse-label">
        {t(state === "expanded" ? "collapse" : "expand")}
      </span>
    </Button>
  );
}
