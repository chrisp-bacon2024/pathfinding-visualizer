import { generatePaths } from "./generators/path.js";
import { terrainTypes } from "./terrainTypes.js";

export function createRoadRunner(getGrid, ctx) {
    function generatePaths(pathType) {
        const grid = getGrid();

        const config = terrainTypes[pathType];

        if (!grid) return;

        const changes = generatePaths(
            grid,
            terrainTypes,
            "road",
            targetCount,
            maxPathLength
        );

        grid.applyTerrainChanges(changes, ctx);
    }

    return { generateRoads };
}