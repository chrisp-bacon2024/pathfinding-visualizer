
export class Animator {
    constructor(ctx, speed = 30) {
        this.ctx = ctx;
        this.speed = speed;
        this.steps = [];
        this.currentStep = 0;
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.onComplete = null;
        this.onCancel = null;
        this.runId = 0;
        this.listeners = new Set();

        // User-chosen speed multiplier (1 = normal). Kept across loads.
        this.speedMultiplier = 1;
    }

    setSpeedMultiplier(multiplier) {
        if (!Number.isFinite(multiplier) || multiplier <= 0) return;

        this.speedMultiplier = multiplier;
    }

    // "playing", "paused" or "idle".
    get state() {
        if (this.running) return "playing";
        if (this.paused) return "paused";
        return "idle";
    }

    // Register a callback that fires whenever the playback state changes.
    // Returns a function that removes the callback.
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        const state = this.state;
        this.listeners.forEach(listener => listener(state));
    }

    load(steps, options = {}) {
        this.stop();

        this.steps = steps;
        this.currentStep = 0;
        this.accumulator = 0;

        this.playbackSpeed = options.duration
            ? steps.length / (options.duration / 1000)
            : this.speed;

        this.onComplete = options.onComplete ?? null;
        this.onCancel = options.onCancel ?? null;
    }

    start() {
        if (this.running) return;

        this.running = true;
        this.paused = false;
        this.lastTime = 0;

        const runId = ++this.runId;

        requestAnimationFrame(time => this.animate(time, runId));
        this.notify();
    }

    // Freeze playback in place. Steps, progress and callbacks are kept.
    pause() {
        if (!this.running) return;

        this.running = false;
        this.paused = true;

        // Invalidate the pending animation frame.
        this.runId++;

        this.notify();
    }

    // Continue from the step where playback was paused.
    resume() {
        if (!this.paused) return;

        // start() resets lastTime, so the time spent paused
        // does not count towards the next frame.
        this.start();
    }

    togglePause() {
        if (this.running) {
            this.pause();
        } else if (this.paused) {
            this.resume();
        }
    }

    animate(time, runId) {
        if (!this.running || runId !== this.runId) return;

        if (this.lastTime === 0) {
            this.lastTime = time;
        }

        const delta = time - this.lastTime;
        this.lastTime = time;
        this.accumulator += delta;

        // Read every frame so speed changes apply mid-playback.
        const interval =
            1000 / (this.playbackSpeed * this.speedMultiplier);

        while (
            this.accumulator >= interval &&
            this.currentStep < this.steps.length
        ) {
            const step = this.steps[this.currentStep];

            if (step.type === "terrain") {
                step.cell.setType(step.terrainType, this.ctx);
                step.cell.setSearchState("idle", this.ctx);
            } else {
                step.cell.setSearchState(step.state, this.ctx);
            }

            this.currentStep++;
            this.accumulator -= interval;
        }

        if (this.currentStep >= this.steps.length) {
            const onComplete = this.onComplete;

            this.running = false;
            this.onComplete = null;
            this.onCancel = null;

            this.notify();
            onComplete?.();
            return;
        }

        requestAnimationFrame(time => this.animate(time, runId));
    }

    stop() {
        const wasActive = this.running || this.paused;
        const onCancel = this.onCancel;

        this.running = false;
        this.paused = false;
        this.runId++;
        this.onComplete = null;
        this.onCancel = null;

        if (wasActive) {
            this.notify();
            onCancel?.();
        }
    }
}
