import { CliError } from "./ui.js";

export const MAX_PANES = 16;

/** Rows per column, left to right. Columns can differ by one row when the pane count is not a full grid. */
export interface Grid {
  columns: number[];
}

export interface Cell {
  index: number;
  col: number;
  row: number;
}

export function autoGrid(count: number): Grid {
  checkCount(count);
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const columns = Array<number>(cols).fill(rows);
  for (let extra = cols * rows - count, i = cols - 1; extra > 0; extra--, i--) columns[i]!--;
  return { columns };
}

/** Accepts "COLSxROWS" (e.g. "3x2") or a bare pane count (e.g. "5"). */
export function parseLayout(spec: string): Grid {
  const trimmed = spec.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return autoGrid(Number(trimmed));
  const match = /^(\d+)\s*[x×]\s*(\d+)$/.exec(trimmed);
  if (!match) throw new CliError(`invalid layout "${spec}"`, 'use COLSxROWS like "2x2" or "3x1", or a pane count like "6"');
  const cols = Number(match[1]);
  const rows = Number(match[2]);
  if (cols < 1 || rows < 1) throw new CliError(`invalid layout "${spec}"`, "columns and rows start at 1");
  checkCount(cols * rows);
  return { columns: Array<number>(cols).fill(rows) };
}

function checkCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) throw new CliError(`pane count must be a positive whole number, got ${count}`);
  if (count > MAX_PANES) throw new CliError(`${count} panes is more than the maximum of ${MAX_PANES}`, "each pane runs a full Claude Code session");
}

export const paneCount = (grid: Grid) => grid.columns.reduce((a, b) => a + b, 0);

export function describeGrid(grid: Grid): string {
  const rows = Math.max(...grid.columns);
  const even = grid.columns.every((r) => r === rows);
  return even ? `${grid.columns.length}x${rows}` : `${grid.columns.length} columns (${grid.columns.join("+")})`;
}

/** Cells in reading order: left to right, then top to bottom. */
export function cells(grid: Grid): Cell[] {
  const out: Cell[] = [];
  const rows = Math.max(...grid.columns);
  for (let row = 0; row < rows; row++) {
    grid.columns.forEach((height, col) => {
      if (row < height) out.push({ index: out.length, col, row });
    });
  }
  return out;
}

/** Size, in percent of the pane being split, that each new split must take so every slot ends up equal. */
export const splitPercent = (remaining: number) => Math.round(((remaining - 1) / remaining) * 100);
