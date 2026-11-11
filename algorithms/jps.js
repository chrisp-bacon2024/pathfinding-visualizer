import {
    MinHeap, 
    reconstructPath, 
    terrainCosts, 
    getNeighbors, 
    aStarHeuristic, 
    movementDistance,
    MOVEMENT_MODES
} from "./helpers.js";


/*
Check whether moving one cell in a specific direction is legal.
Reusing getNeighbors() ensures that walls, grid boundaries, and
the rule against diagonal corner cutting are respected. 
*/
const canMove = (grid, cell, dr, dc) => {
    return getNeighbors(grid, cell, MOVEMENT_MODES.EIGHT)
    .some(({cell: neighbor}) =>
        neighbor.row === cell.row + dr &&
        neighbor.col === cell.col + dc
    );
};


// Check whether a position is blocked by a wall or grid boundary.
const isBlocked = (grid, row, col) => {
    if (
        row < 0 || row >= grid.nRows ||
        col < 0 || col >= grid.nCols
    ) return true;

    return grid.rows[row][col].type === "wall";
}


/*
Identify candidate forced directions caused by obstacles.

dr and dc describe the direction used to reach the current cell.

A blocked cell beside the previous position, followed by an
open cell beside the current position, may create a necessary
turning point.

Returns an array of directions in [dr, dc] format.

NOTE: These are preliminary candidate rules. Complete JPS
pruning for strict no-corner-cutting movement still needs
to be established and tested.
*/
const getForcedDirections = (grid, cell, dr, dc) => {
    const row = cell.row;
    const col = cell.col;
    const directions = [];

    if (dr === 0 && dc !== 0) {
        // Moving horizontally (left or right).

        const upperPreviousBlocked = isBlocked(grid, row - 1, col - dc);
        const upperCurrentOpen = !isBlocked(grid, row - 1, col);

        if (upperPreviousBlocked && upperCurrentOpen) {
            directions.push([-1, 0]); // Turn upward
        }

        const lowerPreviousBlocked = isBlocked(grid, row + 1, col - dc);
        const lowerCurrentOpen = !isBlocked(grid, row + 1, col);

        if (lowerPreviousBlocked && lowerCurrentOpen) {
            directions.push([1, 0]); // Turn downward
        }
    }

    if (dc === 0 && dr !== 0) {
        // Moving vertically (up or down).

        const leftPreviousBlocked = isBlocked(grid, row - dr, col - 1);
        const leftCurrentOpen = !isBlocked(grid, row, col - 1);

        if (leftPreviousBlocked && leftCurrentOpen) {
            directions.push([0, -1]); // Turn left
        }

        const rightPreviousBlocked = isBlocked(grid, row - dr, col + 1);
        const rightCurrentOpen = !isBlocked(grid, row, col + 1);

        if (rightPreviousBlocked && rightCurrentOpen) {
            directions.push([0, 1]); // Turn right
        }
    }

    return directions;
};

/*
Detect candidate turning points caused by nearby obstacles.

JPS normally skips intermediate cells because many possible paths
are equivalent. Obstacles can break that symmetry, making it
necessary to consider turning at a particular cell.

dr and dc describe the direction used to reach the current cell.
*/
const hasForcedNeighbor = (grid, cell, dr, dc) => {
    return getForcedDirections(grid, cell, dr, dc).length > 0;
};

/*
Scan in direction (dr, dc) until the destination is reached,
a jump point is discovered, or an invalid move is encountered.
*/

const jump = (grid, cell, dr, dc, end, steps, visualize = true) => {

    // Stop if the next movement is illegal.
    if (!canMove(grid, cell, dr, dc)) return null;

    // Advance one cell in the current direction.
    const newRow = cell.row + dr;
    const newCol = cell.col + dc;
    const newCell = grid.rows[newRow][newCol];

    // Reaching the destination is a successful jump.
    if (newCell === end) return newCell;

    // Visualize primary scans, but not exploratory lookahead scans.
    if (visualize) {
        steps.push({cell: newCell, state: "scanned"});
    }

    // Stop when an obstacle creates a candidate jump point.
    if (hasForcedNeighbor(grid, newCell, dr, dc)) {
        return newCell;
    }

    if (dr !== 0 && dc !== 0) {
        // Horizontal and vertical lookahead checks.
        // These still execute, but don't generate visualization steps.

        if (jump(grid, newCell, 0, dc, end, steps, false) !== null) {
            return newCell;
        }

        if (jump(grid, newCell, dr, 0, end, steps, false) !== null) {
            return newCell;
        }
    }

    // Continue in the same direction, preserving visualization mode.
    return jump(grid, newCell, dr, dc, end, steps, visualize);
};




/*
Return candidate directions for JPS.

This conservative approach explores all legal directions,
except the direction immediately back toward the parent.

It sacrifices some of JPS's efficiency in exchange for
reducing the risk of pruning necessary paths.

NOTE: This is a debugging baseline, not complete JPS pruning.
*/
const getPrunedDirections = (grid, cell, parent, mode) => {
    // Start cell: explore all legal directions.
    const directions = getNeighbors(grid, cell, mode).map(
        ({cell: neighbor}) => [
            Math.sign(neighbor.row - cell.row),
            Math.sign(neighbor.col - cell.col)
        ]
    );

    if (!parent) return directions;

    // Direction from parent to current jump point.
    const dr = Math.sign(cell.row - parent.row);
    const dc = Math.sign(cell.col - parent.col);

    // Exclude only the exact reverse direction.
    return directions.filter(([r, c]) =>
        !(r === -dr && c === -dc)
    );
};


const reconstructJPSPath = (grid, cameFrom, start, end, steps) => {
    const path = [];
    let current = end;

    while (current !== start) {
        const parent = cameFrom.get(current);

        if (!parent) return;

        // Fill in cells between parent and current
        const dr = Math.sign(parent.row - current.row);
        const dc = Math.sign(parent.col - current.col);
        while (current !== parent){
            if (current !== end){
                path.push(current);
            };

            current = grid.rows[current.row + dr][current.col + dc];
        }
    }
    path.reverse().forEach(cell => {
        steps.push({cell, state: "path"});
    });
}


export const jps = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    const steps = [];
    const frontier = new MinHeap();
    const distances = new Map();
    const cameFrom = new Map();
    const finalized = new Set();

    frontier.push(0, start);
    distances.set(start, 0);

    let endFound = false;

    while (!frontier.isEmpty()){
        const cheapestCell = frontier.pop();
        const current = cheapestCell.cell;

        if (finalized.has(current)) continue;
        finalized.add(current);

        if (current === end) {
            endFound = true;
            break;
        }

        steps.push({cell: current, state: "visited"});

        const parent = cameFrom.get(current);
        const directions = getPrunedDirections(grid, current, parent, mode)


        for (const [dr, dc] of directions) {

            // Search in this direction until a jump point is found.
            const jumpPoint = jump(grid, current, dr, dc, end, steps);
            console.log(
                "Jump:",
                [dr, dc],
                "→",
                jumpPoint ? [jumpPoint.row, jumpPoint.col] : null
            );


            if (jumpPoint === null) continue;

            if (!finalized.has(jumpPoint)) {
                const newCost = distances.get(current) +
                    movementDistance(current, jumpPoint, mode);

                const recordedCost = distances.get(jumpPoint) ?? Infinity;

                if (newCost < recordedCost) {
                    distances.set(jumpPoint, newCost);
                    cameFrom.set(jumpPoint, current);

                    const heuristic = movementDistance(jumpPoint, end, mode);
                    frontier.push(newCost + heuristic, jumpPoint);

                    if (jumpPoint !== end) {
                        steps.push({cell: jumpPoint, state: "frontier"});
                    }
                }
            }
        }
    }
    console.log({
    endFound,
    finalizedCount: finalized.size,
    discoveredCount: distances.size
});
    if (endFound){
        reconstructJPSPath(grid, cameFrom, start, end, steps);
    };
    return steps;
}