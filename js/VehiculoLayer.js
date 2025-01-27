/****************************************************
 * CLASE PARTICLELAYER
 *  Capa personalizada de Leaflet para dibujar partículas en Canvas.
 ****************************************************/
class VehiculoLayer extends L.Layer {
    constructor() {
      super();
      this.particles = [];
    }
  
    onAdd(map) {
      this.map = map;
  
      // Crear el elemento Canvas
      this.canvas = L.DomUtil.create('canvas', 'particle-layer');
      this.canvas.width = map.getSize().x;
      this.canvas.height = map.getSize().y;
      this.ctx = this.canvas.getContext('2d');
  
      // Añadir el Canvas al pane de overlay
      let pane = map.getPanes().overlayPane;
      pane.appendChild(this.canvas);
  
      // Escuchar eventos de movimiento y redimensionamiento para ajustar el Canvas
      map.on('move', this._reset, this);
      map.on('resize', this._resize, this);
      //L.DomEvent.disableContextMenu(this.canvas);
      this.draw(); // Dibujar inicialmente
    }
  
    onRemove(map) {
      // Remover el Canvas del pane
      let pane = map.getPanes().overlayPane;
      pane.removeChild(this.canvas);
  
      // Remover listeners
      map.off('move', this._reset, this);
      map.off('resize', this._resize, this);
    }
  
    // Ajustar la posición del Canvas según el movimiento del mapa
    _reset() {
      let topLeft = this.map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this.canvas, topLeft);
      this.draw();
    }
  
    // Ajustar el tamaño del Canvas según el redimensionamiento del mapa
    _resize(e) {
      this.canvas.width = e.newSize.x;
      this.canvas.height = e.newSize.y;
      this.draw();
    }
  
    // Actualizar los vehículos a dibujar
    
  
    // Dibujar todos los vehículos en el Canvas
    draw() {
      if (!this.ctx) return;
  
      // Limpiar el Canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Dibujar cada vehículo
      mundo.vehiculos.forEach((veh) => {
        this.display(veh);
      });
    }

    display(vehiculo ) {
        let latlng = vehiculo.latLngActual();
        if (!latlng) return;

        let point = this.map.latLngToContainerPoint(latlng);

        // ***** MODIFICACIÓN: tamaño dinámico según zoom
        let zoom =this.map.getZoom();
        let scaleFactor = 1 + (zoom - 15)*0.1;
        if (scaleFactor < 0.2) scaleFactor = 0.2;
        if (scaleFactor > 4) scaleFactor = 4;

        // Radio base, por ejemplo 5
        let radius = 5 * scaleFactor;

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = mundo.tema.color_vehiculos || "#fff";
        this.ctx.fill();
        this.ctx.closePath();
    }
  }
  
  