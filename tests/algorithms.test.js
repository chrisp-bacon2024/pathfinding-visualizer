import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MOVEMENT_MODES } from "../algorithms/helpers.js";
import {
    ALGORITHMS,
    baselineGrids,
    buildGrid,
    fingerprintSteps,
    fixedGrids,
    randomGrids
} from "./fixtures.js";
import {
    checkChain,
    pathChain,
    referenceMinMoves,
    referenceOptimalCost,
    EPSILON,
    MODES
} from "./testUtils.js";

const { FOUR, EIGHT } = MOVEMENT_MODES;

const baseline = JSON.parse(
    readFileSync(new URL("./baseline-4way.json", import.meta.url), "utf8")
);

// A* is excluded on purpose: its heuristic was corrected, which is
// allowed to change which cells it explores (but not its path cost).
const UNCHANGED_IN_4_WAY = ["dfs", "bfs", "dijkstra", "greedy", "bidirectionalbfs"];

const run = (name, lines, mode) => {
    const grid = buildGrid(lines);
    const steps = mode === undefined
        ? ALGORITHMS[name](grid, grid.start, grid.end)
        : ALGORITHMS[name](grid, grid.start, grid.end, mode);

    return { grid, steps };
};

const pathCells = steps =>
    steps.filter(step => step.state === "path").map(({ cell }) => [cell.row, cell.col]);

// Every grid the general checks run on, including start/end neighbours.
const allGrids = [
    ...baselineGrids(),
    ...randomGrids(150, 2024, { minStartEndDistance: 1 })
        .map((lines, i) => [`random-near:${i}`, lines]),
    ...randomGrids(150, 77, { rows: 5, cols: 6, wallChance: 0.3, minStartEndDistance: 1 })
        .map((lines, i) => [`random-small:${i}`, lines])
];

test("4-way: every algorithm except A* produces exactly its original steps", () => {
    for (const [gridName, lines] of baselineGrids()) {
        for (const name of UNCHANGED_IN_4_WAY) {
            const expected = baseline[gridName][name];

            // Both the explicit mode and the default (no mode argument).
            for (const mode of [FOUR, undefined]) {
                const actual = fingerprintSteps(run(name, lines, mode).steps);
                assert.deepEqual(actual, expected,
                    `${name} changed on ${gridName} (mode ${mode ?? "default"})`);
            }
        }
    }
});

test("4-way A*: report how many step sequences changed after the heuristic fix", t => {
    let changed = 0;
    const grids = baselineGrids();

    for (const [gridName, lines] of grids) {
        const actual = fingerprintSteps(run("astar", lines, FOUR).steps);
        if (actual.hash !== baseline[gridName].astar.hash) changed++;
    }

    t.diagnostic(`A* 4-way steps differ from the original on ${changed} of ${grids.length} baseline grids`);
});

test("every algorithm returns a legal, connected path whenever one exists, in both modes", () => {
    for (const [gridName, lines] of allGrids) {
        for (const mode of MODES) {
            const reachable = referenceOptimalCost(buildGrid(lines), mode) < Infinity;

            for (const name of Object.keys(ALGORITHMS)) {
                const { grid, steps } = run(name, lines, mode);
                const result = checkChain(grid, pathChain(grid, steps), mode);

                if (reachable) {
                    assert.ok(result.valid,
                        `${name} ${mode}-way on ${gridName}: ${result.reason}\n${lines.join("\n")}`);
                } else {
                    assert.deepEqual(pathCells(steps), [],
                        `${name} ${mode}-way on ${gridName} drew a path with no route`);
                    assert.ok(!result.valid);
                }
            }
        }
    }
});

test("Dijkstra and A* return the same optimal cost in both modes", () => {
    for (const [gridName, lines] of allGrids) {
        for (const mode of MODES) {
            const optimal = referenceOptimalCost(buildGrid(lines), mode);
            if (optimal === Infinity) continue;

            for (const name of ["dijkstra", "astar"]) {
                const { grid, steps } = run(name, lines, mode);
                const { cost } = checkChain(grid, pathChain(grid, steps), mode);

                assert.ok(Math.abs(cost - optimal) < EPSILON,
                    `${name} ${mode}-way on ${gridName}: cost ${cost}, optimal ${optimal}\n${lines.join("\n")}`);
            }
        }
    }
});

test("BFS and Bi-BFS return the fewest moves in both modes", () => {
    for (const [gridName, lines] of allGrids) {
        for (const mode of MODES) {
            const fewest = referenceMinMoves(buildGrid(lines), mode);
            if (fewest === Infinity) continue;

            for (const name of ["bfs", "bidirectionalbfs"]) {
                const { grid, steps } = run(name, lines, mode);
                const { moves } = checkChain(grid, pathChain(grid, steps), mode);

                assert.equal(moves, fewest, `${name} ${mode}-way on ${gridName}`);
            }
        }
    }
});

test("8-way: weighted searches cut straight across open ground at √2 per diagonal", () => {
    const lines = [
        "S...",
        "....",
        "....",
        "...E"
    ];

    for (const name of ["dijkstra", "astar"]) {
        const { grid, steps } = run(name, lines, EIGHT);

        assert.deepEqual(pathCells(steps), [[1, 1], [2, 2]], name);

        // Two grass diagonals (2 × √2 each); entering the end is free.
        const { cost } = checkChain(grid, pathChain(grid, steps), EIGHT);
        assert.ok(Math.abs(cost - 4 * Math.SQRT2) < EPSILON, `${name} cost ${cost}`);
    }

    for (const name of ["bfs", "bidirectionalbfs"]) {
        const { grid, steps } = run(name, lines, EIGHT);
        assert.equal(checkChain(grid, pathChain(grid, steps), EIGHT).moves, 3, name);
    }
});

test("8-way: diagonal cost is terrain cost × √2", () => {
    // Straight through the mud diagonally costs 5√2 ≈ 7.07. Going round
    // costs 2 (grass) + 2√2 (grass diagonal) + 0 (end) ≈ 4.83.
    const lines = [
        "S..",
        ".m.",
        "..E"
    ];

    for (const name of ["dijkstra", "astar"]) {
        const { grid, steps } = run(name, lines, EIGHT);
        const { cost } = checkChain(grid, pathChain(grid, steps), EIGHT);

        assert.ok(Math.abs(cost - (2 + 2 * Math.SQRT2)) < EPSILON, `${name} cost ${cost}`);
    }
});

test("8-way: no algorithm cuts a corner", () => {
    const cases = [
        { lines: ["S#", ".E"], expected: [[1, 0]] },
        { lines: ["S.", "#E"], expected: [[0, 1]] }
    ];

    for (const { lines, expected } of cases) {
        for (const name of Object.keys(ALGORITHMS)) {
            const { steps } = run(name, lines, EIGHT);
            assert.deepEqual(pathCells(steps), expected, `${name} on ${lines.join("/")}`);
        }
    }

    // Both side cells blocked: there's no route at all.
    for (const name of Object.keys(ALGORITHMS)) {
        const { grid, steps } = run(name, ["S#", "#E"], EIGHT);
        assert.deepEqual(pathCells(steps), [], name);
        assert.ok(!checkChain(grid, pathChain(grid, steps), EIGHT).valid, name);
    }
});

test("start next to end: every algorithm finishes with an empty, valid path", () => {
    const cases = [
        { lines: ["SE"], modes: MODES },
        { lines: ["S", "E"], modes: MODES },
        { lines: ["S.", ".E"], modes: [EIGHT] }
    ];

    for (const { lines, modes } of cases) {
        for (const mode of modes) {
            for (const name of Object.keys(ALGORITHMS)) {
                const { grid, steps } = run(name, lines, mode);

                assert.deepEqual(pathCells(steps), [], `${name} ${mode}-way on ${lines.join("/")}`);
                assert.ok(checkChain(grid, pathChain(grid, steps), mode).valid);
            }
        }
    }
});

test("fixed grids have the expected reachability", () => {
    for (const mode of MODES) {
        assert.equal(referenceOptimalCost(buildGrid(fixedGrids.noPath), mode), Infinity);
        assert.ok(referenceOptimalCost(buildGrid(fixedGrids.walled), mode) < Infinity);
    }
});
