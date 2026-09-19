/** Quote CSV values and neutralize spreadsheet formula injection from user-entered names. */
export function csvText(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          const safe =
            typeof value === "string" && /^[=+\-@\t\r]/.test(text)
              ? `'${text}`
              : text;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
