/****************************************************
 * CLASE PARTICLE
 *  Recorre los segmentos del Path en orden,
 *  calculando tiempos parciales en cada tramo.
 ****************************************************/
class Vehiculo {
    constructor(tipo = "moto", coords = [], ruta, tiempoInicio, pedido, orientacion = "AB") {
      //asigna un id aleatorio al vehículo.
      this.id = Math.random().toString(36).substring(2, 15);
      this.tipo = tipo; // "moto", "van", "camion"
      this.capacidad = 0;
      this.velocidad = 0; // km/h
      this._definirPropiedadesPorTipo();
      this.ruta = ruta;
      this.tInicio = tiempoInicio;
      this.pedido = pedido;
      this.orientacion = orientacion;
      this.finalizaRuta = false;
      this.inventario = {};
      // Preparar los segmentos de acuerdo con la dirección
      let segmentos = this.ruta.segmentos;
      let segmentosFinal;
      if (this.orientacion === "AB") {
        // Se usan los segmentos tal cual están (A->B)
        segmentosFinal = segmentos;
      } else {
        // Se invierte el array de segmentos
        // y, para cada uno, se invierten también las coordenadas iniciales y finales
        segmentosFinal = segmentos.slice().reverse().map((orig) => {
          return new Segment(
            orig.lat2,
            orig.lng2, // Ahora el inicio es lo que antes era el final
            orig.lat1,
            orig.lng1, // Y el final es lo que antes era el inicio
            orig.speedKmh
          );
        });
      }
  
      // Se almacenan los segmentos ya acomodados
      this.segmentos = segmentosFinal;
  
      // Cálculo de duraciones individuales y total
      this.tiempoSegmentos = [];
      this.RutasTotalMs = 0;
      this.segmentos.forEach((seg) => {
        let d = seg.travelTimeMs;
        this.tiempoSegmentos.push(d);
        this.RutasTotalMs += d;
      });
  
      // Posición actual de la partícula
      this.coordsActual = coords;
    }

    _definirPropiedadesPorTipo() {
      // Según el tipo, asignamos capacidad y velocidad
      switch (this.tipo) {
        case "moto":
          this.capacidad = 5;
          this.velocidad = 80; // km/h por ejemplo
          break;
        case "van":
          this.capacidad = 30;
          this.velocidad = 50;
          break;
        case "camion":
          this.capacidad = 150;
          this.velocidad = 30;
          break;
      }
    }
  
    // Obtener la posición actual de la partícula
    latLngActual() {
      return this.coordsActual;
    }
  
    async definirRuta(latDestino, lngDestino) {
      // Llamada a OSRM con: lat/lng actual => latDestino,lngDestino
      let url = `https://router.project-osrm.org/route/v1/driving/` +
                `${this.lng},${this.lat};${lngDestino},${latDestino}?` +
                `overview=full&geometries=geojson`;
      try {
        let resp = await fetch(url);
        let data = await resp.json();
        if (data && data.routes && data.routes.length > 0) {
          let coords = data.routes[0].geometry.coordinates; // [ [lng, lat], ... ]
          this.segmentos = [];
          this.tiemposSegmento = [];
          this.rutaCompletaMs = 0;
    
          // Crear Segmentos
          for (let i = 0; i < coords.length - 1; i++) {
            let c1 = coords[i];
            let c2 = coords[i+1];
            let seg = new Segment(
              c1[1], c1[0], // lat1, lng1
              c2[1], c2[0], // lat2, lng2
              this.velocidad // speedKmh
            );
            this.segmentos.push(seg);
            this.tiemposSegmento.push(seg.travelTimeMs);
            this.rutaCompletaMs += seg.travelTimeMs;
          }
          this.enMovimiento = true;
          this.finishedRoute = false;
          this.tInicio = Date.now();
        }
      } catch(e) {
        console.error("Error definindo ruta para vehiculo:", e);
      }
    }


    // Actualizar la posición basada en el tiempo transcurrido
    actualizaPosicion(tTranscurrido) {
      if (this.finalizaRuta) return;
  
      // Determinar en cuál segmento estamos, según 'elapsed'
      let tFaltante = tTranscurrido;
      let indexSegActual = 0;
      while (indexSegActual < this.path.segmentos.length) {
        let dur = this.tiempoSegmentos[indexSegActual];
        if (tFaltante <= dur) {
          // Estamos en este segmento
          break;
        } else {
          tFaltante -= dur;
          indexSegActual++;
        }
      }
  
      // Si ya recorrimos todos los segmentos, marcar como finalizado
      if (indexSegActual >= this.segmentos.length) {
        this.finalizaRuta = true;
        
        return;
      }
  
      // Interpolamos en el segmento actual
      let seg = this.segmentos[indexSegActual];
      let segT = tFaltante / this.tiempoSegmentos[indexSegActual];
  
      let [lat, lng] = seg.getLatLngAt(segT);
      //actualiza la posición del vehículo en el mapa 
      this.coordsActual = [lat, lng];
    }
  
    rutaCompletada() {
      return this.finalizaRuta;
    }
  
    getNodoFinal() {
      // El nodo final depende de la dirección
      return this.orientacion === "AB" ? this.ruta.nodeB : this.ruta.nodeA;
    }

    
}
