
export function setupPlaybackControls(animator) {
    const playPauseButton = document.getElementById("play-pause-btn");

    const render = state => {
        const isPlaying = state === "playing";

        playPauseButton.textContent = isPlaying ? "❚❚" : "▶";
        playPauseButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
        playPauseButton.setAttribute("aria-pressed", String(isPlaying));

        // Nothing to play or pause when no playback is loaded.
        playPauseButton.disabled = state === "idle";
    };

    playPauseButton.addEventListener("click", () => {
        animator.togglePause();
    });

    animator.subscribe(render);
    render(animator.state);
}
