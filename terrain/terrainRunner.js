
import { terrainTypes, getBaseTerrain } from "./terrainTypes.js";
import { generateClusters } from "./generators/cluster.js";
import { generatePaths } from "./generators/path.js";
import { generateWalls } from "./generators/wall.js";

export function createTerrainRunner(getGrid, ctx) {
    return function runTerrainGenerator(type, animate = false) {
        const grid = getGrid();
        if (!grid) return [];

        const config = terrainTypes[type];

        if (!config) {
            throw new Error(`Terrain type not found: ${type}`);
        }

        const totalCells = grid.nRows * grid.nCols - 2;

        const totalWeight = Object.values(terrainTypes)
            .reduce(
                (sum, terrain) => sum + terrain.defaultWeight,
                0
            );

        const targetCount = Math.floor(
            totalCells * config.defaultWeight / totalWeight
        );

        const baseTerrain = getBaseTerrain();
        let changes = [];

        switch (config.generation) {
            case "cluster":
                changes = generateClusters(
                    grid,
                    baseTerrain,
                    type,
                    targetCount,
                    config.maxClusterSize ?? 25
                );
                break;

            case "path":
                changes = generatePaths(
                    grid,
                    terrainTypes,
                    type,
                    targetCount,
                    config.maxPathLength ?? 50
                );
                break;

            case "wall":
                changes = generateWalls(grid);
                break;

            default:
                throw new Error(
                    `Unknown terrain generation strategy: ${config.generation}`
                );
        }

        // Animated mode: return changes without modifying the grid.
        if (animate) {
            return changes;
        }

        // Immediate mode: apply changes directly.
        grid.applyTerrainChanges(changes, ctx);

        return changes;
    };
}
