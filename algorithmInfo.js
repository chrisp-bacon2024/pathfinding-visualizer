// Full names and short descriptions for the algorithm tooltips.
// Keys match data-algorithm in index.html.
//
// guarantee.kind: "best" = always finds the optimal path by that
// measure; "none" = no such promise.

export const algorithmInfo = {
    dfs: {
        name: "Depth-First Search",
        description: "Follows one route as far as it can, then backtracks. " +
            "Ignores terrain and rarely finds a short path.",
        guarantee: { kind: "none", label: "No shortest-path guarantee" }
    },
    bfs: {
        name: "Breadth-First Search",
        description: "Spreads out evenly in rings, one move at a time. " +
            "Ignores terrain cost.",
        guarantee: { kind: "best", label: "Fewest moves" }
    },
    dijkstra: {
        name: "Dijkstra's Algorithm",
        description: "Always expands the cheapest cell reached so far, " +
            "so it searches in every direction.",
        guarantee: { kind: "best", label: "Lowest cost" }
    },
    astar: {
        name: "A* Search",
        description: "Dijkstra plus an estimate of the distance left, which " +
            "steers it toward the end so it explores less.",
        guarantee: { kind: "best", label: "Lowest cost" }
    },
    greedy: {
        name: "Greedy Best-First Search",
        description: "Always heads for the cell that looks closest to the end. " +
            "Fast, but ignores the cost so far and can take detours.",
        guarantee: { kind: "none", label: "No shortest-path guarantee" }
    },
    bidirectionalbfs: {
        name: "Bidirectional BFS",
        description: "Runs BFS from both ends at once until the two searches " +
            "meet, usually exploring fewer cells than one BFS.",
        guarantee: { kind: "best", label: "Fewest moves" }
    },
    jps: {
        name: "Jump Point Search",
        description: "Speeds up A* on open grids by jumping along straight " +
            "lines and stopping only where the route might turn. Ignores terrain cost.",
        guarantee: { kind: "none", label: "Ignores terrain cost" }
    },
    bellmanford: {
        name: "Bellman-Ford",
        description: "Repeatedly relaxes every move until no cost improves. " +
            "Slower than Dijkstra, but also works with negative costs.",
        guarantee: { kind: "best", label: "Lowest cost" }
    },
    thetastar: {
        name: "Theta*",
        description: "A* that cuts corners with straight lines of sight, " +
            "giving smooth any-angle paths instead of grid steps.",
        guarantee: { kind: "none", label: "Short any-angle paths" },
        // Any-angle lines need diagonal movement: unavailable in 4-way.
        eightWayOnly: true
    }
};
