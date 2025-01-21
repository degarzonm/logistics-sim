// el area de influencia de cada nodo tipo tienda es una circunferencia de radio r en el mapa que se actualiza en cada ciclo de juego
// pudiendo generar clientes que serán atendidos, basados en la velocidad de la tienda, su capacidad de procesar ordenes paralelas
// y la cantidad de ordenes pendientes

//

/****************************************************
 * CLASE AREA INFLUENCIA
 ****************************************************/
class AreaInfluencia {
  constructor(node) {
    this.node = node;
    this.r = 500; // Radio de influencia en metros
    this.center = L.latLng(node.lat, node.lng);
    this.clientes = []; // lista de clientes generados
    this.rango_clientes = 3; // rango del cliente
    this.lastGenTime = Date.now();
    this.genInterval = 2800; // cada 10s (por ejemplo) se genera un nuevo grupo de clientes
  }

  // Genera un lote de clientes aleatorios dentro o en el borde de la circunferencia
  generaClientes() {
    if (this.node.type !== "tienda") return; // solo si es tienda
    let numClientes = Math.floor(Math.random() * 2) + 1; // generaremos de 1 a 3 grupos

    for (let i = 0; i < numClientes; i++) {
      let angle = Math.random() * 2 * Math.PI;
      let radius = Math.random() * this.r;
      let offsetLatLng = this._offsetLatLng(this.center, radius, angle);

      // Ejemplo de demanda: { A: 2, B: 1 }, etc.
      let nuevaDemanda = this._generaDemandaAleatoria();
      // Creamos el cliente
      let cliente = new Cliente(
        offsetLatLng.lat,
        offsetLatLng.lng,
        nuevaDemanda,
        1000 // 10 s de tiempo máximo de espera
      );
      this.clientes.push(cliente);
      clientes.push(cliente);
    }
  }

  // Llamar en update para ver si toca generar un nuevo grupo
  tryGenerate() {
    let now = Date.now();

    // Solo generamos clientes si el nodo es 'tienda'
    if (this.node.type === "tienda") {
      if (
        now - this.lastGenTime >=
        this.genInterval + (Math.random() * 1000 - 500)
      ) {
        this.generaClientes();
        this.lastGenTime = now;
      }
    }
    // Si no es "tienda", no generamos clientes.
  }

  // Retorna clientes no atendidos
  getPendingClients() {
    return this.clientes.filter((c) => !c.atendido);
  }

  // Método para calcular offset en lat/lng
  _offsetLatLng(center, distanceM, angleRad) {
    // dist en grados => distanceM / 111111 ~ 1° lat ~ 111111m
    // Este es un aproximado, para mayor precisión se podría usar proyecciones
    let dLat = (distanceM * Math.cos(angleRad)) / 111111;
    let dLng =
      (distanceM * Math.sin(angleRad)) /
      (111111 * Math.cos(center.lat * (Math.PI / 180)));

    return {
      lat: center.lat + dLat,
      lng: center.lng + dLng,
    };
  }

  /**
+  * Retorna un objeto con demanda aleatoria, por ejemplo: { A: 2, C: 1 }, etc.
+  */
  _generaDemandaAleatoria() {
    let demanda = {};
    // Generar de 1 a 3 ítems distintos
    let cuantosItems = Math.floor(Math.random() * this.rango_clientes) + 1;
    for (let i = 0; i < cuantosItems; i++) {
      let tipo = Object.keys(tiposRecurso)[Math.floor(Math.random() * Object.keys(tiposRecurso).length)];
      // Sumamos 1 a la demanda de ese tipo
      if (!demanda[tipo]) demanda[tipo] = 0;
      demanda[tipo]++;
    }
    return demanda;
  }
}
