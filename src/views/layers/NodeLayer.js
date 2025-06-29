import { GameState } from '../../core/GameState.js';
import { getNodeColor } from '../../utils/utils.js';

export class NodeLayer extends L.Layer {



    constructor() {
        super();
        this.nodes = [];
        

    }

    onAdd(map) {
        this.map = map;
        this._initCanvas();
        map.on('move', this._reset, this);
        map.on('resize', this._resize, this);
    }

    onRemove(map) {
        map.getPanes().overlayPane.removeChild(this.canvas);
        map.off('move', this._reset, this);
        map.off('resize', this._resize, this);
    }

    _initCanvas() {
        this.canvas = L.DomUtil.create('canvas', 'node-layer');
        this.canvas.width = this.map.getSize().x;
        this.canvas.height = this.map.getSize().y;
        this.ctx = this.canvas.getContext('2d');
        this.map.getPanes().overlayPane.appendChild(this.canvas);
        this._reset();
    }

    _reset() {
        const topLeft = this.map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);
        this.draw();
    }

    _resize(e) {
        this.canvas.width = e.newSize.x;
        this.canvas.height = e.newSize.y;
    }

    getCanvasElement() {
        return this.canvas;
    }

    setData(nodes) {
        this.nodes = nodes; 
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.map) return;
        const scaleFactor = 1 + (this.map.getZoom() - 15) * 0.15;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // La lógica de dibujar Paths ha sido eliminada.
        this.nodes.forEach(node => this._drawNode(node, scaleFactor));
    }

    _drawNode(node, scaleFactor) {
        const point = this.map.latLngToContainerPoint([node.lat, node.lng]);
        const radius = node.size * scaleFactor;

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, Math.abs(radius), 0, Math.PI * 2);
        this.ctx.fillStyle = getNodeColor(node.type);
        this.ctx.fill();

        if (node.selected) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, Math.abs(radius)+ 2, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        if( true){
            const inventoryText = Object.entries(node.inventory)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => `${key}:${value}`)
            .join(', ');
        if (inventoryText) {
            this.ctx.font = `${Math.round(12 * scaleFactor)}px Arial`;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(inventoryText, point.x, point.y - radius - 5);
        }
    }
    }

    getNodeAtPoint(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const point = this.map.latLngToContainerPoint([node.lat, node.lng]);
            const scaleFactor = 1 + (this.map.getZoom() - 15) * 0.15;
            const radius = node.size * scaleFactor;

            if (Math.hypot(point.x - x, point.y - y) <= radius) {
                return node;
            }
        }
        return null;
    }
}