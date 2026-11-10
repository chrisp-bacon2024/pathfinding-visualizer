import { directions } from "../../algorithms/helpers.js";
import { 
    randomInt, 
    getDirection, 
    resolveDirection, 
    weightedRandomChoice,
    wouldCreateRoadBlock
 } from "./helpers.js";

const isViable = (cell, grid, terrainTypes) => {
    return (
        cell &&
        cell !== grid.start &&
        cell !== grid.end &&
        terrainTypes[cell.type]?.pathEligible === true
    )
}



const sameDirection = (a, b) =>
    a && b && a[0] === b[0] && a[1] === b[1];

export function generatePaths(
    grid,
    terrainTypes,
    pathType,
    targetCount,
    maxPathLength = 50
){
    const changes = [];
    const viableCells = [];
    const pathCells = new Set();
    for (const row of grid.rows){
        for (const cell of row){
            if (isViable(cell, grid, terrainTypes)) viableCells.push(cell);
            if (cell.type === pathType) {
                pathCells.add(`${cell.row},${cell.col}`);
            }
        }
    }

    let steps = 0;
    let currDirection;
    while (steps < targetCount && viableCells.length > 0){
        let pathIndex = randomInt(0, viableCells.length-1);
        let path = viableCells[pathIndex];
        changes.push({row: path.row, col: path.col, type: pathType});
        pathCells.add(`${path.row},${path.col}`);
        viableCells.splice(pathIndex, 1);
        currDirection = resolveDirection(
            getDirection(path, grid.end),
            directions
        );
        let currPathLen = 1;
        steps++;
        while (
            currPathLen < maxPathLength && 
            viableCells.length > 0 &&
            steps < targetCount
            
        ){
            const viableNeighbors = new Map();

            for (const [dr, dc] of directions) {
                const potentialNeighbor =
                    grid.rows[path.row + dr]?.[path.col + dc];

                // Skip out-of-bounds or unavailable cells
                if (!potentialNeighbor || !viableCells.includes(potentialNeighbor)) {
                    continue;
                }

                // Skip cells that would create a 2x2 road block
                if (wouldCreateRoadBlock(potentialNeighbor, pathCells)) {
                    continue;
                }

                viableNeighbors.set([dr, dc], potentialNeighbor);
            }
            const dirToEnd = resolveDirection(getDirection(path, grid.end), directions);

            const weights = new Map();
            const viableDirections = [...viableNeighbors.keys()];

            const current = viableDirections.find(dir =>
                sameDirection(dir, currDirection)
            );

            const towardEnd = viableDirections.find(dir =>
                sameDirection(dir, dirToEnd)
            );

            let remainingWeight = 100;

            if (current) {
                weights.set(current, 70);
                remainingWeight -= 70
            }

            if (towardEnd) {
                weights.set(
                    towardEnd,
                    (weights.get(towardEnd) ?? 0) + 10
                );
                remainingWeight -= 10;
            }

            const otherDirections = viableDirections.filter(
                dir => !weights.has(dir)
            );

            if (otherDirections.length > 0) {
                const weightPerDirection = 
                    remainingWeight / otherDirections.length;
                
                for (const dir of otherDirections) {
                    weights.set(dir, weightPerDirection);
                }
            } else if (weights.size > 0) {
                const extra = remainingWeight / weights.size;

                for (const dir of weights.keys()) {
                    weights.set(dir, weights.get(dir) + extra);
                }
            }

            const nextDirection = weightedRandomChoice(weights);

            if (!nextDirection) break;

            path = viableNeighbors.get(nextDirection);
            pathIndex = viableCells.indexOf(path);
            currDirection = nextDirection;
            changes.push({row: path.row, col: path.col, type: pathType});
            pathCells.add(`${path.row},${path.col}`);
            viableCells.splice(pathIndex, 1);
            currPathLen++;
            steps++;
        }
    }

    return changes;
}