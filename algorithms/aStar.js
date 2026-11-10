import {MinHeap, reconstructPath, terrainCosts, getNeighbors, aStarHeuristic, MOVEMENT_MODES} from "./helpers.js";

export const aStar = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
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
        if (finalized.has(cheapestCell.cell)) continue;
        finalized.add(cheapestCell.cell)
        if (cheapestCell.cell == end){
            endFound = true;
            break
        }
        steps.push({cell: cheapestCell.cell, state: "visited"});

        for (const { cell: neighbor, moveCost } of getNeighbors(grid, cheapestCell.cell, mode)){
            if (!finalized.has(neighbor)){
                // moveCost is 1 orthogonally and √2 diagonally.
                const newCost = distances.get(cheapestCell.cell) + terrainCosts[neighbor.type] * moveCost;
                // Admissible and consistent in both modes; see aStarHeuristic.
                const heuristic = aStarHeuristic(neighbor, end, mode);
                const recordedCost = distances.get(neighbor) ?? Infinity
                if (newCost < recordedCost) {
                    cameFrom.set(neighbor, cheapestCell.cell);
                    frontier.push(newCost + heuristic, neighbor);
                    distances.set(neighbor, newCost);
                    if (neighbor !== end){
                        steps.push({cell: neighbor, state: "frontier"})
                    }
                }

            };
        }
    }
    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
}