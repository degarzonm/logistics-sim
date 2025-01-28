// Archivo: js\VehiculoLayer.js

class VehiculoLayer extends L.Layer {
  constructor() {
    super();
    // Se elimina la antigua "particles" y
    // no guardamos "this.vehiculos" globalmente.
    // Este layer dibuja un subconjunto: 
    // todos los vehiculos enMapa = true.

    // Referencia a un vehiculo que esté "hover" (opcional)
    this.hoverVehiculo = null;

    // Bindeamos
    this._onClick = this._onClick.bind(this);
  }

  onAdd(map) {
    this.map = map;

    // Crear el elemento Canvas
    this.canvas = L.DomUtil.create("canvas", "vehiculos-layer");
    this.canvas.width = map.getSize().x;
    this.canvas.height = map.getSize().y;
    this.ctx = this.canvas.getContext("2d");

    // Añadir el Canvas al pane de overlay
    let pane = map.getPanes().overlayPane;
    pane.appendChild(this.canvas);

    // Escuchar eventos
    map.on("move", this._reset, this);
    map.on("resize", this._resize, this);

   
    this.draw(); 
  }

  onRemove(map) {
    let pane = map.getPanes().overlayPane;
    pane.removeChild(this.canvas);

    map.off("move", this._reset, this);
    map.off("resize", this._resize, this);

    L.DomEvent.off(this.canvas, "click", this._onClick);
  }

  _reset() {
    let topLeft = this.map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
    this.draw();
  }

  _resize(e) {
    this.canvas.width = e.newSize.x;
    this.canvas.height = e.newSize.y;
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dibuja todos los vehiculos con "enMapa = true"
    let vehiculosEnMapa = mundo.vehiculos.filter((v) => v.enMapa);
    
    for (let veh of vehiculosEnMapa) {
      this._displayVehiculo(veh);
    }
  }

  _displayVehiculo(veh) {
    if (veh.lat == null || veh.lng == null) return;
    let point = this.map.latLngToContainerPoint([veh.lat, veh.lng]);

    // tamaño según zoom
    let zoom = this.map.getZoom();
    let scaleFactor = 1 + (zoom - 15) * 0.1;
    if (scaleFactor < 0.2) scaleFactor = 0.2;
    if (scaleFactor > 4) scaleFactor = 4;
    let radius = 6 * scaleFactor;

    // color base
    let color = (veh.selected ? "#00ffff" : mundo.tema.color_vehiculos);

    // Dibuja circulo
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.closePath();

    // Muestra la cantidad de carga (opcional)
    let totalCarga = Object.values(veh.carga).reduce((a, b) => a + b, 0);
    if (totalCarga > 0) {
      this.ctx.font = `${Math.round(10 * scaleFactor)}px Arial`;
      this.ctx.fillStyle = mundo.tema.color_texto;
      this.ctx.textAlign = "center";
      this.ctx.fillText(totalCarga.toString(), point.x, point.y - radius - 2);
    }
  }


  pickVehicleAtCoord(x, y) {
    // 1) Reunir la lista de vehículos (enMapa)
    let vehiculosEnMapa = mundo.vehiculos.filter((v) => v.enMapa);
    flotaGlobal.forEach((v) => {
      if (v.enMapa) vehiculosEnMapa.push(v);
    });
    nodes.forEach((n) => {
      n.flota.forEach((v) => {
        if (v.enMapa) vehiculosEnMapa.push(v);
      });
    });
    let uniqueVehs = [...new Set(vehiculosEnMapa)];
  
    // 2) Chequear colisión con cada uno
    for (let veh of uniqueVehs) {
      if (veh.lat == null || veh.lng == null) continue;
  
      let point = this.map.latLngToContainerPoint([veh.lat, veh.lng]);
      let zoom = this.map.getZoom();
      let scaleFactor = 1 + (zoom - 15) * 0.1;
      if (scaleFactor < 0.2) scaleFactor = 0.2;
      if (scaleFactor > 4) scaleFactor = 4;
      let radius = 6 * scaleFactor;
  
      let dist = Math.hypot(point.x - x, point.y - y);
      if (dist <= radius) {
        return veh;
      }
    }
    // Nada encontrado
    return null;
  }


  _onClick(e) {
    
    let rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let latlng = this.map.containerPointToLatLng([x, y]);

    //intentar mover si hay un vehículo seleccionado
    if (e.ctrlKey) {
      // Convertir coords de pantalla a latlng
      this.handleCtrlClick(latlng);
      return;
    }

    // 1) Ver si se clicó sobre un vehículo
    let clickedVeh = null;
     
    for (let veh of mundo.vehiculos.filter((v) => v.enMapa)) {
      let point = this.map.latLngToContainerPoint([veh.lat, veh.lng]);
      let zoom = this.map.getZoom();
      let scaleFactor = 1 + (zoom - 15) * 0.1;
      if (scaleFactor < 0.2) scaleFactor = 0.2;
      if (scaleFactor > 4) scaleFactor = 4;
      let radius = 6 * scaleFactor;
      let dist = Math.hypot(point.x - x, point.y - y);
      if (dist <= radius) {
        clickedVeh = veh;
        break;
      }
    }

    if (clickedVeh) {
      // Seleccionar/deseleccionar
      let wasSelected = clickedVeh.selected;
      // Quitar selección a todos
      for (let v of mundo.vehiculos) {
        v.selected = false;
      }
      clickedVeh.selected = !wasSelected;
      this.draw();
      return;
    }

    // 2) Si no clicaste un vehículo, se deseleccionan todos
    for (let v of mundo.vehiculos) {
      v.selected = false;
    }
    this.draw();
  }

  /**
   * Manejo del Ctrl+click para mover un vehículo seleccionado
   * con detección de ctrlKey
   */
  async handleCtrlClick(latlng) {
    // Buscar un vehículo seleccionado
   
    let vehSeleccionado = mundo.vehiculos.find((v) => v.selected);
    if (!vehSeleccionado) {
      return; // no hay vehículo seleccionado
    }
    //eliminmos la ruta anterior o actual
    if (vehSeleccionado.ruta) {
      vehSeleccionado.finalizaRuta();
    }
    // Creamos el path y asignamos al vehículo
    let coordsInicio = { lat: vehSeleccionado.lat, lng: vehSeleccionado.lng };
    let coordsFin = { lat: latlng.lat, lng: latlng.lng };
    let newPath = new Path(coordsInicio, coordsFin);
    await newPath.fetchRouteAndBuildsegmentos();//esperamos a que se construya el path
    vehSeleccionado.asignarRuta(newPath);

  }
}

function toggleVehicleSelection(veh) {
  // 1) Des-seleccionar todos
  deselectAllVehicles();
  // 2) Seleccionamos el que se ha clicado
  veh.selected = true;
}

function deselectAllVehicles() {
  mundo.vehiculos.forEach((v) => v.selected = false);
}

