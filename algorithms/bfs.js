import { reconstructPath, getNeighbors, MOVEMENT_MODES } from "./helpers.js";

// BFS is unweighted: it finds the path with the fewest moves. In 8-way mode
// a diagonal counts as one move, the same as an orthogonal one, so the
// result minimises move count, not necessarily geometric distance or
// terrain cost.
export const bfs = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    if (start === end) return;
    const steps = [];
    const frontier = [start];
    const visited = new Set([start]);
    const cameFrom = new Map();
    let endFound = false;
    let visiting;
    while (frontier.length > 0 && !endFound){
        visiting = frontier.shift()
        if (visiting === end){
            endFound = true;
            break;
        } else if (visiting.type !== 'start'){
            steps.push({cell: visiting, state: "visited"});
        }
        for (const { cell: toVisit } of getNeighbors(grid, visiting, mode)){
            if (!visited.has(toVisit)){
                cameFrom.set(toVisit, visiting);
                if (toVisit !== end){
                    steps.push({cell: toVisit, state: "frontier"})
                }
                frontier.push(toVisit);
                visited.add(toVisit)
            };
        }
    }

    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps
}