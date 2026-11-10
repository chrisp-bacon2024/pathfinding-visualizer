import { getNeighbors, MOVEMENT_MODES } from "./helpers.js";

const reconstructBidirectionalPath = (
    startCameFrom,
    endCameFrom,
    start,
    end,
    meetingNode,
    steps
) => {
    let path = [];
    let node = startCameFrom.get(meetingNode);
    while (node !== start){
        path.push(node);
        node = startCameFrom.get(node);
    }

    path.reverse().forEach(node => {
        steps.push({cell: node, state: "path"});
    });

    if (meetingNode !== start && meetingNode !== end) {
        steps.push({cell: meetingNode, state: "path"});
    }

    if (meetingNode !== end){
        path = [];
        node = endCameFrom.get(meetingNode);

        while (node !== end){
            path.push(node);
            node = endCameFrom.get(node);
        }

        path.forEach(node => {
            steps.push({cell: node, state: "path"});
        });
    }

}

// Like BFS, unweighted: it minimises the number of moves. In 8-way mode a
// diagonal counts as one move, so the result is not necessarily the
// shortest in geometric distance or terrain cost. Searching backwards from
// the end is valid in both modes because every move is reversible
// (including the no-corner-cutting rule, which is symmetric).
export const biBFS = (grid, start, end, mode = MOVEMENT_MODES.FOUR) => {
    const steps = [];
    const startFrontier = [start];
    const startDiscovered = new Set([start]);
    const startCameFrom = new Map();
    const endFrontier = [end];
    const endDiscovered = new Set([end]);
    const endCameFrom = new Map();
    let meetingNode = null;
    let startVisiting, endVisiting;
    
    while (startFrontier.length > 0 && endFrontier.length > 0 && !meetingNode){
        let startToExplore = startFrontier.length;
        while (startToExplore > 0){
            startVisiting = startFrontier.shift();
            startToExplore--;
            if (startVisiting.type !== 'start'){
            steps.push({cell: startVisiting, state: "visited"});
            }

            for (const { cell: startToVisit } of getNeighbors(grid, startVisiting, mode)){
                if (!startDiscovered.has(startToVisit)){
                    startCameFrom.set(startToVisit, startVisiting);
                    startDiscovered.add(startToVisit)
                    if (startToVisit !== start && startToVisit !== end){
                        steps.push({cell: startToVisit, state: "frontier"})
                    }
                    if (endDiscovered.has(startToVisit)){
                        meetingNode = startToVisit;
                        break
                    }
                    startFrontier.push(startToVisit);
                };
            };
            if (meetingNode) break;
        };
        if (meetingNode) break;
        let endToExplore = endFrontier.length;
        while (endToExplore > 0){
            endVisiting = endFrontier.shift();
            endToExplore--;
            if (endVisiting.type !== 'end'){
                steps.push({cell: endVisiting, state: "visited"});
            };

            for (const { cell: endToVisit } of getNeighbors(grid, endVisiting, mode)) {
                if (!endDiscovered.has(endToVisit)){
                    endCameFrom.set(endToVisit, endVisiting);
                    endDiscovered.add(endToVisit);
                    if (endToVisit !== start && endToVisit !== end){
                        steps.push({cell: endToVisit, state: "frontier"})
                    }
                    if (startDiscovered.has(endToVisit)){
                        meetingNode = endToVisit;
                        break;
                    }
                    endFrontier.push(endToVisit);
                };
            }
            if (meetingNode) break;
        }
    }
    if (meetingNode){
        reconstructBidirectionalPath(
            startCameFrom,
            endCameFrom,
            start,
            end,
            meetingNode,
            steps
        )
    }
    return steps;
}