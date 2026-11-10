
export class Animator {
    constructor(ctx, speed = 30) {
        this.ctx = ctx;
        this.speed = speed;
        this.steps = [];
        this.currentStep = 0;
        this.running = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.onComplete = null;
        this.onCancel = null;
        this.runId = 0;
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
        this.lastTime = 0;

        const runId = ++this.runId;

        requestAnimationFrame(time => this.animate(time, runId));
    }

    animate(time, runId) {
        if (!this.running || runId !== this.runId) return;

        if (this.lastTime === 0) {
            this.lastTime = time;
        }

        const delta = time - this.lastTime;
        this.lastTime = time;
        this.accumulator += delta;

        const interval = 1000 / this.playbackSpeed;

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

            onComplete?.();
            return;
        }

        requestAnimationFrame(time => this.animate(time, runId));
    }

    stop() {
        const wasRunning = this.running;
        const onCancel = this.onCancel;

        this.running = false;
        this.runId++;
        this.onComplete = null;
        this.onCancel = null;

        if (wasRunning) {
            onCancel?.();
        }
    }
}
