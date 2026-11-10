// Independent reference searches and path checks used by the tests.

import {
    getNeighbors,
    terrainCosts,
    MOVEMENT_MODES
} from "../algorithms/helpers.js";

export const EPSILON = 1e-9;
export const MODES = [MOVEMENT_MODES.FOUR, MOVEMENT_MODES.EIGHT];

// Optimal terrain cost from `source` to every reachable cell
// (plain Dijkstra with a sorted array; slow but obviously correct).
export function referenceCosts(grid, source, mode) {
    const costs = new Map([[source, 0]]);
    const open = [source];
    const done = new Set();

    while (open.length > 0) {
        open.sort((a, b) => costs.get(a) - costs.get(b));
        const cell = open.shift();

        if (done.has(cell)) continue;
        done.add(cell);

        for (const { cell: next, moveCost } of getNeighbors(grid, cell, mode)) {
            const cost = costs.get(cell) + terrainCosts[next.type] * moveCost;

            if (cost < (costs.get(next) ?? Infinity)) {
                costs.set(next, cost);
                open.push(next);
            }
        }
    }

    return costs;
}

export function referenceOptimalCost(grid, mode) {
    return referenceCosts(grid, grid.start, mode).get(grid.end) ?? Infinity;
}

// Fewest moves from start to end, ignoring terrain cost.
export function referenceMinMoves(grid, mode) {
    const moves = new Map([[grid.start, 0]]);
    const queue = [grid.start];

    while (queue.length > 0) {
        const cell = queue.shift();

        for (const { cell: next } of getNeighbors(grid, cell, mode)) {
            if (!moves.has(next)) {
                moves.set(next, moves.get(cell) + 1);
                queue.push(next);
            }
        }
    }

    return moves.get(grid.end) ?? Infinity;
}

// Start, then the "path" cells in the order they were recorded, then end.
export function pathChain(grid, steps) {
    return [
        grid.start,
        ...steps.filter(step => step.state === "path").map(step => step.cell),
        grid.end
    ];
}

// Checks every consecutive pair is a legal move for the mode.
// Returns { valid, reason, cost, moves }.
export function checkChain(grid, chain, mode) {
    let cost = 0;
    const seen = new Set();

    for (let i = 0; i < chain.length; i++) {
        const cell = chain[i];

        if (seen.has(cell)) {
            return { valid: false, reason: `cell ${cell.row},${cell.col} repeats` };
        }
        seen.add(cell);

        if (cell.type === "wall") {
            return { valid: false, reason: `wall at ${cell.row},${cell.col}` };
        }

        if (i === 0) continue;

        const previous = chain[i - 1];
        const dr = cell.row - previous.row;
        const dc = cell.col - previous.col;
        const isOrthogonal = Math.abs(dr) + Math.abs(dc) === 1;
        const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;

        if (!isOrthogonal && !(isDiagonal && mode === MOVEMENT_MODES.EIGHT)) {
            return {
                valid: false,
                reason: `illegal move ${previous.row},${previous.col} -> ${cell.row},${cell.col}`
            };
        }

        if (isDiagonal) {
            // Checked directly rather than through getNeighbors, so this
            // also verifies the helper's corner rule.
            const vertical = grid.rows[previous.row + dr][previous.col];
            const horizontal = grid.rows[previous.row][previous.col + dc];

            if (vertical.type === "wall" || horizontal.type === "wall") {
                return {
                    valid: false,
                    reason: `corner cut ${previous.row},${previous.col} -> ${cell.row},${cell.col}`
                };
            }
        }

        cost += terrainCosts[cell.type] * (isDiagonal ? Math.SQRT2 : 1);
    }

    return { valid: true, cost, moves: chain.length - 1 };
}
