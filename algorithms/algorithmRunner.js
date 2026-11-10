import { dfs } from "./dfs.js";
import { bfs } from "./bfs.js";
import { dijkstra } from "./dijkstra.js";
import { aStar } from "./aStar.js"
import { greedyBestFirstSearch } from "./greedyBestFirstSearch.js";
import { biBFS } from "./biBFS.js";

const algorithms = {
    dfs,
    bfs,
    dijkstra,
    astar: aStar,
    greedy: greedyBestFirstSearch,
    bidirectionalbfs: biBFS
};

export function createAlgorithmRunner(getGrid, animator, ctx){
    return function runAlgorithm(name){
        if (animator.running) return;

        const algorithm = algorithms[name];
        if (!algorithm) return;

        const grid = getGrid();

        // Clear previous search visualization
        grid.clearVisualization(ctx);

        const steps = algorithm(grid, grid.start, grid.end);

        animator.load(steps);
        animator.start();
    }
}