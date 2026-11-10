
import { Grid } from './grid.js';
import { Animator } from './animator.js';
import { createAlgorithmRunner } from './algorithms/algorithmRunner.js'
import { setupGridInteractions } from "./gridInteractions.js";
import { createTerrainRunner } from "./terrain/terrainRunner.js";

const cellSize = 25;

// Get canvas
const canvas = document.getElementById("gridCanvas");
const container = document.querySelector(".gridContainer");
const ctx = canvas.getContext("2d");

const createGrid = () => {
    const cols = Math.floor(container.clientWidth / cellSize);
    const rows = Math.floor(container.clientHeight / cellSize);

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    const newGrid = new Grid(rows, cols, cellSize);
    newGrid.draw(ctx);

    return newGrid;
};

let grid = createGrid();

const animator = new Animator(ctx, 30);

setupGridInteractions(canvas, () => grid, animator, ctx);

const runAlgorithm = createAlgorithmRunner(
    () => grid,
    animator,
    ctx
);

function animateTerrain(changes, duration = 2000) {
    return new Promise(resolve => {
        if (changes.length === 0) {
            resolve(true);
            return;
        }

        const steps = changes.map(change => ({
            type: "terrain",
            cell: grid.rows[change.row][change.col],
            terrainType: change.type
        }));

        animator.load(steps, {
            duration,
            onComplete: () => resolve(true),
            onCancel: () => resolve(false)
        });

        animator.start();
    });
}

document.querySelectorAll(".algorithm-btn").forEach(button => {
    button.addEventListener("click", () => {
        runAlgorithm(button.dataset.algorithm)
    });
});

const runTerrainGenerator = createTerrainRunner(
    () => grid,
    ctx
);

async function generateMap() {
    animator.stop();
    grid.resetTerrain("grass", ctx);

    const stages = [
        ["mud", 500],
        ["wall", 900],
        ["road", 600]
    ];

    for (const [type, duration] of stages) {
        const changes = runTerrainGenerator(type, true);

        const completed = await animateTerrain(changes, duration);

        if (!completed) return;
    }
}

document.querySelector("#generate-map-btn")
    .addEventListener("click", generateMap);

const algorithmShortcuts = {
    d: "dfs",
    b: "bfs",
    j: "dijkstra",
    a: "astar"
}

window.addEventListener("keydown", event => {
    if (event.repeat) return;

    const algorithm = algorithmShortcuts[event.key.toLowerCase()];

    if (algorithm) {
        runAlgorithm(algorithm);
    }
});

// Only recreate the grid when its dimensions actually change.
const observer = new ResizeObserver(() => {
    const cols = Math.floor(container.clientWidth / cellSize);
    const rows = Math.floor(container.clientHeight / cellSize);

    if (rows === grid.nRows && cols === grid.nCols) return;

    animator.stop();
    grid = createGrid();
});

observer.observe(container);