import {
    MinHeap,
    getNeighbors,
    terrainCosts,
    MOVEMENT_MODES
} from "./helpers.js";

const euclideanDistance = (a, b) => {
    return Math.hypot(a.row - b.row, a.col - b.col);
};

const reconstructAnyAnglePath = (cameFrom, start, end, steps, grid) => {
    const waypoints = [];
    let current = end;

    while (current !== start) {
        waypoints.push(current);
        current = cameFrom.get(current);
    }

    waypoints.push(start);
    waypoints.reverse();

    // Each segment's cells become path steps (so they animate and clear
    // the search colours underneath), in order along the segment. Every
    // step also records the segment it's on (`from` -> `to` waypoints)
    // and how far along it the cell is (`t`, 0 to 1). The path overlay
    // uses those to draw straight lines between waypoint centres instead
    // of a line through every touched cell.
    for (let i = 0; i < waypoints.length - 1; i++) {
        const from = waypoints[i];
        const to = waypoints[i + 1];

        const cells = grid.getCellsAlongLine(from, to);

        for (const cell of cells) {
            if (cell !== start && cell !== end) {
                steps.push({ cell, state: "path", from, to, t: alongSegment(cell, from, to) });
            }
        }
    }
}

// How far along from -> to the cell's centre lies, from 0 to 1.
const alongSegment = (cell, from, to) => {
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;
    const lengthSquared = dRow * dRow + dCol * dCol;

    if (lengthSquared === 0) return 1;

    const t = ((cell.row - from.row) * dRow + (cell.col - from.col) * dCol) / lengthSquared;
    return Math.min(1, Math.max(0, t));
};

export const thetaStar = (
    grid,
    start,
    end,
    mode = MOVEMENT_MODES.EIGHT
) => {
    const steps = [];
    const frontier = new MinHeap();
    const distances = new Map();
    const cameFrom = new Map();
    const finalized = new Set();
    let endFound = false;

    distances.set(start, 0);
    cameFrom.set(start, start);

    frontier.push(euclideanDistance(start, end), start);

    while (!frontier.isEmpty()) {
        const current = frontier.pop().cell;

        if (finalized.has(current)) continue;
        finalized.add(current);
        if (current !== start && current !== end) {
            steps.push({cell: current, state: "visited"});
        }

        if (current === end) {
            endFound = true;
            break;
        }

        const parent = cameFrom.get(current);
        const neighbors = getNeighbors(grid, current, mode);

        for (const {cell: neighbor, moveCost} of neighbors) {
            if (finalized.has(neighbor)) continue;

            let newCost = distances.get(current) + euclideanDistance(current, neighbor);
            let newParent = current;

            if (grid.lineOfSight(parent, neighbor)) {
                const costThroughParent = distances.get(parent) + euclideanDistance(parent, neighbor);

                if (costThroughParent <= newCost) {
                    newCost = costThroughParent;
                    newParent = parent;
                }
            }

            if (newCost < (distances.get(neighbor) ?? Infinity)) {
                distances.set(neighbor, newCost);
                cameFrom.set(neighbor, newParent);

                const priority = newCost + euclideanDistance(neighbor, end);
                frontier.push(priority, neighbor);
                if (neighbor !== start && neighbor !== end){
                    steps.push({cell: neighbor, state: "frontier"});
                }
            }

        }
    }

    if (endFound) {
        let node = end;
        const waypoints = [];

        while (node !== start) {
            waypoints.push([node.row, node.col]);
            node = cameFrom.get(node);
        }

        waypoints.push([start.row, start.col]);

        console.log("Theta* waypoints:", waypoints.reverse());

        reconstructAnyAnglePath(cameFrom, start, end, steps, grid);
    }

    return steps;
}