// Archivo: js\Vehiculo.js

class Vehiculo {
  static nextId = 1;
  constructor(tipo = "moto") {
    this._id = Vehiculo.nextId++;
    this.tipo = tipo;
    this.capacidad = 0;
    this.velocidad = 0;
    this._definirPropiedadesPorTipo();

    // Posición actual (lat,lng) solo si está en el mapa
    this.lat = null;
    this.lng = null;

    // Indica si está en el mapa o si está estacionado en un nodo
    this.enMapa = false;

    // Inventario interno
    this.carga = {};

    // Path actual que recorre
    this.ruta = null;
    // Índice de segmento actual
    this.currentSegmentIndex = 0;
    // Tiempo transcurrido en el segmento actual
    this.segmentElapsed = 0;
    // Flag de final de ruta
    this.rutaCompletada = false;

    // Indica si está seleccionado para mover con Ctrl+click
    this.selected = false;

    // Referencia a un nodo si está estacionado
    this.nodoActual = null;

    // Lógica de carga
    this.tiempoCargaRestante = 0; // milisegundos
    this.cargando = false;
  }

  _definirPropiedadesPorTipo() {
    switch (this.tipo) {
      case "moto":
        this.capacidad = 5;
        this.velocidad = 80*5; // km/h
        break;
      case "van":
        this.capacidad = 30;
        this.velocidad = 50*5;
        break;
      case "camion":
        this.capacidad = 150;
        this.velocidad = 30*5;
        break;
      default:
        this.capacidad = 5;
        this.velocidad = 50*5;
        break;
    }
  }

  /**
   * Asigna un path pre-calculado (con geometry/segmentos),
   * coloca el vehículo en el mapa (enMapa=true) y resetea contadores de ruta.
   */
  asignarRuta(path) {
    this.ruta = path;
    this.currentSegmentIndex = 0;
    this.segmentElapsed = 0;
    this.rutaCompletada = false;

    // Poner la posición inicial en el primer punto de la polyline
    let segs = this.ruta.segmentos;
    if (segs.length > 0) {
      // la coords inicial del primer segmento
      this.lat = segs[0].lat1;
      this.lng = segs[0].lng1;
    }
    this.enMapa = true;
    this.nodoActual = null;
  }

  // Finaliza la ruta actual, la elimina del map layer
  finalizaRuta(){
    this.ruta.view.removeFromMap();
    paths = paths.filter(p => p._id !== this.ruta._id);
    this.ruta = null;
    this.currentSegmentIndex = 0;
    this.segmentElapsed = 0;
    this.rutaCompletada = false;
  }

  /**
   * Actualiza la posición del vehículo en función del path asignado.
   * @param {number} dt milisegundos transcurridos desde la última llamada
   */
  update(dt) {
    // Si no está en el mapa o no tiene path, no hacemos nada
    if (!this.enMapa || !this.ruta || this.rutaCompletada) return;

    let segs = this.ruta.segmentos;
    if (!segs || segs.length === 0) {
      this.rutaCompletada = true;
      return;
    }

    // Velocidad en m/s
    let speedMs = (this.velocidad * 1000) / 3600;
    this.segmentElapsed += dt;

    // Ver segmento actual
    let seg = segs[this.currentSegmentIndex];
    let durSegmento = seg.distanceM / speedMs * 1000; // ms

    if (this.segmentElapsed >= durSegmento) {
      // Pasó el segmento
      this.currentSegmentIndex++;
      this.segmentElapsed -= durSegmento;

      if (this.currentSegmentIndex >= segs.length) {
        // Terminó la ruta
        this.rutaCompletada = true;
        // Colocar la posición final en lat2,lng2 del último segmento
        this.lat = seg.lat2;
        this.lng = seg.lng2;
        return;
      } else {
        // Nuevo segmento
        seg = segs[this.currentSegmentIndex];
      }
    }

    // Interpolamos en el segmento actual
    durSegmento = seg.distanceM / speedMs * 1000; // recalculado
    let t = this.segmentElapsed / durSegmento;
    let latA = seg.lat1, lngA = seg.lng1;
    let latB = seg.lat2, lngB = seg.lng2;
    this.lat = latA + (latB - latA) * t;
    this.lng = lngA + (lngB - lngA) * t;
  }

  /**
   * Regresa true si la carga cabe en el vehículo.
   * Se asume "carga" es un obj { "A": 5, "B": 2, ...}
   */
  cargaCabe(carga) {
    let totalEnVehiculo = Object.values(this.carga).reduce((a, b) => a + b, 0);
    let totalCargar = Object.values(carga).reduce((a, b) => a + b, 0);
    return (totalEnVehiculo + totalCargar) <= this.capacidad;
  }

  /**
   * Añade la carga al vehículo, asumiendo que cabe.
   * Retorna el tiempo de carga en ms (10 ítems => 1 segundo)
   */
  cargar(carga) {
    for (let tipo in carga) {
      this.carga[tipo] = (this.carga[tipo] || 0) + carga[tipo];
    }
    let totalCargar = Object.values(carga).reduce((a, b) => a + b, 0);
    let msPor10Items = 1000; // 10 items => 1 seg
    let factor = totalCargar / 10; 
    let tiempoMs = msPor10Items * factor;
    return tiempoMs;
  }

  /**
   * Descarga todo, retorna obj con la carga
   */
  descargarTodo() {
    let tmp = { ...this.carga };
    this.carga = {};
    return tmp;
  }

  /**
   * Para marcar el vehículo como estacionado en un nodo
   */
  estacionarEnNodo(nodo) {
    this.nodoActual = nodo;
    this.enMapa = false;
    this.lat = null;
    this.lng = null;
    this.selected = false;
    this.ruta = null;
    this.currentSegmentIndex = 0;
    this.segmentElapsed = 0;
    this.rutaCompletada = false;
  }

  setPos(coords){
    this.lat = coords.lat;
    this.lng = coords.lng;
  }
}
