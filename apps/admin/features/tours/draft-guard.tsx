"use client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@nomera/ui/components/alert";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nomera/ui/components/dialog";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { readStoredTourDraft, type StoredTourDraft } from "./draft";

export function useTourDraftGuard({
  storageKey,
  draft,
  dirty,
  canEdit,
  pending,
  restore,
}: {
  storageKey: string;
  draft: StoredTourDraft;
  dirty: boolean;
  canEdit: boolean;
  pending: boolean;
  restore: (draft: StoredTourDraft) => void;
}) {
  const t = useTranslations("Tours");
  const router = useRouter();
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<StoredTourDraft | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);
  const recovering = useRef(false);
  const serialized = JSON.stringify(draft);
  useEffect(() => {
    if (!canEdit || loaded.current === storageKey) return;
    loaded.current = storageKey;
    try {
      const raw = sessionStorage.getItem(storageKey);
      const saved = raw ? readStoredTourDraft(raw) : null;
      if (saved && JSON.stringify(saved) !== serialized) {
        recovering.current = true;
        setRecovery(saved);
      }
    } catch {
      setUnavailable(true);
    } finally {
      setLoadedKey(storageKey);
    }
  }, [storageKey, serialized, canEdit]);
  useEffect(() => {
    if (!canEdit || loaded.current !== storageKey || recovering.current) return;
    try {
      if (dirty) sessionStorage.setItem(storageKey, serialized);
      else sessionStorage.removeItem(storageKey);
    } catch {
      setUnavailable(true);
    }
  }, [storageKey, serialized, dirty, canEdit]);
  useEffect(() => {
    if (!dirty) return;
    function capture(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (pending) return;
      setLeaveHref(`${url.pathname}${url.search}${url.hash}`);
    }
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, [dirty, pending]);
  function clearDraft() {
    recovering.current = false;
    setRecovery(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Local storage availability never controls server saving. */
    }
  }
  return {
    recoveryPending: canEdit && (loadedKey !== storageKey || recovery !== null),
    clearDraft,
    recoveryNotice: (
      <>
        {recovery && (
          <Alert>
            <AlertTitle>{t("draftAvailable")}</AlertTitle>
            <AlertDescription>
              <p>
                {t(
                  recovery.version === draft.version
                    ? "draftAvailableDescription"
                    : "staleDraftDescription",
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const saved = recovery;
                    clearDraft();
                    restore(saved);
                  }}
                >
                  {t("restoreDraft")}
                </Button>
                <Button type="button" variant="ghost" onClick={clearDraft}>
                  {t("discardDraft")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {unavailable && dirty && (
          <Alert>
            <AlertDescription>{t("draftUnavailable")}</AlertDescription>
          </Alert>
        )}
      </>
    ),
    navigationDialog: (
      <Dialog
        open={leaveHref !== null}
        onOpenChange={(open) => {
          if (!open) setLeaveHref(null);
        }}
      >
        <DialogContent closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("discardTitle")}</DialogTitle>
            <DialogDescription>{t("discardDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaveHref(null)}
            >
              {t("keepEditing")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!leaveHref) return;
                const href = leaveHref;
                clearDraft();
                setLeaveHref(null);
                router.push(href);
              }}
            >
              {t("leaveWithoutSaving")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  };
}
