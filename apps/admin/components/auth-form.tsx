"use client";
import { resetRealtimeSession } from "@nomera/postgres/realtime";
import { loginCredentialsSchema } from "@nomera/schemas/auth";
import { Button, Input } from "@nomera/ui";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { signIn } from "@/app/sign-in/actions";

export function AuthForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(signIn, {});
  const [visible, setVisible] = useState(false);
  // Controlled values survive React's automatic form reset after an error result.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const queryClient = useQueryClient();
  return (
    <form
      action={action}
      className="auth-form"
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const emailValid = loginCredentialsSchema.shape.email.safeParse(
          data.get("email"),
        ).success;
        const passwordValid = loginCredentialsSchema.shape.password.safeParse(
          data.get("password"),
        ).success;
        setEmailError(!emailValid);
        setPasswordError(!passwordValid);
        if (!emailValid || !passwordValid) {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem(
            !emailValid ? "email" : "password",
          );
          if (input instanceof HTMLInputElement) input.focus();
          return;
        }
        queryClient.clear();
        void resetRealtimeSession();
      }}
      aria-busy={pending}
    >
      <div className="auth-field">
        <label htmlFor="email">{t("email")}</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          value={email}
          readOnly={pending}
          placeholder={t("emailPlaceholder")}
          aria-invalid={emailError}
          aria-describedby={emailError ? "email-error" : undefined}
          onBlur={(event) => {
            if (event.currentTarget.value)
              setEmailError(
                !loginCredentialsSchema.shape.email.safeParse(
                  event.currentTarget.value,
                ).success,
              );
          }}
          onChange={(event) => {
            setEmail(event.currentTarget.value);
            setEmailError(false);
          }}
        />
        {emailError && (
          <p id="email-error" className="auth-error">
            {t("invalidEmail")}
          </p>
        )}
      </div>
      <div className="auth-field">
        <label htmlFor="password">{t("password")}</label>
        <div className="auth-password">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={256}
            value={password}
            readOnly={pending}
            aria-invalid={passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
            onChange={(event) => {
              setPassword(event.currentTarget.value);
              setPasswordError(false);
            }}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setVisible(!visible)}
            aria-label={t(visible ? "hidePassword" : "showPassword")}
            aria-pressed={visible}
          >
            {visible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" className="auth-error">
            {t("invalidPassword")}
          </p>
        )}
      </div>
      {state.error && (
        <p role="alert" className="auth-error">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {t(pending ? "signingIn" : "signIn")}
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </form>
  );
}
