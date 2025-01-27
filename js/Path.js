/****************************************************
 * CLASE SEGMENT
 *  Representa un tramo de la ruta.
 *  lat1,lng1 -> lat2,lng2, con distancia calculada,
 *  y velocidad (km/h).
 ****************************************************/
class Segment {
  constructor(lat1, lng1, lat2, lng2, speedKmh = 600) {
    this.lat1 = lat1;
    this.lng1 = lng1;
    this.lat2 = lat2;
    this.lng2 = lng2;
    this.speedKmh = speedKmh;

    // Distancia en metros
    this.distanceM = L.latLng(lat1, lng1).distanceTo([lat2, lng2]);
  }

  get travelTimeMs() {
    // Convertir velocidad de km/h a m/s
    let speedMs = (this.speedKmh * 1000) / 3600;
    // Calcular tiempo de viaje en milisegundos
    return (this.distanceM / speedMs) * 1000;
  }

  // Método para interpolar posición en el segmento
  getLatLngAt(t) {
    let lat = this.lat1 + (this.lat2 - this.lat1) * t;
    let lng = this.lng1 + (this.lng2 - this.lng1) * t;
    return [lat, lng];
  }
}

/****************************************************
 * CLASE PathView
 *  Maneja la representación visual del camino en el mapa
 ****************************************************/
class PathView {
  constructor(path) {
    this.path = path;
    this.polyline = null;
    this.initPolyline();
  }

  initPolyline() {
    this.polyline = L.polyline([], {
      color: mundo.tema.color_caminos,
      weight: 3,
      opacity: 0.8,
    }).addTo(map);
  }

  // Actualiza la polilínea con los nuevos puntos
  updatePolyline(latlngs) {
    // Si ya existe, se elimina
    if (this.polyline) {
      map.removeLayer(this.polyline);
    }
    // Se crea de nuevo, con los nuevos puntos [(lat,lng),...]
    this.polyline = L.polyline(latlngs, {
      color: mundo.tema.color_caminos,
      weight: 3,
      opacity: 0.5,
    }).addTo(map);
  }

  removeFromMap() {
    if (this.polyline) {
      map.removeLayer(this.polyline);
    }
  }
}

/****************************************************
 * CLASE Path
 *  Maneja la lógica de negocio del camino
 ****************************************************/
class Path {
  constructor(coordsA, coordsB) {
    this._id = Math.floor(Math.random() * 1000000).toString();
    this.coordsA = coordsA;
    this.coordsB = coordsB;
    this.segmentos = [];
    this.view = new PathView(this);

    this.fetchRouteAndBuildsegmentos();
  }

  updatePath() {
    this.segmentos = [];
    this.fetchRouteAndBuildsegmentos();
  }

  // se elimina este metodo ya que la clase Vehiculos es ahora la encargada de enviar vehiculos
  /*send(senderNode, resourceType) {
        if (senderNode === this.nodeA && this.activeAtoB) {
            particles.push(new Vehiculo(this, Date.now(), resourceType, "AB"));
        } else if (senderNode === this.nodeB && this.activeBtoA) {
            particles.push(new Vehiculo(this, Date.now(), resourceType, "BA"));
        }
    }*/

  // la remocion de paths debe hacerse desde los nodos

  async fetchRouteAndBuildsegmentos() {
    let fromLat = this.coordsA.lat;
    let fromLng = this.coordsA.lng;
    let toLat = this.coordsB.lat;
    let toLng = this.coordsB.lng;
    // Llamada a la API pública de OSRM
    // (coordenadas deben ir como lng,lat)
    // Overview=full => para obtener la polilínea con todos los puntos
    // Geometries=geojson => para obtener la polilínea en formato geojson
    //
    let url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&continue_straight=true`;
    try {
      let resp = await fetch(url);
      let data = await resp.json();
      if (data && data.routes && data.routes.length > 0) {
        let coords = data.routes[0].geometry.coordinates;
        let listaCoordsLatLng = coords.map((c) => [c[1], c[0]]);

        this.view.updatePolyline(listaCoordsLatLng);
        this.buildsegmentos(listaCoordsLatLng);
      } else {
        this.createStraightSegment();
      }
    } catch (err) {
      console.error("Error fetchRouteAndBuildsegmentos:", err);
      this.createStraightSegment();
    }
  }

  buildsegmentos(latlngs) {
    this.segmentos = [];
    for (let i = 0; i < latlngs.length - 1; i++) {
      let sLatLng = latlngs[i];
      let eLatLng = latlngs[i + 1];
      let seg = new Segment(sLatLng[0], sLatLng[1], eLatLng[0], eLatLng[1]);
      this.segmentos.push(seg);
    }
  }

  createStraightSegment() {
    let s = new Segment(
      this.nodeA.lat,
      this.nodeA.lng,
      this.nodeB.lat,
      this.nodeB.lng
    );
    this.segmentos = [s];
    this.view.updatePolyline([
      [s.lat1, s.lng1],
      [s.lat2, s.lng2],
    ]);
  }
}

function crearCaminosNodosSeleccionados() {
  let sel = nodes.filter((n) => n.selected); //debe cambirse a mundo.nodosSeleccionados : [Node,...]
  if (sel.length >= 2) {
    let nA = sel[0];
    let coordsA = { lat: nA.lat, lng: nA.lng };
    for (let i = 1; i < sel.length; i++) {
      let nB = sel[i];
      let coordsB = { lat: nB.lat, lng: nB.lng };
      if (!existeCamino(nA, nB)) {
        //let newPath = new Path(nA, nB);

        //agrega referencias en cada nodo indicando que tiene un camino en comun
        nA.agregaRuta(nB);
        nB.agregaRuta(nA);
      }
    }
  }
}

function existeCamino(nA, nB) {
  return nA.rutas.some((ruta) => ruta.nodo._id === nB._id);
}

function limpiarCaminoSeleccionado() {
  let nodosSeleccionados = nodes.filter((n) => n.selected); //debe cambirse a mundo.nodosSeleccionados : [Node,...]

  if (nodosSeleccionados.length < 2) return; // No hay suficientes nodos seleccionados

  //para cada nodo seleccionado elimina las rutas que tiene en comun
  for (let i = 0; i < nodosSeleccionados.length - 1; i++) {
    for (let j = i + 1; j < nodosSeleccionados.length; j++) {
      if (i != j) {
        nodosSeleccionados[i].remueveRuta(nodosSeleccionados[j]);
        nodosSeleccionados[j].remueveRuta(nodosSeleccionados[i]);
      }
    }
  }
  actualizaPanelControl();
}
