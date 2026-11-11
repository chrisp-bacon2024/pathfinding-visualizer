import { test } from "node:test";
import assert from "node:assert/strict";

import { PathOverlay, offsetPolyline } from "../pathOverlay.js";
import { algorithmColors } from "../cellStyles.js";
import { ALGORITHMS, buildGrid } from "./fixtures.js";
import { EPSILON, MODES } from "./testUtils.js";

const ORDER = ["dfs", "bfs", "dijkstra", "astar", "greedy",
    "bidirectionalbfs", "jps", "bellmanford", "thetastar"];
const CELL = 25;

const near = (a, b) => Math.abs(a - b) < EPSILON;

// Distance from point p to the infinite line through a and b.
function distanceToLine(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / Math.hypot(dx, dy);
}

// Fake 2D canvas that records every stroked polyline and its colour.
function fakeCanvas() {
    let current = null;
    const ctx = {
        strokes: [],
        strokeStyle: "",
        lineWidth: 1,
        save() {}, restore() {},
        clearRect() { this.strokes = []; },
        beginPath() { current = []; },
        moveTo(x, y) { current.push({ x, y }); },
        lineTo(x, y) { current.push({ x, y }); },
        stroke() { this.strokes.push({ color: this.strokeStyle, width: this.lineWidth, points: current }); }
    };
    return { width: 500, height: 500, getContext: () => ctx, ctx };
}

function makeOverlay() {
    const canvas = fakeCanvas();
    const changes = [];
    const overlay = new PathOverlay(canvas, {
        cellSize: CELL,
        order: ORDER,
        colors: algorithmColors,
        onChange: names => changes.push(names)
    });
    return { overlay, ctx: canvas.ctx, changes };
}

// Coloured strokes only (outlines are drawn first in a dark colour).
const colouredLines = ctx =>
    ctx.strokes.filter(({ color }) => Object.values(algorithmColors).includes(color));

const centre = cell => ({ x: (cell.col + 0.5) * CELL, y: (cell.row + 0.5) * CELL });

// Steps for a search that visits a few cells, then draws `pathCells`.
const stepsFor = (grid, pathCells) => [
    { cell: grid.rows[0][1], state: "frontier" },
    { cell: grid.rows[0][1], state: "visited" },
    ...pathCells.map(([row, col]) => ({ cell: grid.rows[row][col], state: "path" }))
];

test("offsetPolyline: zero offset returns the same points", () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    assert.deepEqual(offsetPolyline(points, 0), points);
});

test("offsetPolyline: every segment stays parallel at exactly the offset", () => {
    const shapes = {
        straight: [{ x: 0, y: 0 }, { x: 50, y: 0 }],
        lTurn: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }],
        staircase: [{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 25 }, { x: 50, y: 25 }],
        diagonal: [{ x: 0, y: 0 }, { x: 25, y: 25 }, { x: 50, y: 50 }],
        diagonalThenStraight: [{ x: 0, y: 0 }, { x: 25, y: 25 }, { x: 75, y: 25 }]
    };

    for (const [name, points] of Object.entries(shapes)) {
        for (const offset of [-6, -2.5, 3, 6]) {
            const shifted = offsetPolyline(points, offset);
            assert.equal(shifted.length, points.length, name);

            for (let i = 0; i < points.length - 1; i++) {
                // Both ends of each shifted segment lie `offset` away
                // from the original segment's line...
                for (const p of [shifted[i], shifted[i + 1]]) {
                    assert.ok(near(distanceToLine(p, points[i], points[i + 1]), Math.abs(offset)),
                        `${name} segment ${i}, offset ${offset}`);
                }

                // ...and the shifted segment points the same way.
                const original = { x: points[i + 1].x - points[i].x, y: points[i + 1].y - points[i].y };
                const moved = { x: shifted[i + 1].x - shifted[i].x, y: shifted[i + 1].y - shifted[i].y };
                assert.ok(near(original.x * moved.y - original.y * moved.x, 0), `${name} segment ${i} parallel`);
                assert.ok(original.x * moved.x + original.y * moved.y > 0, `${name} segment ${i} same direction`);
            }
        }
    }
});

test("offsetPolyline: positive offsets go to the left of travel", () => {
    // Travelling right (+x) on a canvas, left is up (−y).
    const [a] = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 4);
    assert.deepEqual(a, { x: 0, y: -4 });
});

test("a single run draws one centred line from start to end, growing with playback", () => {
    const grid = buildGrid(["S...", "....", "...E"]);
    const { overlay, ctx, changes } = makeOverlay();
    const path = [[0, 1], [0, 2], [0, 3], [1, 3]];
    const steps = stepsFor(grid, path);

    overlay.startRun("astar", steps, grid.start, grid.end);
    assert.deepEqual(changes.at(-1), ["astar"]);
    assert.deepEqual(colouredLines(ctx), [], "nothing drawn before any path step");

    // After the first path step: start -> first path cell.
    overlay.setProgress(3);
    let [line] = colouredLines(ctx);
    assert.equal(line.color, algorithmColors.astar);
    assert.deepEqual(line.points, [centre(grid.start), centre(grid.rows[0][1])]);

    // All steps applied: start, the whole path, then end. Centred, no offset.
    overlay.setProgress(steps.length);
    [line] = colouredLines(ctx);
    assert.deepEqual(line.points, [
        centre(grid.start),
        ...path.map(([r, c]) => centre(grid.rows[r][c])),
        centre(grid.end)
    ]);

    // Scrubbing back shrinks the line again.
    overlay.setProgress(4);
    assert.equal(colouredLines(ctx)[0].points.length, 3);
});

test("earlier paths are kept in full, re-runs replace, clear() removes everything", () => {
    const grid = buildGrid(["S...", "....", "...E"]);
    const { overlay, ctx, changes } = makeOverlay();

    // A* is still paused part-way when BFS starts: A*'s whole path is kept.
    overlay.startRun("astar", stepsFor(grid, [[0, 1], [0, 2], [0, 3], [1, 3]]), grid.start, grid.end);
    overlay.setProgress(3);
    overlay.startRun("bfs", stepsFor(grid, [[1, 0], [2, 0], [2, 1], [2, 2]]), grid.start, grid.end);

    assert.deepEqual(changes.at(-1), ["bfs", "astar"], "button order, not run order");
    let lines = colouredLines(ctx);
    assert.deepEqual(lines.map(l => l.color), [algorithmColors.astar]);
    assert.equal(lines[0].points.length, 6, "A* kept with start, 4 cells and end");

    overlay.setProgress(6);
    lines = colouredLines(ctx);
    assert.deepEqual(lines.map(l => l.color).sort(),
        [algorithmColors.astar, algorithmColors.bfs].sort());

    // Re-running A* replaces its old path rather than adding a second one.
    overlay.startRun("astar", stepsFor(grid, [[1, 1], [1, 2], [2, 2]]), grid.start, grid.end);
    overlay.setProgress(5);
    lines = colouredLines(ctx);
    assert.equal(lines.filter(l => l.color === algorithmColors.astar).length, 1);
    assert.equal(lines.find(l => l.color === algorithmColors.astar).points.length, 5);

    overlay.clear();
    assert.deepEqual(changes.at(-1), []);
    assert.deepEqual(ctx.strokes, []);
});

test("a run that finds no path joins the comparison but draws nothing", () => {
    const grid = buildGrid(["S#.", "##.", "..E"]);
    const { overlay, ctx, changes } = makeOverlay();

    overlay.startRun("dfs", [{ cell: grid.rows[0][0], state: "visited" }], grid.start, grid.end);
    overlay.setProgress(1);

    assert.deepEqual(changes.at(-1), ["dfs"]);
    assert.deepEqual(ctx.strokes, []);
});

test("shared stretches become parallel lanes, spaced evenly and centred", () => {
    const grid = buildGrid(["S....E"]);
    const { overlay, ctx } = makeOverlay();
    const straight = [[0, 1], [0, 2], [0, 3], [0, 4]];

    for (const name of ["dfs", "bfs", "dijkstra"]) {
        const steps = stepsFor(grid, straight);
        overlay.startRun(name, steps, grid.start, grid.end);
        overlay.setProgress(steps.length);
    }

    // Same horizontal path: each lane is a horizontal line at its own height.
    const heights = colouredLines(ctx).map(({ points }) => {
        assert.ok(points.every(p => near(p.y, points[0].y)), "lane stays straight");
        return points[0].y;
    }).sort((a, b) => a - b);

    assert.equal(heights.length, 3);
    assert.ok(near(heights[1], CELL / 2), "middle lane is centred");
    assert.ok(near(heights[1] - heights[0], heights[2] - heights[1]), "even spacing");
    assert.ok(heights[1] - heights[0] > 0, "lanes are apart");

    // All lanes stay inside the row.
    assert.ok(heights[0] > 0 && heights[2] < CELL);
});

test("all algorithms, in both modes, draw a line through their real path", () => {
    const lines = [
        "S..#....",
        ".#.#.##.",
        ".#...#..",
        ".####.#.",
        "......#E"
    ];

    for (const mode of MODES) {
        const { overlay, ctx } = makeOverlay();

        for (const name of Object.keys(ALGORITHMS)) {
            const grid = buildGrid(lines);
            const steps = ALGORITHMS[name](grid, grid.start, grid.end, mode);
            overlay.startRun(name, steps, grid.start, grid.end);
            overlay.setProgress(steps.length);
        }

        const drawn = colouredLines(ctx).map(l => l.color).sort();
        const expected = Object.keys(ALGORITHMS).map(name => algorithmColors[name]).sort();
        assert.deepEqual(drawn, expected, `${mode}-way`);
    }
});
