import { directions } from "../../algorithms/helpers.js";
import { randomInt } from "./helpers.js";

const isViable = (cell, baseTerrain, grid) => {
    return (
        cell.type === baseTerrain &&
        cell !== grid.start &&
        cell !== grid.end
    );
};

export function generateClusters(
    grid, 
    baseTerrain, 
    terrainType, 
    targetCount,
    maxClusterSize = 25
) {
    const changes = [];

    const viable = [];
    grid.rows.forEach(row => {
        row.forEach(cell => {
            if (isViable(cell, baseTerrain, grid)) viable.push(cell);
        })
    });

    let terrainCount = 0;
    while (terrainCount < targetCount && viable.length > 0){
        const index = randomInt(0, viable.length - 1);
        const seedCell = viable[index];
        const cluster = [seedCell];
        viable.splice(index, 1);
        let clusterSize = 0;
        while (
            cluster.length > 0 && 
            terrainCount < targetCount && 
            clusterSize < maxClusterSize
        ){
            const cell = cluster.pop()
            changes.push({row: cell.row, col: cell.col, type: terrainType});
            clusterSize++;
            terrainCount++;
            for (const [dr, dc] of directions){
                const neighborCell = grid.rows[cell.row + dr]?.[cell.col + dc];
                const neighborIndex = viable.indexOf(neighborCell);
                if (neighborIndex === -1) continue;
                if (
                    Math.random() < 0.33 &&
                    clusterSize + cluster.length < maxClusterSize &&
                    terrainCount + cluster.length < targetCount
                ) {
                    viable.splice(neighborIndex, 1);
                    cluster.push(neighborCell);
                }
            }
        }
    }
    return changes;
}