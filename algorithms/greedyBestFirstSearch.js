import {MinHeap, reconstructPath, getNeighbors, movementDistance, MOVEMENT_MODES} from "./helpers.js";

// Greedy only orders by distance, so it uses plain Manhattan (4-way) or
// octile (8-way) distance. Unlike A*, it doesn't need an admissible
// heuristic because it never guarantees an optimal path.
export const greedyBestFirstSearch = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    const steps = [];
    const frontier = new MinHeap();
    const discovered = new Set();
    const cameFrom = new Map();
    const startDist = movementDistance(start, end, mode);
    let endFound = false;
    frontier.push(startDist, start);
    discovered.add(start);
    while (!frontier.isEmpty()){
        const cheapestCell = frontier.pop().cell;
        if (cheapestCell == end){
            endFound = true;
            break
        };
        steps.push({cell: cheapestCell, state: "visited"});

        for (const { cell: neighbor } of getNeighbors(grid, cheapestCell, mode)){
            const neighborPriority = movementDistance(neighbor, end, mode);
            if (!discovered.has(neighbor)){
                frontier.push(neighborPriority, neighbor);
                discovered.add(neighbor);
                cameFrom.set(neighbor, cheapestCell);
                if (neighbor !== end){
                        steps.push({cell: neighbor, state: "frontier"});
                    };
            };
        };
    }
    
    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
    
}