import { test } from "node:test";
import assert from "node:assert/strict";

import {
    getNeighbors,
    movementDistance,
    aStarHeuristic,
    terrainCosts,
    MIN_ENTRY_COST,
    MOVEMENT_MODES
} from "../algorithms/helpers.js";
import { cellStyles } from "../cellStyles.js";
import { buildGrid, randomGrids } from "./fixtures.js";
import { referenceCosts, EPSILON, MODES } from "./testUtils.js";

const { FOUR, EIGHT } = MOVEMENT_MODES;

const positions = neighbors =>
    neighbors.map(({ cell, moveCost }) => [cell.row, cell.col, moveCost]);

test("terrain costs: road is the cheapest entry cost, and only the destination is free", () => {
    assert.equal(MIN_ENTRY_COST, 1);

    for (const type of Object.keys(cellStyles.types)) {
        // Walls can't be entered; the start is the source and never entered.
        if (type === "wall" || type === "start") continue;

        assert.ok(type in terrainCosts, `${type} has no cost`);

        if (type === "end") {
            assert.equal(terrainCosts[type], 0);
        } else {
            assert.ok(terrainCosts[type] >= MIN_ENTRY_COST, `${type} is cheaper than the minimum`);
        }
    }
});

test("4-way neighbours: left, down, right, up, each costing 1", () => {
    const grid = buildGrid([
        "...",
        ".S.",
        "..E"
    ]);

    assert.deepEqual(positions(getNeighbors(grid, grid.start, FOUR)), [
        [1, 0, 1], [2, 1, 1], [1, 2, 1], [0, 1, 1]
    ]);

    // No mode argument means 4-way.
    assert.deepEqual(getNeighbors(grid, grid.start), getNeighbors(grid, grid.start, FOUR));
});

test("8-way neighbours: orthogonals first, then diagonals costing √2", () => {
    const grid = buildGrid([
        "...",
        ".S.",
        "..E"
    ]);

    assert.deepEqual(positions(getNeighbors(grid, grid.start, EIGHT)), [
        [1, 0, 1], [2, 1, 1], [1, 2, 1], [0, 1, 1],
        [2, 0, Math.SQRT2], [2, 2, Math.SQRT2], [0, 2, Math.SQRT2], [0, 0, Math.SQRT2]
    ]);
});

test("neighbours stay inside the grid", () => {
    const grid = buildGrid([
        "S..",
        "...",
        "..E"
    ]);

    assert.deepEqual(positions(getNeighbors(grid, grid.start, FOUR)), [
        [1, 0, 1], [0, 1, 1]
    ]);
    assert.deepEqual(positions(getNeighbors(grid, grid.start, EIGHT)), [
        [1, 0, 1], [0, 1, 1], [1, 1, Math.SQRT2]
    ]);
});

test("walls are never neighbours", () => {
    const grid = buildGrid([
        ".#.",
        "#S.",
        "..E"
    ]);

    assert.deepEqual(positions(getNeighbors(grid, grid.start, EIGHT)), [
        [2, 1, 1], [1, 2, 1], [2, 2, Math.SQRT2]
    ]);
});

test("no corner cutting: a diagonal needs both side cells open", () => {
    // Up-right of S is open, but the cell above S is a wall.
    const oneSideBlocked = buildGrid([
        ".#.",
        ".S.",
        "..E"
    ]);
    const diagonalsOf = grid => positions(getNeighbors(grid, grid.start, EIGHT))
        .filter(([, , cost]) => cost === Math.SQRT2)
        .map(([row, col]) => [row, col]);

    // Up-left (0,0) and up-right (0,2) both pass the wall at (0,1).
    assert.deepEqual(diagonalsOf(oneSideBlocked), [[2, 0], [2, 2]]);

    // Only the horizontal side blocked.
    const otherSideBlocked = buildGrid([
        "...",
        "#S.",
        "..E"
    ]);
    assert.deepEqual(diagonalsOf(otherSideBlocked), [[2, 2], [0, 2]]);

    // Both sides blocked, diagonal itself open.
    const bothBlocked = buildGrid([
        "S#",
        "#E"
    ]);
    assert.deepEqual(getNeighbors(bothBlocked, bothBlocked.start, EIGHT), []);
});

test("movementDistance: Manhattan for 4-way, octile for 8-way", () => {
    const from = { row: 0, col: 0 };
    const to = { row: 3, col: 5 };

    assert.equal(movementDistance(from, to, FOUR), 8);
    assert.equal(movementDistance(from, to), 8);
    assert.ok(Math.abs(movementDistance(from, to, EIGHT) - (2 + 3 * Math.SQRT2)) < EPSILON);
    assert.equal(movementDistance(from, from, EIGHT), 0);
});

test("aStarHeuristic subtracts the free final move", () => {
    const end = { row: 5, col: 5 };
    const at = (row, col) => ({ row, col });

    for (const mode of MODES) {
        assert.equal(aStarHeuristic(end, end, mode), 0);
        assert.equal(aStarHeuristic(at(5, 4), end, mode), 0);
    }

    assert.equal(aStarHeuristic(at(4, 4), end, EIGHT), 0);
    assert.equal(aStarHeuristic(at(4, 4), end, FOUR), 1);

    // 4-way: Manhattan 7, minus 1.
    assert.equal(aStarHeuristic(at(2, 1), end, FOUR), 6);
    // 8-way, diagonal away: octile(3, 4) = 4 + 3(√2 − 1), minus √2.
    assert.ok(Math.abs(
        aStarHeuristic(at(2, 1), end, EIGHT) - (4 + 3 * (Math.SQRT2 - 1) - Math.SQRT2)
    ) < EPSILON);
    // 8-way, straight away: octile 4, minus 1.
    assert.equal(aStarHeuristic(at(5, 1), end, EIGHT), 3);
});

test("aStarHeuristic is admissible and consistent on random grids", () => {
    const grids = [
        ...randomGrids(25, 11),
        ...randomGrids(25, 12, { rows: 6, cols: 7, wallChance: 0.15, minStartEndDistance: 1 })
    ];

    for (const lines of grids) {
        const grid = buildGrid(lines);
        const cells = grid.rows.flat().filter(cell => cell.type !== "wall");

        for (const mode of MODES) {
            // Admissible: never more than the true cost to the end.
            for (const cell of cells) {
                const trueCost = referenceCosts(grid, cell, mode).get(grid.end);
                if (trueCost === undefined) continue;

                const h = aStarHeuristic(cell, grid.end, mode);
                assert.ok(h <= trueCost + EPSILON,
                    `h=${h} > true cost ${trueCost} at ${cell.row},${cell.col} (${mode}-way)\n${lines.join("\n")}`);
            }

            // Consistent: h(n) <= cost(n -> m) + h(m) for every move n -> m.
            for (const cell of cells) {
                if (cell === grid.end) continue;

                for (const { cell: next, moveCost } of getNeighbors(grid, cell, mode)) {
                    // The start is the source and is never entered.
                    if (next.type === "start") continue;

                    const stepCost = terrainCosts[next.type] * moveCost;
                    const lhs = aStarHeuristic(cell, grid.end, mode);
                    const rhs = stepCost + aStarHeuristic(next, grid.end, mode);

                    assert.ok(lhs <= rhs + EPSILON,
                        `inconsistent at ${cell.row},${cell.col} -> ${next.row},${next.col} (${mode}-way)`);
                }
            }
        }
    }
});
