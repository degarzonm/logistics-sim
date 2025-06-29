//create docs

// PathLayer.js is a custom Leaflet layer for rendering paths on a map.
// It extends the L.Layer class and provides methods to add, remove, and draw paths.

export class PathLayer extends L.Layer {

    // static global configuration for the layer.
    

    constructor() {
        super();
        this.paths = [];
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
        this.canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer');
        // El z-index de los paths debe ser bajo para que queden debajo de los nodos.
        this.canvas.style.zIndex = 400; 
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

    setData(paths) {
        this.paths = paths;
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.map) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;

        this.paths.forEach(path => {
            if (!path.geometry || path.geometry.length < 2) return;
            
            const points = path.geometry.map(latlng => this.map.latLngToContainerPoint(latlng));
            
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
            this.ctx.stroke();
        });

        this.ctx.globalAlpha = 1.0;
    }
}