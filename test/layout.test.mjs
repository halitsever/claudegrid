import assert from "node:assert/strict";
import { test } from "node:test";
import { autoGrid, cells, describeGrid, parseLayout, paneCount, splitPercent } from "../dist/layout.js";

test("auto grids stay close to square and never leave a column empty", () => {
  const expected = { 1: [1], 2: [1, 1], 3: [2, 1], 4: [2, 2], 5: [2, 2, 1], 6: [2, 2, 2], 7: [3, 2, 2], 9: [3, 3, 3], 16: [4, 4, 4, 4] };
  for (const [count, columns] of Object.entries(expected)) {
    const grid = autoGrid(Number(count));
    assert.deepEqual(grid.columns, columns, `${count} panes`);
    assert.equal(paneCount(grid), Number(count));
  }
});

test("layouts read as COLSxROWS", () => {
  assert.deepEqual(parseLayout("3x2").columns, [2, 2, 2]);
  assert.deepEqual(parseLayout("1x3").columns, [3]);
  assert.deepEqual(parseLayout(" 2 × 2 ").columns, [2, 2]);
  assert.deepEqual(parseLayout("5").columns, [2, 2, 1]);
  assert.equal(describeGrid(parseLayout("3x2")), "3x2");
  assert.equal(describeGrid(parseLayout("5")), "3 columns (2+2+1)");
});

test("bad layouts explain themselves", () => {
  assert.throws(() => parseLayout("big"), /invalid layout "big"/);
  assert.throws(() => parseLayout("0x2"), (error) => /invalid layout/.test(error.message) && /start at 1/.test(error.hint));
  assert.throws(() => parseLayout("5x5"), /more than the maximum of 16/);
});

test("cells come in reading order, skipping short columns", () => {
  const order = cells({ columns: [2, 2, 1] }).map((c) => `${c.col},${c.row}`);
  assert.deepEqual(order, ["0,0", "1,0", "2,0", "0,1", "1,1"]);
});

test("split percentages leave every slot the same size", () => {
  assert.equal(splitPercent(2), 50);
  assert.equal(splitPercent(3), 67);
  assert.equal(splitPercent(4), 75);
});
