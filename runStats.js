// Comparison stats for one algorithm run, worked out from its steps
// (the algorithms themselves don't report anything extra).

import { getNeighbors, terrainCosts } from "./algorithms/helpers.js";

// Cells the search actually examined: expanded ("visited") or looked
// at while jumping ("scanned", JPS). Frontier-only cells don't count.
const EXPLORED_STATES = new Set(["visited", "scanned"]);

// Returns { found, cost, moves, explored, timeMs }.
// cost: terrain cost of every cell entered (diagonal moves × √2), the
//       same measure Dijkstra and A* minimise.
// moves: number of single-cell moves along the path.
export function computeRunStats({ grid, steps, mode, elapsedMs }) {
    const explored = new Set(
        steps.filter(step => EXPLORED_STATES.has(step.state)).map(step => step.cell)
    ).size;

    const pathCells = steps.filter(step => step.state === "path").map(step => step.cell);

    // Algorithms draw no path cells both when there is no path and when
    // the start is right next to the end, so tell those apart here.
    const found = pathCells.length > 0 ||
        getNeighbors(grid, grid.start, mode).some(({ cell }) => cell === grid.end);

    const stats = { found, cost: null, moves: null, explored, timeMs: elapsedMs };
    if (!found) return stats;

    const chain = [grid.start, ...pathCells, grid.end];
    let cost = 0;
    let moves = 0;

    for (let i = 1; i < chain.length; i++) {
        const segment = walkSegment(grid, chain[i - 1], chain[i]);
        cost += segment.cost;
        moves += segment.moves;
    }

    return { ...stats, cost, moves };
}

// Cost and moves from one path point to the next. Usually neighbours,
// but JPS lists only its jump points, so walk the straight or diagonal
// line between them cell by cell.
function walkSegment(grid, from, to) {
    const dr = to.row - from.row;
    const dc = to.col - from.col;
    const isLine = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);

    if (!isLine) {
        // Any-angle segment (e.g. a future Theta*): straight-line
        // distance at the destination cell's cost.
        return { cost: Math.hypot(dr, dc) * terrainCosts[to.type], moves: 1 };
    }

    const stepRow = Math.sign(dr);
    const stepCol = Math.sign(dc);
    const moveCost = stepRow !== 0 && stepCol !== 0 ? Math.SQRT2 : 1;
    const count = Math.max(Math.abs(dr), Math.abs(dc));
    let cost = 0;

    for (let i = 1; i <= count; i++) {
        const cell = grid.rows[from.row + stepRow * i][from.col + stepCol * i];
        cost += terrainCosts[cell.type] * moveCost;
    }

    return { cost, moves: count };
}
