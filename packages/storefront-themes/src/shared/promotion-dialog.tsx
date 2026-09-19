"use client";
import { Button } from "@nomera/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nomera/ui/components/dialog";
import { Input } from "@nomera/ui/components/input";
import { Label } from "@nomera/ui/components/label";
import { useId, useState } from "react";
import { useThemeDialog } from "./theme-context";
export function PromotionDialog({
  title,
  description,
  apply,
  close,
  value = "",
  onApply,
  base,
}: {
  title: string;
  description: string;
  apply: string;
  close: string;
  value?: string;
  onApply?: (code: string) => void;
  base?: string;
}) {
  const id = useId();
  const theme = useThemeDialog();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(value);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setCode(value);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="sf-promotion-trigger">
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent {...theme} closeLabel={close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          action={base ? `${base}/checkout` : undefined}
          onSubmit={
            onApply
              ? (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onApply(code.trim());
                  setOpen(false);
                }
              : undefined
          }
          className="grid gap-4"
        >
          <Label htmlFor={id}>{title}</Label>
          <Input
            id={id}
            name="promotionCode"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={64}
            autoComplete="off"
          />
          <Button type="submit">{apply}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
