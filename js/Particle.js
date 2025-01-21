/****************************************************
 * CLASE PARTICLE
 *  Recorre los segments del Path en orden,
 *  calculando tiempos parciales en cada tramo.
 ****************************************************/
class Vehiculo {
    constructor(ruta, tiempoInicio, tipoRecurso = "A", orientacion = "AB") {
      this.ruta = ruta;
      this.tInicio = tiempoInicio;
      this.tipoRec = tipoRecurso;
      this.orientacion = orientacion;
      this.finalizaRuta = false;
      this.inventario = {};
      // Preparar los segmentos de acuerdo con la dirección
      let segmentos = this.ruta.segments;
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
      this.coordsActual = this.segmentos.length > 0
        ? [this.segmentos[0].lat1, this.segmentos[0].lng1]
        : null;
    }
  
    // Obtener la posición actual de la partícula
    latLngActual() {
      if (this.finalizaRuta) return null;
      return this.coordsActual;
    }
  
    // Actualizar la posición basada en el tiempo transcurrido
    actualizaPosicion(tTranscurrido) {
      if (this.finalizaRuta) return;
  
      // Determinar en cuál segmento estamos, según 'elapsed'
      let tFaltante = tTranscurrido;
      let indexSegActual = 0;
      while (indexSegActual < this.segmentos.length) {
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
        this.coordsActual = null;
        return;
      }
  
      // Interpolamos en el segmento actual
      let seg = this.segmentos[indexSegActual];
      let segT = tFaltante / this.tiempoSegmentos[indexSegActual];
  
      let [lat, lng] = seg.getLatLngAt(segT);
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