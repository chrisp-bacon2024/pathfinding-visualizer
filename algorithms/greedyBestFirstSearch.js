import {MinHeap, reconstructPath, terrainCosts, directions, destinationDistance} from "./helpers.js";

export function greedyBestFirstSearch(grid, start, end){
    const steps = [];
    const frontier = new MinHeap();
    const discovered = new Set();
    const cameFrom = new Map();
    const startDist = destinationDistance(start, end);
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

        for (const [dr, dc] of directions){
            const newRow = cheapestCell.row + dr;
            const newCol = cheapestCell.col + dc;

            if (
                newRow >= 0 &&
                newRow < grid.nRows &&
                newCol >= 0 &&
                newCol < grid.nCols
            ) {
                const neighbor = grid.rows[newRow][newCol];
                const neighborPriority = destinationDistance(neighbor, end);
                if (neighbor.type !== "wall" && !discovered.has(neighbor)){
                    frontier.push(neighborPriority, neighbor);
                    discovered.add(neighbor);
                    cameFrom.set(neighbor, cheapestCell);
                    if (neighbor !== end){
                            steps.push({cell: neighbor, state: "frontier"});
                        };
                };
            };
        };
    }
    
    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
    
}