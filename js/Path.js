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
   * CLASE PATH
   *  En lugar de un solo Segment, tenemos un array
   *  de segments que forman la ruta real.
   ****************************************************/
  class Path {
    constructor(nodeA, nodeB) {
      this.nodeA = nodeA;
      this.nodeB = nodeB;
  
      this.segments = []; // se llenará con la ruta real
      this.polyline = null;
  
      // Determina si el path está activo en cada dirección
      this.updateActiveDirections();
  
      // Creamos la polyline vacía en el mapa
      this.polyline = L.polyline([], {
        color: this.isActive() ? "olive" : "gray",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
  
      // Referenciar en ambos nodos
      nodeA.paths.push(this);
      nodeB.paths.push(this);
  
      // Llamamos a la función que pide la ruta a OSRM
      this.fetchRouteAndBuildSegments();
    }
  
    updateActiveDirections() {
      this.activeAtoB = allowedConnections[this.nodeA.type].includes(
        this.nodeB.type
      );
      this.activeBtoA = allowedConnections[this.nodeB.type].includes(
        this.nodeA.type
      );
    }
  
    isActive() {
      return this.activeAtoB || this.activeBtoA;
    }
  
    // Llamado cuando se mueve un nodo: recalculamos la ruta
    updatePolyline() {
      // Eliminamos la polyline actual
      if (this.polyline) {
        map.removeLayer(this.polyline);
      }
      this.polyline = L.polyline([], {
        color: this.isActive() ? "olive" : "gray",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
      // Vaciar segments y volver a consultar OSRM
      this.segments = [];
      this.fetchRouteAndBuildSegments();
    }
  
    // Enviar recurso desde este path
    send(senderNode, resourceType) {
    
      if (senderNode === this.nodeA && this.activeAtoB) {
        particles.push(new Vehiculo(this, Date.now(), resourceType, "AB"));
        
      } else if (senderNode === this.nodeB && this.activeBtoA) {
        particles.push(new Vehiculo(this, Date.now(), resourceType, "BA"));
        
      }
    }
  
    removeFromMap() {
    map.removeLayer(this.polyline);
    // Remove any references to this path in nodes
    if (this.nodeA) {
      this.nodeA.paths = this.nodeA.paths.filter(p => p !== this);
    }
    if (this.nodeB) {
      this.nodeB.paths = this.nodeB.paths.filter(p => p !== this);
    }
  }
  
    /****************************************************
     * fetchRouteAndBuildSegments()
     *  Llama a OSRM para obtener la ruta real (geojson).
     *  Luego construye un array de points y de segments
     ****************************************************/
    async fetchRouteAndBuildSegments() {
      let fromLat = this.nodeA.lat;
      let fromLng = this.nodeA.lng;
      let toLat = this.nodeB.lat;
      let toLng = this.nodeB.lng;
  
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
          // coords = [ [lng, lat], [lng, lat], ... ]
  
          // Para dibujar la polyline, convertimos a [lat, lng]
          let latlngs = coords.map((c) => [c[1], c[0]]);
          this.polyline.setLatLngs(latlngs);
  
          // Construimos los segments
          this.segments = [];
          for (let i = 0; i < latlngs.length - 1; i++) {
            let sLatLng = latlngs[i];
            let eLatLng = latlngs[i + 1];
            // speedKmh fijo por ahora, podríamos variarlo
            let seg = new Segment(
              sLatLng[0],
              sLatLng[1],
              eLatLng[0],
              eLatLng[1]
            );
            this.segments.push(seg);
          }
        } else {
          // No se encontró ruta => fallback: una sola línea recta
          this.createStraightSegment();
        }
      } catch (err) {
        console.error("Error fetchRouteAndBuildSegments:", err);
        // Fallback en caso de error
        this.createStraightSegment();
      }
    }
  
    createStraightSegment() {
      // Caso en que OSRM falla o no devuelve ruta
      // Hacemos un solo segment recto
      let s = new Segment(
        this.nodeA.lat,
        this.nodeA.lng,
        this.nodeB.lat,
        this.nodeB.lng
      );
      this.segments = [s];
      this.polyline.setLatLngs([
        [s.lat1, s.lng1],
        [s.lat2, s.lng2],
      ]);
    }
  }


  function crearCaminos() {
    let sel = nodes.filter((n) => n.selected);
    if (sel.length >= 2) {
      for (let i = 0; i < sel.length - 1; i++) {
        let nA = sel[i];
        let nB = sel[i + 1];
        if (!existeCamino(nA, nB)) {
          let newPath = new Path(nA, nB);
          paths.push(newPath);
        }
      }
    }
  }

  function existeCamino(nA, nB) {
    return paths.some(
      (p) =>
        (p.nodeA === nA && p.nodeB === nB) ||
        (p.nodeA === nB && p.nodeB === nA)
    );
  }
  
  function limpiarCaminoSeleccionado() {
    let sel = nodes.filter((n) => n.selected);
    if (sel.length < 2) return;
    // Para todos los pares entre sel, eliminamos
    paths = paths.filter((p) => {
      let inSel = sel.includes(p.nodeA) && sel.includes(p.nodeB);
      if (inSel) p.removeFromMap();
      return !inSel;
    });
    nodes.forEach((n) => {
      n.paths = n.paths.filter((p) => paths.includes(p));
    });
    actualizaPanelControl();
  }