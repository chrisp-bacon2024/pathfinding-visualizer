import { reconstructPath, getNeighbors, MOVEMENT_MODES } from "./helpers.js";

export const dfs = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    if (start === end) return;
    const steps = [];
    const frontier = [start];
    const visited = new Set([start]);
    const cameFrom = new Map();
    let endFound = false;
    let visiting;
    while (frontier.length > 0 && !endFound){
        visiting = frontier.pop()
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