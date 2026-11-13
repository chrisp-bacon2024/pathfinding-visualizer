import {
    getNeighbors,
    terrainCosts,
    reconstructPath,
    MOVEMENT_MODES
} from "./helpers.js"

export const bellmanFord = (
    grid,
    start,
    end,
    mode = MOVEMENT_MODES.FOUR
) => {
    const steps = [];
    const distances = new Map();
    const cameFrom = new Map();

    // Initialize every cell's distance as infinity
    const vertices = grid.rows.flat().filter(cell => cell.type !== "wall");

    for (const cell of vertices) {
        distances.set(cell, Infinity)
    }

    distances.set(start, 0);

    // Relax every edge
    for (let i = 0; i < vertices.length - 1; i++) {
        let updated = false;

        for (const cell of vertices) {
            // Skip cells that haven't been reached.
            if (distances.get(cell) === Infinity) continue;

            const neighbors = getNeighbors(grid, cell, mode);

            let neighborUpdated = false;

            for (const {cell: neighbor, moveCost} of neighbors) {
                const cost = distances.get(cell) + terrainCosts[neighbor.type] * moveCost;

                // Relax the edge if a cheaper route to the neighbor exists.
                if (cost < distances.get(neighbor)) {
                    // Only visualize cells that successfully relax an edge.
                    if (!neighborUpdated && cell !== start && cell !== end){
                        steps.push({cell, state: "visited"});
                    }

                    neighborUpdated = true;
                    distances.set(neighbor, cost);
                    cameFrom.set(neighbor, cell);
                    updated = true;

                    if (neighbor !== start && neighbor !== end) {
                        steps.push({
                            cell: neighbor,
                            state: "frontier"
                        });
                    }
                }
            }
        }
        if (!updated) break; // Stop earl if a full pass produces no improvements.
    }

    if (distances.get(end) !== Infinity) {
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
}