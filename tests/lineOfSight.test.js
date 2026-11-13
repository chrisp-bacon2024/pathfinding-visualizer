// Grid.lineOfSight(from, to), for Theta*.
//
// The line runs from cell centre to cell centre. It is blocked if it
// passes through a wall, or through a grid corner where either side cell
// is a wall (the same no-corner-cutting rule as getNeighbors).

import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../grid.js";
import { getNeighbors, MOVEMENT_MODES } from "../algorithms/helpers.js";

const SYMBOLS = { ".": "grass", "r": "road", "m": "mud", "#": "wall", "S": "start", "E": "end" };

// A real Grid with its terrain taken from `lines`.
function gridFrom(lines) {
    const grid = new Grid(lines.length, lines[0].length, 20);
    lines.forEach((line, row) => {
        [...line].forEach((symbol, col) => { grid.rows[row][col].type = SYMBOLS[symbol]; });
    });
    return grid;
}

const at = (grid, row, col) => grid.rows[row][col];

// Checks both directions agree, then returns the result.
function los(grid, [r1, c1], [r2, c2]) {
    const a = at(grid, r1, c1);
    const b = at(grid, r2, c2);
    const forward = grid.lineOfSight(a, b);
    const backward = grid.lineOfSight(b, a);
    assert.equal(forward, backward, `(${r1},${c1})<->(${r2},${c2}) differs by direction`);
    return forward;
}

// Independent reference using exact integer maths. Coordinates are
// doubled, so cell (r, c) covers [2c, 2c+2] x [2r, 2r+2] and its centre is
// (2c+1, 2r+1). The line is blocked if it touches any wall's closed square:
// touching a square without entering it only happens at a corner, which
// is exactly the corner-cutting case.
function segmentTouchesBox(x1, y1, x2, y2, bx0, by0, bx1, by1) {
    if (Math.max(x1, x2) < bx0 || Math.min(x1, x2) > bx1) return false;
    if (Math.max(y1, y2) < by0 || Math.min(y1, y2) > by1) return false;
    const side = (x, y) => Math.sign((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1));
    const sides = [side(bx0, by0), side(bx1, by0), side(bx0, by1), side(bx1, by1)];
    return !(sides.every(s => s > 0) || sides.every(s => s < 0));
}

function referenceLos(grid, from, to) {
    const x1 = 2 * from.col + 1, y1 = 2 * from.row + 1;
    const x2 = 2 * to.col + 1, y2 = 2 * to.row + 1;
    for (const row of grid.rows) {
        for (const cell of row) {
            if (cell.type !== "wall") continue;
            const bx = 2 * cell.col, by = 2 * cell.row;
            if (segmentTouchesBox(x1, y1, x2, y2, bx, by, bx + 2, by + 2)) return false;
        }
    }
    return true;
}

// Deterministic random numbers (mulberry32).
function rng(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const open = (rows, cols) => Array.from({ length: rows }, () => ".".repeat(cols));

// 1. Clear paths
test("clear paths: horizontal, vertical, 45° and arbitrary angles", () => {
    const grid = gridFrom(open(9, 9));
    const cases = [
        [[4, 0], [4, 8]],   // horizontal
        [[0, 4], [8, 4]],   // vertical
        [[0, 0], [8, 8]],   // 45° down-right
        [[0, 8], [8, 0]],   // 45° down-left
        [[0, 0], [3, 8]],   // shallow
        [[0, 0], [8, 3]],   // steep
        [[8, 0], [5, 8]],   // shallow, negative slope
        [[8, 1], [0, 4]],   // steep, negative slope
        [[1, 2], [7, 5]],   // 2:1 ratio
        [[2, 1], [5, 7]],   // 1:2 ratio
        [[0, 0], [2, 6]],   // 1:3, through exact corners
        [[0, 0], [5, 7]]    // 5:7, through an exact corner
    ];
    for (const [a, b] of cases) assert.equal(los(grid, a, b), true, `${a} -> ${b}`);
});

// 2. Walls in the path
test("a wall on the line blocks it, at every angle", () => {
    const cases = [
        { lines: [".....", "..#..", "....."], a: [1, 0], b: [1, 4] },               // horizontal
        { lines: ["...", "...", ".#.", "...", "..."], a: [0, 1], b: [4, 1] },       // vertical
        { lines: ["....", "....", "..#.", "...."], a: [0, 0], b: [3, 3] },          // 45°
        { lines: ["....", ".#..", "....", "...."], a: [0, 3], b: [3, 0] },          // 45° other way
        { lines: ["........", "...#....", "........"], a: [0, 0], b: [2, 7] },      // shallow
        { lines: ["...", "...", "...", ".#.", "...", "...", "..."], a: [0, 0], b: [6, 2] }, // steep
        { lines: ["........", "....#...", "........"], a: [2, 0], b: [0, 7] }       // negative slope
    ];
    for (const { lines, a, b } of cases) {
        const grid = gridFrom(lines);
        assert.equal(los(grid, a, b), false, lines.join("/"));
        assert.equal(referenceLos(grid, at(grid, ...a), at(grid, ...b)), false, "reference agrees");
    }
});

test("a wall at either end blocks the line", () => {
    const grid = gridFrom(["...#"]);
    assert.equal(grid.lineOfSight(at(grid, 0, 0), at(grid, 0, 3)), false);
    assert.equal(grid.lineOfSight(at(grid, 0, 3), at(grid, 0, 0)), false);
    assert.equal(grid.lineOfSight(at(grid, 0, 3), at(grid, 0, 3)), false);
});

// 3. Corner cutting
test("45° corner cutting: blocked if either side cell is a wall", () => {
    for (const lines of [[".#", ".."], ["..", "#."], [".#", "#."]]) {
        const grid = gridFrom(lines);
        assert.equal(los(grid, [0, 0], [1, 1]), false, lines.join("/"));
    }
    for (const lines of [["#.", ".."], ["..", ".#"]]) {
        const grid = gridFrom(lines);
        assert.equal(los(grid, [0, 1], [1, 0]), false, lines.join("/"));
    }
});

test("corner cutting matches getNeighbors for every single diagonal step", () => {
    // Every 2x2 wall pattern where the two diagonal cells are open.
    for (let mask = 0; mask < 4; mask++) {
        const tr = mask & 1 ? "#" : ".";
        const bl = mask & 2 ? "#" : ".";
        const grid = gridFrom(["." + tr, bl + "."]);
        const diagonalAllowed = getNeighbors(grid, at(grid, 0, 0), MOVEMENT_MODES.EIGHT)
            .some(({ cell }) => cell === at(grid, 1, 1));
        assert.equal(los(grid, [0, 0], [1, 1]), diagonalAllowed, `mask ${mask}`);
    }
});

test("corner cutting at a corner in the middle of a longer line", () => {
    // A centre-to-centre line hits exact corners only when its reduced
    // rows:cols ratio is odd:odd. (0,0) -> (2,6) is 1:3 and passes through
    // the corner between (0,1)/(1,2) (sides (0,2), (1,1)) and the one
    // between (1,4)/(2,5) (sides (1,5), (2,4)).
    assert.equal(los(gridFrom(["..#....", ".......", "......."]), [0, 0], [2, 6]), false);
    assert.equal(los(gridFrom([".......", ".#.....", "......."]), [0, 0], [2, 6]), false);
    assert.equal(los(gridFrom([".......", ".....#.", "......."]), [0, 0], [2, 6]), false);
    assert.equal(los(gridFrom([".......", ".......", "....#.."]), [0, 0], [2, 6]), false);

    // 1:2 never hits a corner, so the same wall is just beside the line.
    assert.equal(los(gridFrom(["..#..", ".....", "....."]), [0, 0], [2, 4]), true);
});

test("corner cutting with an odd:odd slope (9:5), every single-wall placement", () => {
    // (0,0) -> (5,9) passes exactly through the grid corner at the line's
    // midpoint. The exact reference decides which walls block it.
    const rows = 6, cols = 10;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r === 0 && c === 0) || (r === 5 && c === 9)) continue;
            const lines = open(rows, cols).map((line, i) =>
                i === r ? line.slice(0, c) + "#" + line.slice(c + 1) : line);
            const grid = gridFrom(lines);
            const expected = referenceLos(grid, at(grid, 0, 0), at(grid, 5, 9));
            assert.equal(grid.lineOfSight(at(grid, 0, 0), at(grid, 5, 9)), expected,
                `wall at (${r},${c}), line (0,0)->(5,9)`);
            assert.equal(grid.lineOfSight(at(grid, 5, 9), at(grid, 0, 0)), expected,
                `wall at (${r},${c}), line (5,9)->(0,0)`);
        }
    }
});

// 4. Unobstructed corners
test("a line through a corner with open side cells is clear", () => {
    assert.equal(los(gridFrom(["..", ".."]), [0, 0], [1, 1]), true);
    // Walls on the far corners of a 3x3 don't touch the 45° line.
    assert.equal(los(gridFrom(["..#", "...", "#.."]), [0, 0], [2, 2]), true);
});

// 5. Wall near the line
test("walls near but not touching the line don't block it", () => {
    // Shallow line (0,0)->(1,6): crosses rows at x = 3.5, away from walls.
    assert.equal(los(gridFrom(["......#", "#......"]), [0, 0], [1, 5]), true);
    // Walls flanking a straight corridor.
    assert.equal(los(gridFrom(["#####", ".....", "#####"]), [1, 0], [1, 4]), true);
    // Wall right beside a 45° line, not at a corner it crosses.
    assert.equal(los(gridFrom(["...", "...", "#.."]), [0, 0], [2, 2]), true);
});

test("lines passing very close to wall corners", () => {
    // (0,0)->(3,10): slope 3/10. Find every wall placement where the
    // line misses a wall corner by a tiny margin and check against the
    // exact reference.
    const grid = gridFrom(open(4, 11));
    for (const row of grid.rows) {
        for (const cell of row) {
            if ((cell.row === 0 && cell.col === 0) || (cell.row === 3 && cell.col === 10)) continue;
            cell.type = "wall";
            const expected = referenceLos(grid, at(grid, 0, 0), at(grid, 3, 10));
            assert.equal(los(grid, [0, 0], [3, 10]), expected, `wall at (${cell.row},${cell.col})`);
            cell.type = "grass";
        }
    }
});

// 6. Same cell
test("same cell is visible to itself", () => {
    const grid = gridFrom(["r.m"]);
    for (let c = 0; c < 3; c++) assert.equal(grid.lineOfSight(at(grid, 0, c), at(grid, 0, c)), true);
});

// 7 + exhaustive comparison: reverse direction and the exact reference
test("random grids: matches the exact reference and is symmetric", () => {
    const random = rng(12345);
    let checked = 0;
    const mismatches = [];

    for (let g = 0; g < 300; g++) {
        const rows = 2 + Math.floor(random() * 12);
        const cols = 2 + Math.floor(random() * 12);
        const density = random() * 0.35;
        const lines = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => {
                const x = random();
                return x < density ? "#" : x < density + 0.1 ? "m" : x < density + 0.2 ? "r" : ".";
            }).join(""));
        const grid = gridFrom(lines);

        for (let p = 0; p < 40; p++) {
            const a = at(grid, Math.floor(random() * rows), Math.floor(random() * cols));
            const b = at(grid, Math.floor(random() * rows), Math.floor(random() * cols));
            if (a.type === "wall" || b.type === "wall") continue;

            const expected = referenceLos(grid, a, b);
            const forward = grid.lineOfSight(a, b);
            const backward = grid.lineOfSight(b, a);
            checked++;
            if (forward !== expected || backward !== expected) {
                mismatches.push({ lines, from: [a.row, a.col], to: [b.row, b.col], expected, forward, backward });
            }
        }
    }

    assert.ok(checked > 5000);
    assert.deepEqual(mismatches.slice(0, 3), [], `${mismatches.length} mismatches out of ${checked}`);
});

test("every pair on open grids is visible (no false blocks from rounding)", () => {
    const failures = [];
    for (const [rows, cols] of [[16, 16], [7, 30], [30, 7]]) {
        const grid = gridFrom(open(rows, cols));
        const cells = grid.rows.flat();
        for (const a of cells) {
            for (const b of cells) {
                if (!grid.lineOfSight(a, b)) failures.push(`${rows}x${cols}: (${a.row},${a.col})->(${b.row},${b.col})`);
            }
        }
    }
    assert.deepEqual(failures.slice(0, 5), [], `${failures.length} open-grid pairs blocked`);
});

test("every pair, single wall anywhere: exact corners are always caught", () => {
    // One wall at a time on a 9x9 grid, every pair of open cells.
    const size = 9;
    const mismatches = [];
    const grid = gridFrom(open(size, size));
    const cells = grid.rows.flat();

    for (const wall of cells) {
        wall.type = "wall";
        for (const a of cells) {
            if (a === wall) continue;
            for (const b of cells) {
                if (b === wall) continue;
                const expected = referenceLos(grid, a, b);
                if (grid.lineOfSight(a, b) !== expected) {
                    mismatches.push(`wall (${wall.row},${wall.col}): (${a.row},${a.col})->(${b.row},${b.col}) expected ${expected}`);
                }
            }
        }
        wall.type = "grass";
    }
    assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} mismatches`);
});

// 8. Grid boundaries
test("lines along the grid edges and into its corners", () => {
    const grid = gridFrom(open(5, 6));
    assert.equal(los(grid, [0, 0], [0, 5]), true);   // top edge
    assert.equal(los(grid, [4, 0], [4, 5]), true);   // bottom edge
    assert.equal(los(grid, [0, 0], [4, 0]), true);   // left edge
    assert.equal(los(grid, [0, 5], [4, 5]), true);   // right edge
    assert.equal(los(grid, [0, 0], [4, 5]), true);   // corner to corner
    assert.equal(los(grid, [4, 0], [0, 5]), true);

    const walled = gridFrom(["..#...", "......"]);
    assert.equal(los(walled, [0, 0], [0, 5]), false, "wall on the top edge");
    assert.equal(los(walled, [1, 0], [1, 5]), true, "edge row below it is clear");
});

test("out-of-bounds endpoints return false, never throw or hang", () => {
    const grid = gridFrom(open(4, 4));
    const inside = at(grid, 1, 1);
    for (const outside of [
        { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 4, col: 1 }, { row: 1, col: 4 },
        { row: -3, col: -3 }, { row: 10, col: 10 }, { row: 1, col: 1000 }
    ]) {
        assert.equal(grid.lineOfSight(inside, outside), false, JSON.stringify(outside));
        assert.equal(grid.lineOfSight(outside, inside), false, JSON.stringify(outside) + " reversed");
    }
});

test("bad inputs: null cells throw, non-integer and NaN coordinates terminate", () => {
    const grid = gridFrom(open(4, 4));
    const inside = at(grid, 1, 1);
    assert.throws(() => grid.lineOfSight(null, inside), TypeError);
    assert.throws(() => grid.lineOfSight(inside, undefined), TypeError);
    // These must at least return (no infinite loop); the value is not meaningful.
    assert.equal(typeof grid.lineOfSight(inside, { row: 2.5, col: 2 }), "boolean");
    assert.equal(typeof grid.lineOfSight(inside, { row: NaN, col: 2 }), "boolean");
});

// 9. Terrain types
test("grass, mud, road, start and end are all see-through", () => {
    const grid = gridFrom(["S.mrmr.E"]);
    assert.equal(los(grid, [0, 0], [0, 7]), true);
    const diag = gridFrom(["Sm.", "mrm", ".mE"]);
    assert.equal(los(diag, [0, 0], [2, 2]), true);
});

// Side effects
test("never modifies cells, types or search states", () => {
    const grid = gridFrom(["..#..", ".m.r.", "..#..", "r...m"]);
    grid.rows[1][1].searchState = "visited";
    const snapshot = () => JSON.stringify(grid.rows.map(row => row.map(c => [c.row, c.col, c.type, c.searchState])));
    const before = snapshot();
    const cells = grid.rows.flat();
    for (const a of cells) for (const b of cells) grid.lineOfSight(a, b);
    assert.equal(snapshot(), before);
});
