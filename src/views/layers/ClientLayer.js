export class ClientLayer extends L.Layer {
    constructor() {
        super();
        this.clients = [];
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
        this.canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer client-layer');
        this.canvas.width = this.map.getSize().x;
        this.canvas.height = this.map.getSize().y;
        this.ctx = this.canvas.getContext('2d');
        this.map.getPanes().overlayPane.appendChild(this.canvas);
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

    setData(clients) {
        this.clients = clients;
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.map) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.clients.forEach(client => {
            if (client.atendido || client.desistio) return;
            
            const point = this.map.latLngToContainerPoint([client.lat, client.lng]);
            
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            this.ctx.fillStyle = "gray";
            this.ctx.fill();

            // Barra de tiempo de espera
            const waitRatio = client.tiempoEnEspera / client.tiempoEsperaMax;
            this.ctx.fillStyle = waitRatio > 0.7 ? '#FF4136' : '#FFDC00'; // Rojo si está por acabarse, si no amarillo
            this.ctx.fillRect(point.x - 10, point.y - 12, 20 * (1-waitRatio), 3);
            this.ctx.strokeStyle = '#333333';
            this.ctx.strokeRect(point.x - 10, point.y - 12, 20, 3);
        });
    }
}