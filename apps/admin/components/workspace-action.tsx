"use client";
import { resetRealtimeSession } from "@nomera/postgres/realtime";
import { Button } from "@nomera/ui";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { selectWorkspace, signOut } from "@/app/sign-in/actions";

export function WorkspaceAction({
  workspace,
}: {
  workspace?: { id: string; name: string; roles: readonly string[] };
}) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(
    workspace ? selectWorkspace : signOut,
    {},
  );
  const cache = useQueryClient();
  return (
    <form
      action={action}
      onSubmit={() => {
        cache.clear();
        void resetRealtimeSession();
      }}
      aria-busy={pending}
    >
      {workspace ? (
        <>
          <input type="hidden" name="tenantId" value={workspace.id} />
          <button className="workspace-option" type="submit" disabled={pending}>
            <span>
              <strong>{workspace.name}</strong>
              <small>
                {pending
                  ? t("selecting")
                  : workspace.roles
                      .map((role) => t(`roles.${role}`))
                      .join(" · ")}
              </small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : (
        <Button type="submit" variant="outline" disabled={pending}>
          <LogOut aria-hidden="true" />
          {t(pending ? "signingOut" : "signOut")}
        </Button>
      )}
      {state.error && (
        <p className="auth-error" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
