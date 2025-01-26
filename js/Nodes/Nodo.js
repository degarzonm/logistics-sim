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
    let rand_index = Math.floor(Math.random() * Object.keys(tiposRecurso).length);
    this.item_gen = Object.keys(tiposRecurso)[rand_index];
    //si es fuente define un precio de venta para su recurso generado
    this.precio_venta = Math.floor(tiposRecurso[this.item_gen].precio*0.7);

    this.t_transform = t_transform;
    this.entry_item = entry_item;
    this.transformed_item = transformed_item;

    // NUEVO: Intervalo de producción (por nodo), por defecto 2000 ms
    this.productionInterval = 2000;

    this.inventory = {};
    this.paths = [];
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
  changeType(newType) {
    this.type = newType;
    // Actualizar direcciones activas en los paths conectados
    if (this.type === "tienda") {
      this.areaInfluencia = new AreaInfluencia(this);
    }
    if (this.type === "fuente") {
      this.precio_venta = Math.floor(tiposRecurso[this.item_gen].precio*0.7);
    }
    this.paths.forEach((p) => p.updateActiveDirections());
  }

  // Añadir recurso al inventario
  addResource(resourceType) {
    if (this.type === "fuente") return;
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
  removeResource(rType, cantidad = 1) {
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
    if (money < this.precio_venta) return;
    let salientes = this.paths.filter(
      (p) =>
        (p.nodeA === this && p.activeAtoB) || (p.nodeB === this && p.activeBtoA)
    );
    salientes.forEach((path) => {
      path.send(this, this.item_gen);
      //reduce el dinero global
      money -= this.precio_venta;
    });
  }

  // Iniciar transformación de recursos
  startTransformation() {
    if (this.type !== "transformador") return;
    let cant = this.inventory[this.entry_item] || 0;
    if (!this.isProcessing && cant > 0) {
      this.isProcessing = true;
      this.lastTransformTime = Date.now();
    }
  }

  // Actualizar estado de transformación
  updateTransformation() {
    if (this.type !== "transformador") return;
    if ((this.inventory[this.transformed_item] || 0) > 0) {
      this.sendTransformedItem();
      return;
    }
    if (this.isProcessing) {
      let now = Date.now();
      if (now - this.lastTransformTime >= this.t_transform) {
        this.removeResource(this.entry_item);
        if (this.transformed_item) {
          this.inventory[this.transformed_item] =
            (this.inventory[this.transformed_item] || 0) + 1;
        }
        this.sendTransformedItem();
        this.isProcessing = false;
      }
    } else {
      this.startTransformation();
    }
  }

  // Enviar el recurso transformado a un path saliente
  sendTransformedItem() {
    let salientes = this.paths.filter(
      (p) =>
        (p.nodeA === this && p.activeAtoB) || (p.nodeB === this && p.activeBtoA)
    );
    let count = this.inventory[this.transformed_item] || 0;
    if (salientes.length > 0 && count > 0) {
      let chosen = salientes[Math.floor(Math.random() * salientes.length)];
      this.removeResource(this.transformed_item);
      chosen.send(this, this.transformed_item);
    }
  }

  // Actualizar estado del nodo
  updateNode() {
    // Si es una fuente y la producción está activa
    if (this.type === "fuente" && productionActive) {
      let now = Date.now();
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
       let pendientes = clientes.filter(c => !c.atendido && c.tiempoEnEspera < c.tiempoEsperaMax);
       for (let c of pendientes) {
         if (this._estaEnAreaInfluencia(c.lat, c.lng)) {
           // Revisar si ya lo estamos atendiendo
           let existe = this.clientesAtendiendo.find((obj) => obj.cliente === c);
           if (!existe && this.clientesAtendiendo.length < this.capacidadAtencion) {
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
  // Deselect all nodes if no shift key
  if (!event.shiftKey) {
    nodes.forEach((n) => (n.selected = false));
  }

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
 
function remueveRuta(nodo, ruta) {
  if (!nodo || !ruta) return;

  // Remove the path from both nodes' paths arrays
  if (nodo === ruta.nodeA || nodo === ruta.nodeB) {
    nodo.paths = nodo.paths.filter((p) => p !== ruta);
    if (ruta.nodeA !== nodo) {
      ruta.nodeA.paths = ruta.nodeA.paths.filter((p) => p !== ruta);
    }
    if (ruta.nodeB !== nodo) {
      ruta.nodeB.paths = ruta.nodeB.paths.filter((p) => p !== ruta);
    }
  }

  // Remove the path from the global paths array
  paths = paths.filter((p) => p !== ruta);

  // Remove the path from the map
  ruta.removeFromMap();
}

function removerNodo(nodo) {
  let index = nodes.indexOf(nodo);
  if (index === -1) return;

  // Remove all paths associated with this node
  let removedPaths = [];
  for (let i = 0; i < nodo.paths.length; i++) {
    removedPaths.push(nodo.paths[i]);
  }
  removedPaths.forEach((p) => remueveRuta(nodo, p));

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
