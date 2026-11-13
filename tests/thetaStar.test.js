// Theta*'s any-angle path: drawn as straight lines between waypoint
// centres, through playback, seeking and clearing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../grid.js";
import { thetaStar } from "../algorithms/thetaStar.js";
import { PathOverlay } from "../pathOverlay.js";
import { algorithmColors } from "../cellStyles.js";
import { computeRunStats } from "../runStats.js";
import { MOVEMENT_MODES } from "../algorithms/helpers.js";
import { ALGORITHMS } from "./fixtures.js";
import { EPSILON } from "./testUtils.js";

const CELL = 25;
const EIGHT = MOVEMENT_MODES.EIGHT;
const SYMBOLS = { ".": "grass", "r": "road", "m": "mud", "#": "wall", "S": "start", "E": "end" };

// A real Grid (Theta* needs lineOfSight) with terrain from `lines`.
function gridFrom(lines) {
    const grid = new Grid(lines.length, lines[0].length, CELL);
    lines.forEach((line, row) => {
        [...line].forEach((symbol, col) => {
            const cell = grid.rows[row][col];
            cell.type = SYMBOLS[symbol];
            if (symbol === "S") grid.start = cell;
            if (symbol === "E") grid.end = cell;
        });
    });
    return grid;
}

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
        stroke() { this.strokes.push({ color: this.strokeStyle, points: current }); }
    };
    return { width: 500, height: 500, getContext: () => ctx, ctx };
}

function overlayFor() {
    const canvas = fakeCanvas();
    const overlay = new PathOverlay(canvas, {
        cellSize: CELL,
        order: ["dfs", "bfs", "dijkstra", "astar", "greedy", "bidirectionalbfs", "jps", "bellmanford", "thetastar"],
        colors: algorithmColors
    });
    return { overlay, ctx: canvas.ctx };
}

const thetaLines = ctx => ctx.strokes.filter(s => s.color === algorithmColors.thetastar);
const centre = cell => ({ x: (cell.col + 0.5) * CELL, y: (cell.row + 0.5) * CELL });
const near = (a, b) => Math.abs(a - b) < EPSILON;
const samePoint = (p, q) => near(p.x, q.x) && near(p.y, q.y);

// Runs Theta* (silencing its debug log) and loads it into an overlay.
function run(lines) {
    const grid = gridFrom(lines);
    const log = console.log;
    console.log = () => {};
    let steps;
    try {
        steps = thetaStar(grid, grid.start, grid.end, EIGHT);
    } finally {
        console.log = log;
    }
    const { overlay, ctx } = overlayFor();
    overlay.startRun("thetastar", steps, grid.start, grid.end);
    return { grid, steps, overlay, ctx };
}

const pathStepCount = steps => steps.filter(s => s.state === "path").length;
const firstPathIndex = steps => steps.findIndex(s => s.state === "path");

// Exact test (doubled integer coordinates): does the segment between two
// pixel points touch the closed square of any wall? Touching a corner
// counts, matching the no-corner-cutting rule.
function cutsWall(grid, p, q) {
    const toDoubled = v => Math.round((v / CELL) * 2);
    const [x1, y1, x2, y2] = [toDoubled(p.x), toDoubled(p.y), toDoubled(q.x), toDoubled(q.y)];
    for (const cell of grid.rows.flat()) {
        if (cell.type !== "wall") continue;
        const bx = 2 * cell.col, by = 2 * cell.row;
        if (Math.max(x1, x2) < bx || Math.min(x1, x2) > bx + 2) continue;
        if (Math.max(y1, y2) < by || Math.min(y1, y2) > by + 2) continue;
        const side = (x, y) => Math.sign((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1));
        const sides = [side(bx, by), side(bx + 2, by), side(bx, by + 2), side(bx + 2, by + 2)];
        if (!(sides.every(s => s > 0) || sides.every(s => s < 0))) return true;
    }
    return false;
}

const MULTI = [
    "S....",
    "###..",
    ".....",
    "..###",
    "....E"
];

test("direct path (0,0) -> (2,2) draws one straight diagonal segment", () => {
    const { grid, steps, overlay, ctx } = run(["S..", "...", "..E"]);

    overlay.setProgress(steps.length);
    const [line] = thetaLines(ctx);
    assert.deepEqual(line.points, [centre(grid.start), centre(grid.end)]);
});

test("multiple waypoints draw as connected straight segments between their centres", () => {
    const { grid, steps, overlay, ctx } = run(MULTI);
    overlay.setProgress(steps.length);

    const [line] = thetaLines(ctx);
    const waypoints = overlay.current.anyAngle.waypoints;

    assert.ok(waypoints.length >= 3, "the walls force at least one turn");
    assert.deepEqual(line.points, waypoints.map(centre));
    assert.ok(samePoint(line.points[0], centre(grid.start)));
    assert.ok(samePoint(line.points.at(-1), centre(grid.end)));

    // Far fewer points than the cells the path touches: no zigzag.
    assert.ok(line.points.length < pathStepCount(steps));
});

test("drawn segments never cut through or past wall corners", () => {
    for (const lines of [
        MULTI,
        ["S.#...", "..#.#.", "....#E"],
        ["S......", ".##.##.", ".#...#.", "...#..E"]
    ]) {
        const { grid, steps, overlay, ctx } = run(lines);
        overlay.setProgress(steps.length);
        const [line] = thetaLines(ctx);
        assert.ok(line, lines.join("/"));
        for (let i = 0; i < line.points.length - 1; i++) {
            assert.equal(cutsWall(grid, line.points[i], line.points[i + 1]), false,
                `${lines.join("/")} segment ${i}`);
        }
    }
});

test("playback and seeking show the right part of the straight path", () => {
    const { grid, steps, overlay, ctx } = run(MULTI);
    const waypoints = overlay.current.anyAngle.waypoints.map(centre);
    const first = firstPathIndex(steps);

    // Before any path step: nothing drawn.
    overlay.setProgress(first);
    assert.deepEqual(thetaLines(ctx), []);

    // During the path: the line follows the waypoints, then ends part-way
    // along the current segment, and only ever grows.
    let previousLength = 0;
    for (let applied = first + 1; applied <= steps.length; applied++) {
        overlay.setProgress(applied);
        const [line] = thetaLines(ctx);
        const pts = line.points;

        for (let i = 0; i < pts.length - 1; i++) {
            assert.ok(samePoint(pts[i], waypoints[i]), `step ${applied}: point ${i} is a waypoint`);
        }
        // The tip lies on the segment from the last listed waypoint to the next one.
        const tip = pts.at(-1);
        const a = waypoints[pts.length - 2];
        const b = waypoints[pts.length - 1] ?? tip;
        const cross = (b.x - a.x) * (tip.y - a.y) - (b.y - a.y) * (tip.x - a.x);
        assert.ok(Math.abs(cross) < 1e-6, `step ${applied}: tip is on the segment`);

        let length = 0;
        for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        assert.ok(length >= previousLength - EPSILON, `step ${applied}: line grows`);
        previousLength = length;
    }

    // Finished: the whole path, start to end.
    assert.deepEqual(thetaLines(ctx)[0].points, waypoints);

    // Seeking back and forward again.
    overlay.setProgress(first);
    assert.deepEqual(thetaLines(ctx), []);
    overlay.setProgress(steps.length);
    assert.deepEqual(thetaLines(ctx)[0].points, waypoints);
    assert.ok(samePoint(waypoints.at(-1), centre(grid.end)));
});

test("a kept Theta* path stays straight when another algorithm runs next", () => {
    const { steps, overlay, ctx } = run(MULTI);
    const waypointCount = overlay.current.anyAngle.waypoints.length;
    overlay.setProgress(firstPathIndex(steps) + 1);  // paused part-way

    const grid = gridFrom(MULTI);
    const bfsSteps = ALGORITHMS.bfs(grid, grid.start, grid.end, EIGHT);
    overlay.startRun("bfs", bfsSteps, grid.start, grid.end);

    const [line] = thetaLines(ctx);
    assert.equal(line.points.length, waypointCount, "whole Theta* path kept");
});

test("clearing removes the Theta* line", () => {
    const { steps, overlay, ctx } = run(MULTI);
    overlay.setProgress(steps.length);
    assert.equal(thetaLines(ctx).length, 1);

    overlay.clear();
    assert.deepEqual(ctx.strokes, []);
});

test("Theta* stats walk the waypoints, not every touched cell", () => {
    const { grid, steps } = run(["S..", "...", "..E"]);
    const stats = computeRunStats({ grid, steps, mode: EIGHT, elapsedMs: 0 });

    // (0,0) -> (2,2): two diagonal moves, through grass (2) then the end (0).
    assert.equal(stats.found, true);
    assert.equal(stats.moves, 2);
    assert.ok(near(stats.cost, 2 * Math.SQRT2));
});

test("other algorithms' steps carry no segment info and draw as before", () => {
    const grid = gridFrom(MULTI);
    for (const [name, algorithm] of Object.entries(ALGORITHMS)) {
        const steps = algorithm(grid, grid.start, grid.end, EIGHT);
        const { overlay, ctx } = overlayFor();
        overlay.startRun(name, steps, grid.start, grid.end);
        overlay.setProgress(steps.length);

        assert.equal(overlay.current.anyAngle, null, name);
        const pathCells = steps.filter(s => s.state === "path").map(s => s.cell);
        const [line] = ctx.strokes.filter(s => s.color === algorithmColors[name]);
        assert.deepEqual(line.points, [grid.start, ...pathCells, grid.end].map(centre), name);
    }
});
