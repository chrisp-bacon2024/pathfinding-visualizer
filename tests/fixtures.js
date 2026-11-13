// Shared test grids and utilities.
//
// Cells are plain { row, col, type } objects: the algorithms only read
// those fields, so the tests need no canvas or DOM.

import { createHash } from "node:crypto";

import { dfs } from "../algorithms/dfs.js";
import { bfs } from "../algorithms/bfs.js";
import { dijkstra } from "../algorithms/dijkstra.js";
import { aStar } from "../algorithms/aStar.js";
import { greedyBestFirstSearch } from "../algorithms/greedyBestFirstSearch.js";
import { biBFS } from "../algorithms/biBFS.js";
import { bellmanFord } from "../algorithms/bellmanFord.js";

// Same names as the data-algorithm attributes in index.html.
export const ALGORITHMS = {
    dfs,
    bfs,
    dijkstra,
    astar: aStar,
    greedy: greedyBestFirstSearch,
    bidirectionalbfs: biBFS,
    bellmanford: bellmanFord
};

const SYMBOLS = {
    ".": "grass",
    "r": "road",
    "m": "mud",
    "#": "wall",
    "S": "start",
    "E": "end"
};

export function buildGrid(lines) {
    const grid = {
        nRows: lines.length,
        nCols: lines[0].length,
        rows: [],
        start: null,
        end: null
    };

    lines.forEach((line, row) => {
        if (line.length !== grid.nCols) {
            throw new Error(`Row ${row} has the wrong length`);
        }

        grid.rows.push([...line].map((symbol, col) => {
            const type = SYMBOLS[symbol];
            if (!type) throw new Error(`Unknown grid symbol "${symbol}"`);

            const cell = { row, col, type };
            if (type === "start") grid.start = cell;
            if (type === "end") grid.end = cell;
            return cell;
        }));
    });

    if (!grid.start || !grid.end) {
        throw new Error("Grid needs an S and an E");
    }

    return grid;
}

export const fixedGrids = {
    open: [
        "S.......",
        "........",
        "........",
        "........",
        ".......E"
    ],
    walled: [
        "S..#....",
        ".#.#.##.",
        ".#...#..",
        ".####.#.",
        "......#E"
    ],
    mixedTerrain: [
        "S.mmm...",
        ".rrrrrr.",
        ".m#mm#r.",
        ".m#..#r.",
        "..#mm.rE"
    ],
    noPath: [
        "S..#....",
        "...#....",
        "####....",
        ".......E"
    ],
    roadDetour: [
        "S.mmmmm..",
        "r.mmmmm..",
        "rrrrrrrrE"
    ]
};

// Small, fast, seeded PRNG so random grids are identical on every run.
function mulberry32(seed) {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Returns grids as arrays of strings (use buildGrid to turn them into grids).
// minStartEndDistance is a Manhattan distance; 2 keeps start and end from
// being orthogonal neighbours.
export function randomGrids(count, seed, {
    rows = 10,
    cols = 12,
    wallChance = 0.25,
    minStartEndDistance = 2
} = {}) {
    const random = mulberry32(seed);
    const randomIndex = n => Math.floor(random() * n);
    const grids = [];

    while (grids.length < count) {
        const cells = [];

        for (let row = 0; row < rows; row++) {
            const line = [];

            for (let col = 0; col < cols; col++) {
                const x = random();

                line.push(
                    x < wallChance ? "#" :
                    x < wallChance + 0.15 ? "m" :
                    x < wallChance + 0.30 ? "r" :
                    "."
                );
            }

            cells.push(line);
        }

        const start = [randomIndex(rows), randomIndex(cols)];
        const end = [randomIndex(rows), randomIndex(cols)];
        const distance =
            Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1]);

        if (distance < minStartEndDistance) continue;

        cells[start[0]][start[1]] = "S";
        cells[end[0]][end[1]] = "E";

        grids.push(cells.map(line => line.join("")));
    }

    return grids;
}

// The grids the 4-way baseline was recorded on.
export function baselineGrids() {
    return [
        ...Object.entries(fixedGrids).map(([name, lines]) => [`fixed:${name}`, lines]),
        ...randomGrids(40, 1234).map((lines, i) => [`random:${i}`, lines])
    ];
}

export function serializeSteps(steps) {
    return steps
        .map(step => `${step.cell.row},${step.cell.col},${step.state ?? step.terrainType}`)
        .join(";");
}

export function fingerprintSteps(steps) {
    const serialized = serializeSteps(steps);

    return {
        count: steps.length,
        hash: createHash("sha256").update(serialized).digest("hex")
    };
}
