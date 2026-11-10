export function getBaseTerrain() {
    return Object.keys(terrainTypes).find(
        type => terrainTypes[type].generation === "base"
    );
}

export const terrainTypes = {
    grass: {
        cost: 2,
        defaultWeight: 60,
        paintable: true,
        generation: "base",
        pathEligible: true,
        wallEligible: true
    },
    mud: {
        cost: 5,
        defaultWeight: 20,
        paintable: true,
        generation: "cluster",
        maxClusterSize: 25,
        pathEligible: true,
        wallEligible: true
    },
    road: {
        cost: 1,
        defaultWeight: 20,
        paintable: true,
        generation: "path",
        maxPathLength: 150,
        pathEligible: false,
        wallEligible: false
    },
    wall: {
        cost: Infinity,
        defaultWeight: 0,
        paintable: true,
        generation: "wall",
        pathEligible: false,
        wallEligible: true
    }
};