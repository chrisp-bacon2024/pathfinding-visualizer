import { reconstructPath, directions } from "./helpers.js";

export const bfs = (grid, start, end) => {
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
        for (const [dr, dc] of directions){
            const newRow = visiting.row + dr;
            const newCol = visiting.col + dc;

            if (
                newRow >= 0 &&
                newRow < grid.nRows &&
                newCol >= 0 &&
                newCol < grid.nCols
            ) {
                const toVisit = grid.rows[newRow][newCol];
                if (!visited.has(toVisit) && toVisit.type !== "wall"){
                    cameFrom.set(toVisit, visiting);
                    if (toVisit !== end){
                        steps.push({cell: toVisit, state: "frontier"})
                    }
                    frontier.push(toVisit);
                    visited.add(toVisit)
                };
            }
        }
    }

    if (endFound){
        reconstructPath(cameFrom, start, end, steps);
    }
    return steps
}