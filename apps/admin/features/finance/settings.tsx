"use client";
import type { SettingsData } from "@nomera/schemas/finance";
import { Alert, AlertDescription } from "@nomera/ui/components/alert";
import { Badge } from "@nomera/ui/components/badge";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nomera/ui/components/table";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { submitSettings } from "./actions";
import { FormInput } from "./shared";
export function SettingsView({ data }: { data: SettingsData }) {
  const t = useTranslations("Settings"),
    f = useTranslations("Finance"),
    errors = useTranslations("Finance.errors"),
    router = useRouter();
  const [pending, start] = useTransition(),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <section className="admin-page finance-design">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("workspace")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex max-w-xl flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              start(async () => {
                setError(null);
                setSaved(false);
                const result = await submitSettings({
                  name: form.get("name"),
                  previousName: data.name,
                });
                if (!result.ok) {
                  setError(errors(result.code));
                  return;
                }
                setSaved(true);
                router.refresh();
              });
            }}
          >
            <FormInput
              key={data.name}
              name="name"
              label={t("name")}
              defaultValue={data.name}
              maxLength={128}
              required
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {saved && (
              <p role="status" className="text-sm">
                {f("saved")}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? f("saving") : f("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member) => (
                <TableRow key={`${member.email}:${member.role}`}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{t(`roles.${member.role}`)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {t(member.active ? "active" : "inactive")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
