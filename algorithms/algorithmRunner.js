import { dfs } from "./dfs.js";
import { bfs } from "./bfs.js";
import { dijkstra } from "./dijkstra.js";
import { aStar } from "./aStar.js"
import { greedyBestFirstSearch } from "./greedyBestFirstSearch.js";
import { biBFS } from "./biBFS.js";
import { jps } from "./jps.js";

const algorithms = {
    dfs,
    bfs,
    dijkstra,
    astar: aStar,
    greedy: greedyBestFirstSearch,
    bidirectionalbfs: biBFS,
    jps
};

export function createAlgorithmRunner(getGrid, animator, ctx, getMovementMode = () => "4", onRunStart = () => {}){
    // Returns true if the algorithm started, false if the run was ignored.
    return function runAlgorithm(name){
        if (animator.running) return false;

        const algorithm = algorithms[name];
        if (!algorithm) return false;

        const grid = getGrid();

        // Clear previous search visualization
        grid.clearVisualization(ctx);

        const steps = algorithm(grid, grid.start, grid.end, getMovementMode());

        // Lets the path overlay record the run before playback starts.
        onRunStart(name, steps, grid);

        animator.load(steps);
        animator.start();
        return true;
    }
}