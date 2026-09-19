"use client";
import { Button } from "@nomera/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nomera/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@nomera/ui/components/chart";
import { Download, Unplug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { csvText } from "./export";
import { NoRecords } from "./shared";

export function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`admin-panel min-w-0 gap-3 py-4 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="min-w-0 px-4">{children}</CardContent>
    </Card>
  );
}
export function MissingIntegration({ text }: { text: string }) {
  const t = useTranslations("FinanceDesign");
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-4 text-center">
      <Unplug className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{t("notConnected")}</p>
      <p className="max-w-72 text-xs leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
export function AnalyticsBars({
  rows,
  primary,
  secondary,
  money = false,
}: {
  rows: { name: string; value: number; other?: number }[];
  primary: string;
  secondary?: string;
  money?: boolean;
}) {
  const locale = useLocale();
  if (!rows.length)
    return (
      <div className="min-h-56">
        <NoRecords />
      </div>
    );
  const compact = (n: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  return (
    <ChartContainer
      className="h-56 w-full aspect-auto"
      config={{
        value: { label: primary, color: "var(--chart-1)" },
        other: { label: secondary, color: "var(--chart-2)" },
      }}
    >
      <BarChart
        accessibilityLayer
        data={
          money
            ? rows.map((row) => ({
                ...row,
                value: row.value / 100,
                other: row.other === undefined ? undefined : row.other / 100,
              }))
            : rows
        }
        margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          allowDecimals={money}
          tickFormatter={compact}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar
          name={primary}
          dataKey="value"
          fill="var(--color-value)"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
          isAnimationActive={false}
        />
        {secondary && (
          <Bar
            name={secondary}
            dataKey="other"
            fill="var(--color-other)"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          />
        )}
      </BarChart>
    </ChartContainer>
  );
}
export function SourceDonut({
  rows,
}: {
  rows: { name: string; value: number }[];
}) {
  if (!rows.some((r) => r.value)) return <NoRecords />;
  return (
    <>
      <ChartContainer
        className="mx-auto h-40 w-full aspect-auto"
        config={{ value: { label: "", color: "var(--chart-1)" } }}
      >
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={70}
            isAnimationActive={false}
          >
            {rows.map((r, i) => (
              <Cell key={r.name} fill={`var(--chart-${(i % 5) + 1})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--chart-${(i % 5) + 1})` }}
            />
            <span className="flex-1">{r.name}</span>
            <span className="tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
export function CsvExport({
  rows,
  filename,
}: {
  rows: (string | number)[][];
  filename: string;
}) {
  const t = useTranslations("FinanceDesign");
  return (
    <Button
      variant="outline"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob(["\uFEFF", csvText(rows)], {
            type: "text/csv;charset=utf-8",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <Download aria-hidden="true" />
      {t("export")}
    </Button>
  );
}
