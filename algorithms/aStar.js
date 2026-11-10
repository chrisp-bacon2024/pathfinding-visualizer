import {MinHeap, reconstructPath, terrainCosts, directions} from "./helpers.js";

export function aStar(grid, start, end){
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
                if (neighbor.type === "end") {
                    console.log("Found end neighbor!", {
                        sameObject: neighbor === end,
                        finalized: finalized.has(neighbor),
                        cost: terrainCosts[neighbor.type]
                    });
                }
                if (!finalized.has(neighbor) && neighbor.type !== "wall"){
                    const newCost = distances.get(cheapestCell.cell) + terrainCosts[neighbor.type];
                    const heuristic = Math.abs(end.row - neighbor.row) + Math.abs(end.col - neighbor.col);
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
    }
    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps;
}