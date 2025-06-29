// src/core/GameLoop.js

export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.update = updateCallback;
        this.render = renderCallback;
        this.lastTime = 0;
        this.isRunning = false;
        this.animationFrameId = null;

        // Bind 'this' para que no se pierda en el contexto de requestAnimationFrame
        this.loop = this.loop.bind(this);
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        if (!this.lastTime) {
            this.lastTime = currentTime;
        }
        const dt = currentTime - this.lastTime;
        
        // Llamar a los callbacks de lógica y renderizado
        this.update(dt, Date.now());
        this.render();

        this.lastTime = currentTime;
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrameId);
    }
}