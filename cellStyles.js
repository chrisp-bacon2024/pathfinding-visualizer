export const cellStyles = {
    default: {
        fill: "white",
        border: "#ddd",
        borderWidth: 1
    },

    types: {
        grass: {
            colors: ["#65c98b", "#78e69e", "#86efac", "#a1f3be"]
        },
        mud: {
            colors: ["#92400e", "#a64b0b", "#b45309", "#c66a22"]
        },
        road: {
            fill: "#656B70",
            colors: [
                "#5C6267",
                "#62686D",
                "#696F74",
                "#70767B"
            ]
        },
        wall: {
            colors: ["#171717", "#222222", "#2c2c2c"]
        },
        start: { fill: "#16a34a", border: "#14532d" },
        end: { fill: "#dc2626", border: "#991b1b" }
    },

    searchStates: {
        idle: {},

        // Cells examined while scanning for jump points (JPS) but
        // never added to the priority queue.
        scanned: {
            fill: "#8B7BC8",
            opacity: 0.22,
            border: "#8B7BC8",
            borderWidth: 0.75
        },

        frontier: {
            fill: "#3B82F6",
            opacity: 0.25,
            border: "#2563EB",
            borderWidth: 3
        },
    
        visited: {
            fill: "#06B6D4",
            opacity: 0.12,
            border: "#0891B2",
            borderWidth: 0.75
        },
    
        // Path cells show plain terrain: the path itself is drawn as a
        // coloured line on the path overlay (pathOverlay.js).
        path: {}
    },

    interactions: {
        idle: {},

        hoverWall: {
            fill: "#ddd",
            border: "#888",
            borderWidth: 2
        },

        hoverDraggable: {
            border: "yellow",
            borderWidth: 3
        },

        dragging: {
            border: "orange",
            borderWidth: 3
        }
    }
};

// Path line colour for each algorithm (keys match data-algorithm in
// index.html). Also shown as a sliver on the algorithm's button.
export const algorithmColors = {
    dfs: "#F97316",
    bfs: "#FACC15",
    dijkstra: "#EC4899",
    astar: "#EF4444",
    greedy: "#A855F7",
    bidirectionalbfs: "#22D3EE",
    jps: "#3B82F6",
    bellmanford: "#FFFFFF",
    thetastar: "#A3E635"
};

export const hoverInteractions = {
    grass: "hoverWall",
    mud: "hoverWall",
    road: "hoverWall",
    wall: "hoverWall",
    start: "hoverDraggable",
    end: "hoverDraggable",
    scanned: "idle",
    frontier: "idle",
    visited: "idle",
    path: "idle"
};