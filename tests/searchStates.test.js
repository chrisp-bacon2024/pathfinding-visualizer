// Visualization states, exercised through the real Cell and Animator
// with a fake canvas context that records what is drawn.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Cell } from "../cell.js";
import { Animator } from "../animator.js";
import { Grid } from "../grid.js";
import { cellStyles } from "../cellStyles.js";

// Records each fillRect with the fill colour and alpha in effect.
function fakeContext() {
    const ctx = {
        fills: [],
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        globalAlpha: 1,
        saved: [],
        save() { this.saved.push(this.globalAlpha); },
        restore() { this.globalAlpha = this.saved.pop(); },
        fillRect() { this.fills.push({ fill: this.fillStyle, alpha: this.globalAlpha }); },
        strokeRect() {}
    };
    return ctx;
}

// The search overlay is the only fill drawn with partial alpha.
function overlayFill(cell) {
    const ctx = fakeContext();
    cell.draw(ctx);
    return ctx.fills.find(({ alpha }) => alpha < 1)?.fill ?? null;
}

const SCANNED = cellStyles.searchStates.scanned.fill;
const FRONTIER = cellStyles.searchStates.frontier.fill;
const VISITED = cellStyles.searchStates.visited.fill;
// Path cells have no overlay: the path is drawn as a line on the
// path overlay canvas instead (see pathOverlay.test.js).
const PATH = null;

test("scanned is a valid search state with its own muted purple overlay", () => {
    assert.equal(SCANNED, "#8B7BC8");

    const cell = new Cell(0, 0, "grass", 20);
    cell.setSearchState("scanned");

    assert.equal(cell.searchState, "scanned");
    assert.equal(overlayFill(cell), SCANNED);
    assert.notEqual(SCANNED, FRONTIER);
    assert.notEqual(SCANNED, VISITED);
});

test("frontier and visited draw their overlays; path cells show plain terrain", () => {
    const cell = new Cell(0, 0, "mud", 20);

    for (const [state, fill] of [["frontier", "#3B82F6"], ["visited", "#06B6D4"], ["path", null]]) {
        cell.setSearchState(state);
        assert.equal(overlayFill(cell), fill, state);
    }

    cell.setSearchState("idle");
    assert.equal(overlayFill(cell), null);
});

test("scanned is never drawn over walls, start or end", () => {
    for (const type of ["wall", "start", "end"]) {
        const cell = new Cell(0, 0, type, 20);
        cell.setSearchState("scanned");
        assert.equal(overlayFill(cell), null, type);
    }
});

test("playback: later states replace scanned, and scrubbing restores it", () => {
    const ctx = fakeContext();
    const a = new Cell(0, 0, "grass", 20);
    const b = new Cell(0, 1, "road", 20);
    const steps = [
        { cell: a, state: "scanned" },
        { cell: b, state: "scanned" },
        { cell: a, state: "frontier" },
        { cell: a, state: "visited" },
        { cell: b, state: "path" }
    ];

    const animator = new Animator(ctx);
    animator.load(steps);

    const expectAt = (step, aFill, bFill) => {
        animator.seek(step);
        assert.equal(overlayFill(a), aFill, `cell a at step ${step}`);
        assert.equal(overlayFill(b), bFill, `cell b at step ${step}`);
    };

    // Forward through every step.
    expectAt(0, null, null);
    expectAt(1, SCANNED, null);
    expectAt(2, SCANNED, SCANNED);
    expectAt(3, FRONTIER, SCANNED);
    expectAt(4, VISITED, SCANNED);
    expectAt(5, VISITED, PATH);

    // Scrub back: the scanned state comes back, then goes away.
    expectAt(2, SCANNED, SCANNED);
    expectAt(1, SCANNED, null);
    expectAt(0, null, null);

    // Jump straight to the end and back again.
    expectAt(5, VISITED, PATH);
    expectAt(0, null, null);
});

// Every cell except the start and end, marked scanned.
function scannedGrid() {
    const grid = new Grid(3, 4, 20);
    const cells = grid.rows.flat().filter(cell => cell !== grid.start && cell !== grid.end);

    for (const cell of cells) cell.setSearchState("scanned");
    return { grid, cells };
}

test("clearVisualization removes scanned cells", () => {
    const { grid, cells } = scannedGrid();

    grid.clearVisualization(fakeContext());

    for (const cell of cells) {
        assert.equal(cell.searchState, "idle");
        assert.equal(overlayFill(cell), null);
    }
});

test("terrain edits and map resets remove scanned cells", () => {
    const ctx = fakeContext();

    const painted = scannedGrid();
    painted.grid.paintLine(painted.grid.rows[1][0], painted.grid.rows[1][3], "mud", ctx);
    for (const cell of painted.grid.rows[1]) assert.equal(cell.searchState, "idle");

    const reset = scannedGrid();
    reset.grid.resetTerrain("grass", ctx);
    for (const cell of reset.cells) assert.equal(cell.searchState, "idle");

    const changed = scannedGrid();
    changed.grid.applyTerrainChanges([{ row: 1, col: 1, type: "road" }], ctx);
    assert.equal(changed.grid.rows[1][1].searchState, "idle");
});

test("a finished playback can be restarted from the beginning", () => {
    const frames = [];
    globalThis.requestAnimationFrame = callback => frames.push(callback);

    try {
        const ctx = fakeContext();
        const a = new Cell(0, 0, "grass", 20);
        const b = new Cell(0, 1, "grass", 20);
        const animator = new Animator(ctx);
        animator.load([{ cell: a, state: "visited" }, { cell: b, state: "path" }]);

        assert.equal(animator.finished, false, "loaded but not played");

        animator.seek(2);
        animator.togglePause();             // resume at the end...
        frames.shift()?.(1000);             // ...which finishes at once
        assert.equal(animator.finished, true);
        assert.equal(animator.state, "idle");

        animator.restart();
        assert.equal(animator.currentStep, 0, "back to the start");
        assert.equal(a.searchState, "idle", "steps undone");
        assert.equal(animator.state, "playing");
        assert.equal(animator.finished, false);

        // Nothing loaded: nothing to restart.
        animator.clear();
        animator.restart();
        assert.equal(animator.state, "idle");
        assert.equal(animator.finished, false);
    } finally {
        delete globalThis.requestAnimationFrame;
    }
});
