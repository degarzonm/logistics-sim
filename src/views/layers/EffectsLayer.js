import { hexToRgb } from '../../utils/utils.js';

export class EffectsLayer extends L.Layer {
    constructor() {
        super();
        this.effects = [];
    }

    onAdd(map) {
        this.map = map;
        this._initCanvas();
        map.on('moveend', this._reset, this);
        map.on('resize', this._resize, this);
    }

    onRemove(map) {
        map.getPanes().overlayPane.removeChild(this.canvas);
        map.off('moveend', this._reset, this);
        map.off('resize', this._resize, this);
    }

    _initCanvas() {
        this.canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer effects-layer');
        this.canvas.width = this.map.getSize().x;
        this.canvas.height = this.map.getSize().y;
        this.ctx = this.canvas.getContext('2d');
        this.map.getPanes().overlayPane.appendChild(this.canvas);
    }

    _reset() {
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);
    }

    _resize(e) {
        this.canvas.width = e.newSize.x;
        this.canvas.height = e.newSize.y;
    }

    // El GameLoop llamará a este método en cada frame.
    draw() {
        if (!this.ctx || !this.map) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const now = Date.now();
        const DURATION = 1200; // ms

        // Iterar al revés para poder eliminar elementos de forma segura
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            const elapsedTime = now - effect.startTime;

            if (elapsedTime > DURATION) {
                this.effects.splice(i, 1);
                continue;
            }

            const progress = elapsedTime / DURATION;
            const alpha = 1 - progress;

            if (effect.type === 'text') {
                this.drawTextEffect(effect, alpha, progress);
            }
        }
    }
    
    drawTextEffect(effect, alpha, progress) {
        const point = this.map.latLngToContainerPoint([effect.lat, effect.lng]);
        const { r, g, b } = hexToRgb(effect.color);
        
        this.ctx.save();
        this.ctx.font = "bold 14px Arial";
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        this.ctx.textAlign = "center";
        
        const yOffset = -15 - (progress * 20); // El texto se mueve hacia arriba
        this.ctx.fillText(effect.text, point.x, point.y + yOffset);
        
        this.ctx.restore();
    }

    addEffect(effect) {
        this.effects.push(effect);
    }
}