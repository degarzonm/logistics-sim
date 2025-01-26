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
            color: this.path.isActive() ? "olive" : "gray",
            weight: 3,
            opacity: 0.8
        }).addTo(map);
    }

    updatePolyline(latlngs) {
        if (this.polyline) {
            map.removeLayer(this.polyline);
        }
        this.polyline = L.polyline(latlngs, {
            color: this.path.isActive() ? "olive" : "gray",
            weight: 3,
            opacity: 0.8
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
    constructor(nodeA, nodeB) {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.segments = [];
        this.view = new PathView(this);

        this.updateActiveDirections();

        nodeA.paths.push(this);
        nodeB.paths.push(this);

        this.fetchRouteAndBuildSegments();
    }

    updateActiveDirections() {
        this.activeAtoB = allowedConnections[this.nodeA.type].includes(this.nodeB.type);
        this.activeBtoA = allowedConnections[this.nodeB.type].includes(this.nodeA.type);
    }

    isActive() {
        return this.activeAtoB || this.activeBtoA;
    }

    updatePath() {
        this.segments = [];
        this.fetchRouteAndBuildSegments();
    }

    send(senderNode, resourceType) {
        if (senderNode === this.nodeA && this.activeAtoB) {
            particles.push(new Vehiculo(this, Date.now(), resourceType, "AB"));
        } else if (senderNode === this.nodeB && this.activeBtoA) {
            particles.push(new Vehiculo(this, Date.now(), resourceType, "BA"));
        }
    }

    removeFromNodes() {
        if (this.nodeA) {
            this.nodeA.paths = this.nodeA.paths.filter(p => p !== this);
        }
        if (this.nodeB) {
            this.nodeB.paths = this.nodeB.paths.filter(p => p !== this);
        }
        this.view.removeFromMap();
    }

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
                let latlngs = coords.map((c) => [c[1], c[0]]);
                
                this.view.updatePolyline(latlngs);
                this.buildSegments(latlngs);
            } else {
                this.createStraightSegment();
            }
        } catch (err) {
            console.error("Error fetchRouteAndBuildSegments:", err);
            this.createStraightSegment();
        }
    }

    buildSegments(latlngs) {
        this.segments = [];
        for (let i = 0; i < latlngs.length - 1; i++) {
            let sLatLng = latlngs[i];
            let eLatLng = latlngs[i + 1];
            let seg = new Segment(
                sLatLng[0],
                sLatLng[1],
                eLatLng[0],
                eLatLng[1]
            );
            this.segments.push(seg);
        }
    }

    createStraightSegment() {
        let s = new Segment(
            this.nodeA.lat,
            this.nodeA.lng,
            this.nodeB.lat,
            this.nodeB.lng
        );
        this.segments = [s];
        this.view.updatePolyline([
            [s.lat1, s.lng1],
            [s.lat2, s.lng2]
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
    paths = paths.filter((p) => {
        let inSel = sel.includes(p.nodeA) && sel.includes(p.nodeB);
        if (inSel) p.removeFromNodes();
        return !inSel;
    });
    nodes.forEach((n) => {
        n.paths = n.paths.filter((p) => paths.includes(p));
    });
    actualizaPanelControl();
}