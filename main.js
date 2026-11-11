
import { Grid } from './grid.js';
import { Animator } from './animator.js';
import { createAlgorithmRunner, hasAlgorithm } from './algorithms/algorithmRunner.js'
import { setupGridInteractions } from "./gridInteractions.js";
import { createTerrainRunner } from "./terrain/terrainRunner.js";
import { setupPlaybackControls } from "./playbackControls.js";
import { MOVEMENT_MODES } from "./algorithms/helpers.js";
import { PathOverlay } from "./pathOverlay.js";
import { algorithmColors } from "./cellStyles.js";
import { setupDropdown } from "./dropdown.js";
import { computeRunStats } from "./runStats.js";
import { algorithmInfo } from "./algorithmInfo.js";
import { setupAlgorithmTooltip } from "./algorithmTooltip.js";

const cellSize = 25;

// Get canvas
const canvas = document.getElementById("gridCanvas");
const container = document.querySelector(".gridContainer");
const ctx = canvas.getContext("2d");

const algorithmButtons = document.querySelectorAll(".algorithm-btn");

// Each button's sliver uses its algorithm's path colour.
algorithmButtons.forEach(button => {
    const color = algorithmColors[button.dataset.algorithm];
    if (color) button.style.setProperty("--path-color", color);
});

// Cost, moves, cells explored and time for each algorithm in the
// comparison, shown in the algorithm tooltips.
const runStats = new Map();

const algorithmTooltip = setupAlgorithmTooltip({
    buttons: algorithmButtons,
    info: algorithmInfo,
    colors: algorithmColors,
    getStats: () => runStats,
    isImplemented: hasAlgorithm
});

// Algorithm paths, drawn as coloured lines above the grid. Paths from
// earlier runs stay until the grid changes or Clear Paths is pressed.
const pathOverlay = new PathOverlay(document.getElementById("pathCanvas"), {
    cellSize,
    order: [...algorithmButtons].map(button => button.dataset.algorithm),
    colors: algorithmColors,
    onChange: names => {
        algorithmButtons.forEach(button => {
            button.classList.toggle("has-path", names.includes(button.dataset.algorithm));
        });

        // Stats follow the comparison: cleared together with the paths.
        for (const name of runStats.keys()) {
            if (!names.includes(name)) runStats.delete(name);
        }
        algorithmTooltip.refresh();
    }
});

const createGrid = () => {
    const cols = Math.floor(container.clientWidth / cellSize);
    const rows = Math.floor(container.clientHeight / cellSize);

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    const newGrid = new Grid(rows, cols, cellSize);
    newGrid.draw(ctx);
    pathOverlay.resize(canvas.width, canvas.height);

    return newGrid;
};

let grid = createGrid();

// Algorithm playback. This is the only animator the playback
// controls (slider, play/pause, speed) are connected to.
const animator = new Animator(ctx, 30);

// Map generation gets its own animator so it never moves the
// playback slider or responds to the playback controls.
const terrainAnimator = new Animator(ctx);

// Removes every kept path, the current playback and its search
// colours. Used whenever the grid changes, since paths found on the old
// grid no longer apply, and by the Clear Paths button.
function clearComparison() {
    animator.clear();
    pathOverlay.clear();
    grid.clearVisualization(ctx);
}

setupGridInteractions(canvas, () => grid, animator, terrainAnimator, ctx, clearComparison);
setupPlaybackControls(animator);

// Grow and shrink the current path line with playback and scrubbing.
animator.subscribeProgress(current => pathOverlay.setProgress(current));

// "4" (orthogonal) or "8" (orthogonal + diagonal). Defaults to 4-way.
let movementMode = MOVEMENT_MODES.FOUR;

const algorithmRunner = createAlgorithmRunner(
    () => grid,
    animator,
    ctx,
    () => movementMode,
    (name, steps, runGrid, elapsedMs) => {
        runStats.set(name, computeRunStats({
            grid: runGrid,
            steps,
            mode: movementMode,
            elapsedMs
        }));
        pathOverlay.startRun(name, steps, runGrid.start, runGrid.end);
    }
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

    // Paths found in the other mode no longer apply. Clears them, the
    // playback and its colours, leaving terrain, walls, start and end.
    clearComparison();
}

movementToggle.addEventListener("click", () => {
    setMovementMode(
        movementMode === MOVEMENT_MODES.FOUR
            ? MOVEMENT_MODES.EIGHT
            : MOVEMENT_MODES.FOUR
    );
});

// Highlight the button of the most recently run algorithm.
function markLastRun(name) {
    algorithmButtons.forEach(button => {
        const isLastRun = button.dataset.algorithm === name;

        button.classList.toggle("selected", isLastRun);
        button.setAttribute("aria-pressed", String(isLastRun));
    });
}

// A window too short (or narrow) for even one row of cells gives a grid
// with no start or end. Searching it would never finish.
const gridIsUsable = () => Boolean(grid.start && grid.end);

function runAlgorithm(name) {
    // Don't search a map that is still being generated.
    if (terrainAnimator.running || !gridIsUsable()) return;

    if (algorithmRunner(name)) {
        markLastRun(name);
    }
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

algorithmButtons.forEach(button => {
    button.addEventListener("click", () => {
        runAlgorithm(button.dataset.algorithm)
    });
});

const runTerrainGenerator = createTerrainRunner(
    () => grid,
    ctx
);

async function generateMap() {
    if (!gridIsUsable()) return;

    // Cancel any map generation already in progress.
    terrainAnimator.stop();

    // A new map invalidates any algorithm playback and kept paths: they
    // refer to the old terrain. This also resets the slider.
    clearComparison();

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

document.querySelector("#clear-paths-btn")
    .addEventListener("click", clearComparison);

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

    // The loaded steps and kept paths point at the old grid's cells.
    animator.clear();
    pathOverlay.clear();
    terrainAnimator.stop();
    grid = createGrid();
});

observer.observe(container);

// Algorithm and paint buttons collapse into dropdowns on small screens.
document.querySelectorAll("[data-dropdown]").forEach(setupDropdown);
