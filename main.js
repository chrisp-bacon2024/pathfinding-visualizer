
import { Grid } from './grid.js';
import { Animator } from './animator.js';
import { createAlgorithmRunner } from './algorithms/algorithmRunner.js'
import { setupGridInteractions } from "./gridInteractions.js";
import { createTerrainRunner } from "./terrain/terrainRunner.js";
import { setupPlaybackControls } from "./playbackControls.js";
import { MOVEMENT_MODES } from "./algorithms/helpers.js";

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

// Algorithm playback. This is the only animator the playback
// controls (slider, play/pause, speed) are connected to.
const animator = new Animator(ctx, 30);

// Map generation gets its own animator so it never moves the
// playback slider or responds to the playback controls.
const terrainAnimator = new Animator(ctx);

setupGridInteractions(canvas, () => grid, animator, terrainAnimator, ctx);
setupPlaybackControls(animator);

// "4" (orthogonal) or "8" (orthogonal + diagonal). Defaults to 4-way.
let movementMode = MOVEMENT_MODES.FOUR;

const algorithmRunner = createAlgorithmRunner(
    () => grid,
    animator,
    ctx,
    () => movementMode
);

const movementToggle = document.getElementById("movement-toggle-btn");
const movementText = movementToggle.querySelector(".movement-text");
const movementIcons = movementToggle.querySelectorAll(".movement-icon");

const movementLabels = {
    [MOVEMENT_MODES.FOUR]: {
        text: "4-way",
        ariaLabel: "Directions: 4-way. Click to switch to 8-way.",
        title: "4-way: up, down, left and right only. Click to switch to 8-way."
    },
    [MOVEMENT_MODES.EIGHT]: {
        text: "8-way",
        ariaLabel: "Directions: 8-way. Click to switch to 4-way.",
        title: "8-way: diagonals allowed, without cutting corners. Diagonal " +
            "steps cost √2× the terrain cost. BFS and Bi-BFS count a diagonal " +
            "as one move, so they find the fewest moves, not the shortest " +
            "distance. Click to switch to 4-way."
    }
};

function setMovementMode(mode) {
    if (mode === movementMode) return;

    movementMode = mode;

    const label = movementLabels[mode];
    movementText.textContent = label.text;
    movementToggle.setAttribute("aria-label", label.ariaLabel);
    movementToggle.title = label.title;

    // SVG elements have no .hidden property (it only exists on HTML
    // elements), so set the attribute directly.
    movementIcons.forEach(icon => {
        icon.toggleAttribute("hidden", icon.dataset.mode !== mode);
    });

    // The current search was for the other mode. Discard its playback and
    // clear its colours, leaving terrain, walls, start and end untouched.
    animator.clear();
    grid.clearVisualization(ctx);
}

movementToggle.addEventListener("click", () => {
    setMovementMode(
        movementMode === MOVEMENT_MODES.FOUR
            ? MOVEMENT_MODES.EIGHT
            : MOVEMENT_MODES.FOUR
    );
});

function runAlgorithm(name) {
    // Don't search a map that is still being generated.
    if (terrainAnimator.running) return;

    algorithmRunner(name);
}

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

        terrainAnimator.load(steps, {
            duration,
            onComplete: () => resolve(true),
            onCancel: () => resolve(false)
        });

        terrainAnimator.start();
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
    // Cancel any map generation already in progress.
    terrainAnimator.stop();

    // A new map invalidates any algorithm playback: its steps and
    // undo history refer to the old terrain. This also resets the slider.
    animator.clear();

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

    // The loaded steps point at the old grid's cells.
    animator.clear();
    terrainAnimator.stop();
    grid = createGrid();
});

observer.observe(container);