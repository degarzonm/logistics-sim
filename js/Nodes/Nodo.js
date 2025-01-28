/****************************************************
 * CLASE NODE
 *  - Representa un nodo en el simulador.
 ****************************************************/
class Node {
  static nextId = 1;
  constructor(
    lat,
    lng,
    type = "generic",
    size = 10,
    item_gen = "A",
    t_transform = 50,
    entry_item = "A",
    transformed_item = "B"
  ) {
    this._id = Node.nextId++;
    this.lat = lat;
    this.lng = lng;
    this.type = type;
    this.size = size;

    // ====== Propiedades de producción y transformación ======
    //item gen: item generado por la fuente, aleatorio entre los tipos de recurso disponibles
    let rand_index = Math.floor(
      Math.random() * Object.keys(tiposRecurso).length
    );
    this.item_gen = Object.keys(tiposRecurso)[rand_index];
    //si es fuente define un precio de venta para su recurso generado
    this.precio_venta = Math.floor(tiposRecurso[this.item_gen].precio * 0.7);

    this.t_transform = t_transform;
    this.entry_item = entry_item;
    this.transformed_item = transformed_item;

    // NUEVO: Intervalo de producción (por nodo), por defecto 2000 ms
    this.productionInterval = 2000;

    this.inventory = {};
    // en mejora a rutas : {ruta, nodo, activa}
    this.rutas = [];
    this.flota = [];
    this.selected = false;

    // Producción y transformación
    this.lastProductionTime = 0;
    this.lastTransformTime = 0;
    this.isProcessing = false;
    // parámetros para tienda
    this.capacidadAtencion = 3; // cuántos clientes puede atender a la vez
    this.factorAtencionClientes = 1; // factor de atención a clientes (1 = normal) , 1.4 atenderá 40% más rápido
    // Estructura para clientes en atención
    this.clientesAtendiendo = [];

    if (this.type === "tienda") {
      this.areaInfluencia = new AreaInfluencia(this);
    }
  }

  // Cambiar el tipo de nodo
  actualizaTipo(nuevoTipo) {
    this.type = nuevoTipo;

    if (this.type === "tienda") {
      this.areaInfluencia = new AreaInfluencia(this);
    }
    if (this.type === "fuente") {
      this.precio_venta = Math.floor(
        tiposRecurso[this.item_gen].precio * mundo.factorVentaFuente
      );

      this.flota = [];
      //remueve flota de vehículos global
      mundo.vehiculos = mundo.vehiculos.filter((v) => v.nodoActual !== this);
      //agrega 5 motos a la flota
      for (let i = 0; i < 5; i++) {
        let moto = new Vehiculo("moto");
        moto.nodoActual = this;
        moto.enMapa = false;
        this.flota.push(moto);
        mundo.vehiculos.push(moto);
      }
    }
    this.rutas.forEach((r) => {
      r.ruta.activa = allowedConnections[this.type].includes(r.nodo.type);
    });
  }

  async agregaRuta( nodo) {
    let nuevaRuta = new Path({lat: this.lat,lng: this.lng}, {lat: nodo.lat,lng: nodo.lng});
    await nuevaRuta.fetchRouteAndBuildsegmentos();
    paths.push(nuevaRuta);

    this.rutas.push({ ruta: nuevaRuta,nodo: nodo, activa: allowedConnections[this.type].includes(nodo.type) });
  }

  remueveRuta(nodoB) {
    if (!nodoB) return;
    let ruta = this.rutas.find((r) => r.nodo._id === nodoB._id);
    if (!ruta) return;

    this.rutas = this.rutas.filter((r) => r.nodo._id !== nodoB._id);

    // Remove the path from the global paths array
    paths = paths.filter((p) => p._id !== ruta._id);
  
    // Remove the path from the map
    ruta.ruta.view.removeFromMap();
  }

/**
   * Expulsa todos los vehículos de la flota y los posiciona
   * alrededor del nodo, habilitándolos en el mapa.
   */
  expulsarFlota() {
    console.log("Expulsando flota de", this);
    // definimos un radio alrededor del nodo, en metros
    let radio = 30; // 10m de distancia
    let angleStep = (2 * Math.PI) / (this.flota.length + 1);
    this.flota.forEach((veh, i) => {
      // calculamos offset en lat/lng
      let angle = angleStep * i;
      let offsetLat = (radio * Math.cos(angle)) / 111111;
      let offsetLng =
        (radio * Math.sin(angle)) /
        (111111 * Math.cos(this.lat * (Math.PI / 180)));

      veh.lat = this.lat + offsetLat;
      veh.lng = this.lng + offsetLng;
      veh.enMapa = true;
      veh.nodoActual = null;
      veh.selected = false;
    });
    this.flota = [];
  }

  /**
   * Despacha un vehículo hacia otro nodo, cargando 'cargaObj' si cabe.
   * 'cargaObj' es un objeto {A:5, B:2...}
   * Retorna una promesa que se completa cuando se inicia el viaje.
   */
  despacharVehiculo(veh, nodoDestino, cargaObj) {
    return new Promise((resolve, reject) => {
      // 1) Verificamos si el vehículo está en la flota actual (es estacionado aquí)
      let idx = this.flota.indexOf(veh);
      if (idx < 0) {
        return reject("El vehículo no está estacionado en este nodo.");
      }

      // 2) Verificar que el 'cargaObj' exista en inventario
      let totalCargar = 0;
      for (let tipo in cargaObj) {
        if (!this.inventory[tipo] || this.inventory[tipo] < cargaObj[tipo]) {
          return reject("No hay suficiente inventario en el nodo.");
        }
        totalCargar += cargaObj[tipo];
      }

      // 3) Ver si cabe en el vehículo
      if (!veh.cargaCabe(cargaObj)) {
        return reject("No cabe la carga en el vehículo.");
      }

      // 4) Iniciar tiempo de carga
      let tCargaMs = veh.cargar(cargaObj); 
      // “cargar()” ya sumó la carga en veh.carga => restar al inventario del nodo:
      for (let t in cargaObj) {
        this.inventory[t] -= cargaObj[t];
        if (this.inventory[t] <= 0) {
          delete this.inventory[t];
        }
      }
      veh.cargando = true;
      veh.tiempoCargaRestante = tCargaMs;

      // 5) Esperamos (tCargaMs) en un setTimeout simulado, luego sacamos al vehículo al mapa
      setTimeout(() => {
        veh.cargando = false;
        veh.tiempoCargaRestante = 0;

        // 6) Crear el Path desde la pos del nodo (lat,lng) hasta nodoDestino
        let coordsInicio = { lat: this.lat, lng: this.lng };
        let coordsFin = { lat: nodoDestino.lat, lng: nodoDestino.lng };
        let newPath = new Path(coordsInicio, coordsFin);

        // Eliminamos el veh de la flota del nodo
        this.flota.splice(idx, 1);

        // Asignar un callback para cuando el path esté listo
        let oldFetch = newPath.fetchRouteAndBuildsegmentos;
        newPath.fetchRouteAndBuildsegmentos = async function() {
          await oldFetch.apply(this, arguments);

          // El vehículo pasa al mapa
          veh.lat = coordsInicio.lat;
          veh.lng = coordsInicio.lng;
          veh.enMapa = true;
          veh.nodoActual = null;
          veh.path = null; // se asigna luego
          veh.asignarRuta(newPath);
        };
        newPath.fetchRouteAndBuildsegmentos();

        // 7) Lógica de llegada: en drawLoop (o en un observer) 
        // detectamos si veh.rutaCompletada, entonces:
        //   - se descarga en 'nodoDestino'
        //   - se crea un path de retorno
        //   - al terminar retorna, se "estaciona" en 'this' de nuevo (opcional) 
        //   o se estaciona en 'nodoDestino' si lo deseas. 
        //   Podrías personalizarlo.

        resolve("Despacho iniciado");
      }, tCargaMs); 
      // un setTimeout con tCargaMs, aunque en un loop continuo 
      // podría ser un control distinto. 
    });
  }

  // Añadir inventario ej: {A:2,B:3} al nodo
  almacena(inventario) {
    for (let tipo in inventario) {
      this.inventory[tipo] = (this.inventory[tipo] || 0) + inventario[tipo];
    }
  }



  // Añadir recurso al inventario
  addResource(resourceType) {
    if (this.type === "sumidero") {
      // Consumir sin almacenar
      return;
    }
    // Almacenar el recurso
    this.inventory[resourceType] = (this.inventory[resourceType] || 0) + 1;
  }
  // metodo que establece si hay suficiente inventario para atender a un cliente
  suficienteInventario(demanda) {
    //console.log("Verificando inventario", demanda);
    //console.log("Inventario", this.inventory);
    for (let tipo in demanda) {
      if ((this.inventory[tipo] || 0) < demanda[tipo]) {
        return false;
      }
    }
    return true;
  }
  // Remover un recurso aleatorio del inventario
  removeRandomResource() {
    let keys = Object.keys(this.inventory).filter((k) => this.inventory[k] > 0);
    if (keys.length === 0) return null;
    let chosen = keys[Math.floor(Math.random() * keys.length)];
    this.inventory[chosen]--;
    if (this.inventory[chosen] <= 0) {
      delete this.inventory[chosen];
    }
    return chosen;
  }

  // Remover un recurso específico del inventario
  consumeRecurso(rType, cantidad = 1) {
    if (!this.inventory[rType]) return null;
    this.inventory[rType] -= cantidad;
    if (this.inventory[rType] <= 0) {
      delete this.inventory[rType];
    }
    return rType;
  }

  consumirInventario(demanda) {
    //console.log("Consumiendo inventario", demanda);
    //console.log("Inventario antes", this.inventory);
    for (let tipo in demanda) {
      if (this.inventory[tipo]) {
        this.inventory[tipo] -= demanda[tipo];
        if (this.inventory[tipo] <= 0) {
          delete this.inventory[tipo];
        }
      }
    }
    //console.log("Inventario después", this.inventory);
  }
  // Producción de recursos
  produceResource() {
    //se debe modificar, ahora la fuente produce y almacena recursos, solo cuando se hace un despacho se envía el recurso
    //se reduce el inventario y se decrementa el dinero global
    /*if (money < this.precio_venta) return;
    let salientes = this.paths.filter(
      (p) =>
        (p.nodeA === this && p.activeAtoB) || (p.nodeB === this && p.activeBtoA)
    );
    salientes.forEach((path) => {
      path.send(this, this.item_gen);
      //reduce el dinero global
      money -= this.precio_venta;
    });*/
    this.inventory[this.item_gen] = (this.inventory[this.item_gen] || 0) + 1;
  }

  // Iniciar transformación de recursos
  iniciaTransformacion() {
    if (this.type !== "transformador") return;
    let cantidad = this.inventory[this.entry_item] || 0;
    if (!this.isProcessing && cantidad > 0) {
      this.isProcessing = true;
      this.lastTransformTime = Date.now();
    }
  }

  // Actualizar estado de transformación
  updateTransformation() {
    if (this.type !== "transformador") return;
    //se intenta enviar el recurso transformado si hay inventario presente en el nodo
    /*if ((this.inventory[this.transformed_item] || 0) > 0) {
      this.sendTransformedItem();
      return;
    }*/

    if (this.isProcessing) {
      // si el tiempo de transformación ha terminado se intenta guardar el recurso transformado
      if (now - this.lastTransformTime >= this.t_transform) {
        // Consumir el recurso de entrada
        this.consumeRecurso(this.entry_item);
        if (this.transformed_item) {
          // Almacenar el recurso transformado
          this.inventory[this.transformed_item] =
            (this.inventory[this.transformed_item] || 0) + 1;
        }
        // Reiniciar el proceso
        this.isProcessing = false;
        //this.sendTransformedItem();//el transformador ya no envía el recurso transformado inmediatamente
      }
    } else {
      // Si no está procesando, intentar iniciar la transformación
      this.iniciaTransformacion();
    }
  }

  //ahora los recursos transformados no se nvían inmediatamente, se envían cuando se solicita un despacho
  // Enviar el recurso transformado a un path saliente
  /*sendTransformedItem() {
    let rutasSalientes = this.paths.filter(
      (p) =>
        (p.nodeA === this && p.activeAtoB) || (p.nodeB === this && p.activeBtoA)
    );
    let count = this.inventory[this.transformed_item] || 0;
    if (rutasSalientes.length > 0 && count > 0) {
      let rand_index = Math.floor(Math.random() * rutasSalientes.length);
      let chosen = rutasSalientes[rand_index];
      this.consumeRecurso(this.transformed_item);
      chosen.send(this, this.transformed_item);//todo cambiar a despacharVehiculo con la carga del recurso
    }
  }*/

  // Actualizar estado del nodo
  updateNode() {
    // Si es una fuente y la producción está activa
    if (this.type === "fuente" && productionActive) {
      if (now - this.lastProductionTime >= this.productionInterval) {
        this.produceResource();
        this.lastProductionTime = now;
      }
    }
    // Si es un transformador, actualizar transformación
    if (this.type === "transformador") {
      this.updateTransformation();
    }

    // Actualizar clientes en la tienda
    if (this.type === "tienda") {
      //  filtrar clientes que aparecen ya atendidos
      this.clientesAtendiendo = this.clientesAtendiendo.filter((obj) => {
        return !obj.cliente.atendido;
      });
      // Intentar generar clientes en el área de influencia
      if (this.areaInfluencia) {
        this.areaInfluencia.tryGenerate();
      }
      this._buscarNuevosClientes();
    }
  }

  _buscarNuevosClientes() {
    // Capacidad disponible
    let disponible = this.capacidadAtencion - this.clientesAtendiendo.length;
    if (disponible <= 0) return;

    // Buscar clientes NO atendidos que estén en la lista global "clientes"
    // y que estén dentro del área de influencia
    let pendientes = clientes.filter(
      (c) => !c.atendido && c.tiempoEnEspera < c.tiempoEsperaMax
    );
    for (let c of pendientes) {
      if (this._estaEnAreaInfluencia(c.lat, c.lng)) {
        // Revisar si ya lo estamos atendiendo
        let existe = this.clientesAtendiendo.find((obj) => obj.cliente === c);
        if (
          !existe &&
          this.clientesAtendiendo.length < this.capacidadAtencion
        ) {
          // Intentar solicitar
          let ok = c.solicitarAtencion(this, this.factorAtencionClientes);
          if (ok) {
            this.clientesAtendiendo.push({ cliente: c });
          }
        }
      }
    }
  }

  _estaEnAreaInfluencia(lat, lng) {
    if (!this.areaInfluencia) return false;
    let dist = L.latLng(this.lat, this.lng).distanceTo([lat, lng]);
    return dist <= this.areaInfluencia.r;
  }

  /**
   * Este método es llamado cuando el cliente se finaliza en otra tienda y
   * queremos liberar la atención local sin consumir inventario.
   */
  abortarAtencion(cliente) {
    for (let i = this.clientesAtendiendo.length - 1; i >= 0; i--) {
      if (this.clientesAtendiendo[i].cliente === cliente) {
        this.clientesAtendiendo.splice(i, 1);
        break;
      }
    }
  }
}

/****************************************************
 * FUNCIONES PARA CREAR Y MANIPULAR NODOS
 ****************************************************/

function crearNodo(lat, lng) {
  let newN = new Node(lat, lng, "fuente");
  nodes.push(newN);
  nodeLayer.addNodes(nodes); // Actualizar la capa de nodos
  actualizaPanelControl();
}

function iniciarDistribucion() {
  nodes.forEach((n) => {
    if (n.type === "fuente") {
      n.produceResource();
    }
  });
}

function descargarAlmacenes() {
  nodes.forEach((n) => {
    if (n.type !== "almacen") return;
    let salientes = n.paths.filter(
      (p) => (p.nodeA === n && p.activeAtoB) || (p.nodeB === n && p.activeBtoA)
    );
    let total = Object.values(n.inventory).reduce((acc, val) => acc + val, 0);
    if (total === 0 || salientes.length === 0) return;

    let chosen = [];
    if (total < salientes.length) {
      chosen = shuffle(salientes).slice(0, total);
    } else {
      chosen = salientes;
    }
    chosen.forEach((cPath) => {
      let r = n.removeRandomResource();
      if (r) cPath.send(n, r);
    });
  });
}


function removerNodo(nodo) {
  let index = nodes.indexOf(nodo);
  if (index === -1) return;


  //remueve rutas
  nodes.forEach((n) => {
    if(n._id !== nodo._id) n.remueveRuta(nodo);
  } 
  );

  // Remove the node from the nodes array
  nodes.splice(index, 1);

  // Update the node layer
  nodeLayer.addNodes(nodes);

  // Update control panels
  actualizaPanelControl();
}

function getNodeColor(node) {
  switch (node.type) {
    case "fuente":
      return "green";
    case "sumidero":
      return "red";
    case "almacen":
      return "blue";
    case "transformador":
      return "orange";
    case "tienda":
      return "gold";
    default:
      return "gray";
  }
}
 
