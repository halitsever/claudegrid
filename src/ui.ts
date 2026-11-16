const colorOn = (stream: NodeJS.WriteStream) => Boolean(stream.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const paint = (open: number, close: number) => (text: string, stream: NodeJS.WriteStream = process.stdout) =>
  colorOn(stream) ? `\x1b[${open}m${text}\x1b[${close}m` : text;

export const style = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  red: paint(31, 39),
  green: paint(32, 39),
  yellow: paint(33, 39),
  cyan: paint(36, 39),
  brand: (text: string, stream: NodeJS.WriteStream = process.stdout) => (colorOn(stream) ? `\x1b[38;5;209m${text}\x1b[39m` : text),
};

/** An error meant for the user: printed without a stack trace, with an optional hint line. */
export class CliError extends Error {
  constructor(message: string, readonly hint?: string, readonly exitCode = 1) {
    super(message);
  }
}

export function warn(message: string): void {
  process.stderr.write(`${style.yellow("warning", process.stderr)}: ${message}\n`);
}

export function info(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function printError(error: unknown): number {
  if (error instanceof CliError) {
    process.stderr.write(`${style.red("error", process.stderr)}: ${error.message}\n`);
    if (error.hint) process.stderr.write(`${style.dim("hint", process.stderr)}: ${error.hint}\n`);
    return error.exitCode;
  }
  process.stderr.write(`${style.red("error", process.stderr)}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  return 1;
}

export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

export function suggest(input: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = levenshtein(input, c);
    if (score < bestScore) [best, bestScore] = [c, score];
  }
  return best !== undefined && bestScore <= Math.max(2, Math.floor(input.length / 3)) ? best : undefined;
}

export const didYouMean = (input: string, candidates: Iterable<string>) => {
  const s = suggest(input, candidates);
  return s ? `did you mean "${s}"?` : undefined;
};

/** Shortens a path for display by replacing the home directory with ~. */
export function tildify(path: string): string {
  const home = process.env.HOME;
  return home && (path === home || path.startsWith(home + "/")) ? "~" + path.slice(home.length) : path;
}
