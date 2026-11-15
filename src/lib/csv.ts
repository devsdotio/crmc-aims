function startsWithFormulaTrigger(str: string): boolean {
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i]!;
    if (
      ch === "=" ||
      ch === "+" ||
      ch === "-" ||
      ch === "@" ||
      ch === "\t" ||
      ch === "\r"
    ) {
      return true;
    }
    if (ch.charCodeAt(0) <= 32) continue;
    return false;
  }
  return false;
}

/**
 * Escapes a single CSV field and neutralizes spreadsheet formula injection on
 * string values starting with `=`, `+`, `-`, `@`, tab, or carriage return
 * (even after leading whitespace or control characters).
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (typeof val === "string" && startsWithFormulaTrigger(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}
