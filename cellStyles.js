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
    
        path: {
            fill: "#FACC15",
            opacity: 0.35,
            border: "#EAB308",
            borderWidth: 1
        }
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

export const hoverInteractions = {
    grass: "hoverWall",
    mud: "hoverWall",
    road: "hoverWall",
    wall: "hoverWall",
    start: "hoverDraggable",
    end: "hoverDraggable",
    frontier: "idle",
    visited: "idle",
    path: "idle"
};