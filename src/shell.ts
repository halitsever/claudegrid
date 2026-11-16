/** Quotes a string for POSIX shells. Plain words stay unquoted so dry-run output reads naturally. */
export function quote(value: string): string {
  if (value !== "" && /^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export const quoteAll = (argv: readonly string[]) => argv.map(quote).join(" ");
