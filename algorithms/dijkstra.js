import {MinHeap, reconstructPath, terrainCosts, directions} from "./helpers.js";

export const dijkstra = (grid, start, end) => {
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

        for (const [dr, dc] of directions){
            const newRow = cheapestCell.cell.row + dr;
            const newCol = cheapestCell.cell.col + dc;

            if (
                newRow >= 0 &&
                newRow < grid.nRows &&
                newCol >= 0 &&
                newCol < grid.nCols
            ) {
                const neighbor = grid.rows[newRow][newCol];
                if (!finalized.has(neighbor) && neighbor.type !== "wall"){
                    neighborPriority = cheapestCell.priority + terrainCosts[neighbor.type]
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
    }
    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
}