import { dfs } from "./dfs.js";
import { bfs } from "./bfs.js";
import { dijkstra } from "./dijkstra.js";
import { aStar } from "./aStar.js"
import { greedyBestFirstSearch } from "./greedyBestFirstSearch.js";
import { biBFS } from "./biBFS.js";
import { jps } from "./jps.js";
import { bellmanFord } from "./bellmanFord.js";
import { thetaStar } from "./thetaStar.js";

const algorithms = {
    dfs,
    bfs,
    dijkstra,
    astar: aStar,
    greedy: greedyBestFirstSearch,
    bidirectionalbfs: biBFS,
    jps,
    bellmanford: bellmanFord,
    thetastar: thetaStar
};

// How long to spend re-running a search to time it (see below).
const TIMING_BUDGET_MS = 20;
const MAX_TIMING_RUNS = 100;

// Whether a button's algorithm has an implementation yet.
export const hasAlgorithm = name => Object.hasOwn(algorithms, name);

export function createAlgorithmRunner(getGrid, animator, ctx, getMovementMode = () => "4", onRunStart = () => {}){
    // Returns true if the algorithm started, false if the run was ignored.
    return function runAlgorithm(name){
        if (animator.running) return false;

        const algorithm = algorithms[name];
        if (!algorithm) return false;

        const grid = getGrid();

        // Clear previous search visualization
        grid.clearVisualization(ctx);

        const mode = getMovementMode();
        const search = () => algorithm(grid, grid.start, grid.end, mode);

        // Time only the search, not the animation. One search usually
        // takes well under a millisecond, below the browser timer's
        // precision, so repeat it (the algorithms only read the grid)
        // for about TIMING_BUDGET_MS and report the average.
        let startTime = performance.now();
        const steps = search();
        let totalMs = performance.now() - startTime;
        let runs = 1;

        while (totalMs < TIMING_BUDGET_MS && runs < MAX_TIMING_RUNS) {
            startTime = performance.now();
            search();
            totalMs += performance.now() - startTime;
            runs++;
        }

        const elapsedMs = totalMs / runs;

        // Lets the path overlay and comparison stats record the run
        // before playback starts.
        onRunStart(name, steps, grid, elapsedMs);

        animator.load(steps);
        animator.start();
        return true;
    }
}