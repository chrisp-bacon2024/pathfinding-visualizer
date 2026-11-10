// Records a fingerprint of every algorithm's 4-way step sequence on the
// baseline grids, so tests can prove 4-way behaviour did not change.
//
// This was run once against the code BEFORE diagonal movement was added.
// Only re-run it if you intentionally change 4-way behaviour:
//
//     node tests/generate-baseline.js

import { writeFileSync } from "node:fs";

import {
    ALGORITHMS,
    baselineGrids,
    buildGrid,
    fingerprintSteps
} from "./fixtures.js";

const baseline = {};

for (const [name, lines] of baselineGrids()) {
    baseline[name] = {};

    for (const [algorithmName, algorithm] of Object.entries(ALGORITHMS)) {
        const grid = buildGrid(lines);
        const steps = algorithm(grid, grid.start, grid.end);

        baseline[name][algorithmName] = fingerprintSteps(steps);
    }
}

const outputUrl = new URL("./baseline-4way.json", import.meta.url);
writeFileSync(outputUrl, JSON.stringify(baseline, null, 2) + "\n");

console.log(`Wrote baseline for ${Object.keys(baseline).length} grids.`);
