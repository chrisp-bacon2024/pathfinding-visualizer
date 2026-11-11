import { test } from "node:test";
import assert from "node:assert/strict";

import { computeRunStats } from "../runStats.js";
import { MOVEMENT_MODES } from "../algorithms/helpers.js";
import { ALGORITHMS, buildGrid, fixedGrids, randomGrids } from "./fixtures.js";
import {
    checkChain,
    pathChain,
    referenceMinMoves,
    referenceOptimalCost,
    EPSILON,
    MODES
} from "./testUtils.js";

const { FOUR, EIGHT } = MOVEMENT_MODES;

const statsFor = (name, lines, mode) => {
    const grid = buildGrid(lines);
    const steps = ALGORITHMS[name](grid, grid.start, grid.end, mode);
    return { grid, steps, stats: computeRunStats({ grid, steps, mode, elapsedMs: 1.5 }) };
};

const grids = [
    ...Object.values(fixedGrids),
    ...randomGrids(60, 4242, { minStartEndDistance: 1 })
];

test("cost matches the independently checked path, for every algorithm and mode", () => {
    for (const lines of grids) {
        for (const mode of MODES) {
            for (const name of Object.keys(ALGORITHMS)) {
                const { grid, steps, stats } = statsFor(name, lines, mode);
                const chain = checkChain(grid, pathChain(grid, steps), mode);

                // JPS lists only jump points, which checkChain treats as
                // illegal moves; its segments are covered separately below.
                if (name === "jps" || !chain.valid) continue;

                assert.ok(stats.found, name);
                assert.ok(Math.abs(stats.cost - chain.cost) < EPSILON, `${name} ${mode}-way cost`);
                assert.equal(stats.moves, chain.moves, `${name} ${mode}-way moves`);
            }
        }
    }
});

test("Dijkstra's cost is the optimum and BFS's moves are the fewest", () => {
    for (const lines of grids) {
        for (const mode of MODES) {
            const optimal = referenceOptimalCost(buildGrid(lines), mode);
            if (optimal === Infinity) continue;

            assert.ok(Math.abs(statsFor("dijkstra", lines, mode).stats.cost - optimal) < EPSILON);
            assert.equal(statsFor("bfs", lines, mode).stats.moves, referenceMinMoves(buildGrid(lines), mode));
        }
    }
});

test("explored counts distinct visited and scanned cells, not frontier", () => {
    const grid = buildGrid(["S...E"]);
    const [a, b, c] = [grid.rows[0][1], grid.rows[0][2], grid.rows[0][3]];
    const steps = [
        { cell: a, state: "frontier" },
        { cell: a, state: "visited" },
        { cell: a, state: "visited" },   // counted once
        { cell: b, state: "scanned" },
        { cell: c, state: "frontier" },  // never examined
        { cell: a, state: "path" },
        { cell: b, state: "path" },
        { cell: c, state: "path" }
    ];

    const stats = computeRunStats({ grid, steps, mode: FOUR, elapsedMs: 0.3 });
    assert.equal(stats.explored, 2);
    assert.equal(stats.timeMs, 0.3);
});

test("no path: not found, no cost or moves, explored still counted", () => {
    const { stats } = statsFor("bfs", fixedGrids.noPath, FOUR);

    assert.equal(stats.found, false);
    assert.equal(stats.cost, null);
    assert.equal(stats.moves, null);
    assert.ok(stats.explored > 0);
});

test("start next to end counts as a one-move path into the free end cell", () => {
    for (const { lines, mode } of [
        { lines: ["SE"], mode: FOUR },
        { lines: ["S.", ".E"], mode: EIGHT }
    ]) {
        const { stats } = statsFor("dijkstra", lines, mode);
        assert.deepEqual([stats.found, stats.moves, stats.cost], [true, 1, 0], lines.join("/"));
    }

    // Diagonal neighbours aren't adjacent in 4-way.
    const { stats } = statsFor("bfs", ["S#", "#E"], EIGHT);
    assert.equal(stats.found, false);
});

test("non-adjacent jump points are walked cell by cell (JPS)", () => {
    // Straight jump: S -> (0,3) -> E. Grass costs 2, road 1, end 0.
    const row = buildGrid(["S.r.r.E"]);
    let stats = computeRunStats({
        grid: row,
        steps: [{ cell: row.rows[0][3], state: "path" }],
        mode: FOUR,
        elapsedMs: 0
    });
    assert.equal(stats.moves, 6);
    assert.equal(stats.cost, 2 + 1 + 2 + 1 + 2 + 0);

    // Diagonal jump then straight: S -> (2,2) -> E at (2,4), 8-way.
    const open = buildGrid([
        "S....",
        ".....",
        "....E"
    ]);
    stats = computeRunStats({
        grid: open,
        steps: [{ cell: open.rows[2][2], state: "path" }],
        mode: EIGHT,
        elapsedMs: 0
    });
    assert.equal(stats.moves, 4);
    assert.ok(Math.abs(stats.cost - (2 * 2 * Math.SQRT2 + 2 + 0)) < EPSILON);
});
