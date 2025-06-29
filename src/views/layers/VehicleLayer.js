export class VehicleLayer extends L.Layer {
  constructor() {
    super();
    this.vehicles = [];
  }

  onAdd(map) {
    this.map = map;
    this._initCanvas();
    map.on("moveend", this._reset, this); // 'moveend' es más eficiente que 'move'
    map.on("resize", this._resize, this);
  }

  onRemove(map) {
    map.getPanes().overlayPane.removeChild(this.canvas);
    map.off("moveend", this._reset, this);
    map.off("resize", this._resize, this);
  }

  _initCanvas() {
    this.canvas = L.DomUtil.create(
      "canvas",
      "leaflet-canvas-layer vehicle-layer"
    );
    this.canvas.width = this.map.getSize().x;
    this.canvas.height = this.map.getSize().y;
    this.ctx = this.canvas.getContext("2d");
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

  setData(vehicles) {
    this.vehicles = vehicles;
    this.draw();
  }

  draw() {
    if (!this.ctx || !this.map) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const scaleFactor = 1 + (this.map.getZoom() - 15) * 0.1;

    this.vehicles.forEach((vehicle) => {
    
      const point = this.map.latLngToContainerPoint([vehicle.lat, vehicle.lng]);
      const radius = 6 * scaleFactor;

      // --- Lógica de color por estado ---
      let fillColor = "#FCD144"; // Amarillo por defecto (EN_MISION)
      if (vehicle.status === "LIBRE") {
        fillColor = "#00FFFF"; // Cian (LIBRE)
      }
      if (vehicle.selected) {
        fillColor = "#FF00FF"; // Magenta (SELECCIONADO)
      }

      // Dibujar círculo del vehículo
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      this.ctx.closePath();

      // Dibujar borde
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Mostrar cantidad de carga
      const totalCarga = vehicle.getCargaTotal();
      if (totalCarga > 0) {
        this.ctx.font = `${Math.round(10 * scaleFactor)}px Arial`;
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          totalCarga.toString(),
          point.x,
          point.y + radius + 12
        );
      }
    });
  }

  getVehicleAtPoint(x, y) {
    const scaleFactor = 1 + (this.map.getZoom() - 15) * 0.1;
    const radius = 6 * scaleFactor;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];
      if (!vehicle.enMapa) continue;

      const point = this.map.latLngToContainerPoint([vehicle.lat, vehicle.lng]);
      if (Math.hypot(point.x - x, point.y - y) <= radius) {
        return vehicle;
      }
    }
    return null;
  }
}
