const noisePoints = new Map();
import { cellStyles } from "../cellStyles.js";

function randomAt(x, y) {
    const key = `${x},${y}`;

    if (!noisePoints.has(key)) {
        noisePoints.set(key, Math.random());
    }

    return noisePoints.get(key);
}

export function smoothNoise(x, y, scale = 5) {
    const gx = x / scale;
    const gy = y / scale;

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);

    const tx = gx - x0;
    const ty = gy - y0;

    const fade = t => t * t * (3 - 2 * t);

    const sx = fade(tx);
    const sy = fade(ty);

    const lerp = (a, b, t) => a + (b - a) * t;

    const top = lerp(
        randomAt(x0, y0),
        randomAt(x0 + 1, y0),
        sx
    );

    const bottom = lerp(
        randomAt(x0, y0 + 1),
        randomAt(x0 + 1, y0 + 1),
        sx
    );

    return lerp(top, bottom, sy);
}

export function getTerrainColor(type, row, col) {
    const style = cellStyles.types[type];

    if (!style.colors) return style.fill;

    const noise = smoothNoise(col, row, 5);

    const index = Math.min(
        Math.floor(noise * style.colors.length),
        style.colors.length - 1
    );

    return style.colors[index];
}