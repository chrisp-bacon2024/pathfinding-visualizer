import {MinHeap, reconstructPath, terrainCosts, getNeighbors, MOVEMENT_MODES} from "./helpers.js";

export const dijkstra = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    const steps = [];
    const frontier = new MinHeap();
    const distances = new Map();
    const cameFrom = new Map();
    const finalized = new Set();
    frontier.push(0, start);
    distances.set(start, 0);
    let cheapestCell;
    let neighborPriority;
    let recordedPriority;
    let endFound = false;
    while (!frontier.isEmpty()){
        cheapestCell = frontier.pop();
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
                neighborPriority = cheapestCell.priority + terrainCosts[neighbor.type] * moveCost
                recordedPriority = distances.get(neighbor) ?? Infinity
                if (neighborPriority < recordedPriority) {
                    cameFrom.set(neighbor, cheapestCell.cell);
                    frontier.push(neighborPriority, neighbor);
                    distances.set(neighbor, neighborPriority);
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