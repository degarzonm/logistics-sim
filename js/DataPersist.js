/****************************************************
 * DataPersist.js
 * --------------------------------
 * Contiene las funciones exportState e importState
 * para serializar y deserializar el estado completo
 * de la simulación.
 ****************************************************/

/**
 * EXPORTAR ESTADO
 * Recolecta todos los datos relevantes de la simulación
 * y los guarda en un objeto JSON que luego se descarga.
 */
function exportState() {
  // 1) Construir la estructura principal del JSON
  
  // --- (A) Estado global principal ---
  let globalState = {
    productionActive: productionActive,
    productionInterval: productionInterval,
    money: money,
    puntaje: puntaje,
    gameSpeed: gameSpeed,
  };

  // --- (B) Serializar nodos ---
  //   Cada nodo tendrá sus propiedades, incluyendo su "areaInfluencia"
  //   solo si es de tipo "tienda".
  let serializedNodes = nodes.map((n) => {
    // Empaquetamos las propiedades básicas
    let nodeData = {
      _id : n._id,
      lat: n.lat,
      lng: n.lng,
      type: n.type,
      size: n.size,
      item_gen: n.item_gen,
      precio_venta: n.precio_venta,
      t_transform: n.t_transform,
      entry_item: n.entry_item,
      transformed_item: n.transformed_item,
      productionInterval: n.productionInterval,
      inventory: { ...n.inventory }, // clonamos el inventario
      flota : n.flota,
      lastProductionTime: n.lastProductionTime,
      lastTransformTime: n.lastTransformTime,
      isProcessing: n.isProcessing,
      capacidadAtencion: n.capacidadAtencion,
      factorAtencionClientes: n.factorAtencionClientes,
      selected: n.selected || false // Por si queremos guardar si está seleccionado
    };

    // Si es tienda, incluir estado del area de influencia
    if (n.type === "tienda" && n.areaInfluencia) {
      nodeData.areaInfluencia = {
        r: n.areaInfluencia.r,
        genInterval: n.areaInfluencia.genInterval,
        lastGenTime: n.areaInfluencia.lastGenTime
      };
    }
    // Guardamos las rutas de este nodo
    nodeData.rutas = n.rutas.map((ruta) => {
      let idxNodo = ruta.nodo._id;
      return {
        nodoId: idxNodo
      };
    });

    // También guardamos la lista de clientes que el nodo está atendiendo
    // En Node, "clientesAtendiendo" es un array de objetos { cliente }
    // Guardamos solo los índices de clientes para rearmar luego
    nodeData.clientesAtendiendo = n.clientesAtendiendo.map((obj) => {
      let indexCliente = clientes.indexOf(obj.cliente);
      return indexCliente;
    });

    return nodeData;
  });


  // --- (D) Serializar clientes ---
  //   Cada cliente tendrá sus datos y referencias a nodos o tiendas que lo atendían.
  //   El "nodoGenerador" se guarda como índice al array global de nodos.
  let serializedClientes = clientes.map((c) => {
    let nodoGeneradorIndex = nodes.indexOf(c.nodoGenerador);

    // La lista "tiendasAtendiendome" guarda objetos { tienda, tiempoRestante }
    // Guardamos `tiendaIndex` en lugar de la referencia directa
    let tiendasAtendiendome = c.tiendasAtendiendome.map((tObj) => {
      let idxTienda = nodes.indexOf(tObj.tienda);
      return {
        tiendaIndex: idxTienda,
        tiempoRestante: tObj.tiempoRestante
      };
    });

    return {
      lat: c.lat,
      lng: c.lng,
      nodoGeneradorIndex: nodoGeneradorIndex,
      demanda: { ...c.demanda },
      tiempoEsperaMax: c.tiempoEsperaMax,
      tiempoEnEspera: c.tiempoEnEspera,
      atendido: c.atendido,
      tiendasAtendiendome: tiendasAtendiendome
    };
  });

  // 2) Combinar todo en un único objeto
  let data = {
    globalState: globalState,
    nodes: serializedNodes,
    clientes: serializedClientes
  };

  // 3) Convertir en JSON y descargar como archivo
  let blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.href = url;
  link.download = "logisticsSim_file.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log("Estado exportado correctamente.");
}

/**
 * IMPORTAR ESTADO
 * Lee los datos de un objeto (parseado de JSON) y reconstruye
 * todo el estado de la simulación.
 */
async function importState(data) {
  // 1) Limpiar todo lo existente
  limpiarTodo(); // borra nodos, paths, clientes, partículas, etc.

  // 2) Restaurar la parte global
  if (data.globalState) {
    productionActive = data.globalState.productionActive || false;
    productionInterval = data.globalState.productionInterval || 2000;
    money = data.globalState.money || 0;
    puntaje = data.globalState.puntaje || 0;
    gameSpeed = data.globalState.gameSpeed || 1;
    // Agregar aquí cualquier otra variable que hayas decidido persistir
  }

  // 3) Reconstruir nodos
  //    Creamos instancias de Node con las propiedades guardadas
  data.nodes.forEach((nd) => {
    let n = new Node(
      nd.lat,
      nd.lng,
      nd.type,
      nd.size,
      nd.item_gen,
      nd.precio_venta,
      nd.t_transform,
      nd.entry_item,
      nd.transformed_item
    );

    // Sobrescribimos/ajustamos algunas propiedades
    n.item_gen = nd.item_gen;
    n.precio_venta = nd.precio_venta;
    n.t_transform = nd.t_transform;
    n.entry_item = nd.entry_item;
    n.transformed_item = nd.transformed_item;
    n.productionInterval = nd.productionInterval || 2000;
    n.inventory = { ...nd.inventory };
    n.lastProductionTime = nd.lastProductionTime || 0;
    n.lastTransformTime = nd.lastTransformTime || 0;
    n.isProcessing = nd.isProcessing || false;
    n.capacidadAtencion = nd.capacidadAtencion || 3;
    n.factorAtencionClientes = nd.factorAtencionClientes || 1;
    n.selected = nd.selected || false;

    // Si es tienda y tiene areaInfluencia
    if (n.type === "tienda" && nd.areaInfluencia) {
      let ai = nd.areaInfluencia;
      n.areaInfluencia.r = ai.r || 500;
      n.areaInfluencia.genInterval = ai.genInterval || 2800;
      n.areaInfluencia.lastGenTime = ai.lastGenTime || Date.now();
    }

    // n.clientesAtendiendo lo reconstruiremos más adelante cuando
    // sepamos los índices de los clientes.
    n.clientesAtendiendo = []; // Se poblará luego

    nodes.push(n);
  });

  // 4) Reconstruir paths
  //    Requerimos enlazar cada path con sus nodos A y B (por índice).
 

  // 5) Reconstruir clientes
  //    Para enlazar con nodos y tiendas en tiendasAtendiendome,
  //    usamos índices a nodes.
  if (data.clientes) {
    data.clientes.forEach((cd) => {
      let nodoGen =
        cd.nodoGeneradorIndex >= 0 ? nodes[cd.nodoGeneradorIndex] : null;

      let c = new Cliente(
        cd.lat,
        cd.lng,
        nodoGen,
        cd.demanda,
        cd.tiempoEsperaMax
      );
      c.tiempoEnEspera = cd.tiempoEnEspera || 0;
      c.atendido = cd.atendido || false;

      // Reconstruimos tiendasAtendiendome
      if (cd.tiendasAtendiendome) {
        c.tiendasAtendiendome = cd.tiendasAtendiendome.map((tObj) => {
          let tiendaRef = nodes[tObj.tiendaIndex];
          return {
            tienda: tiendaRef,
            tiempoRestante: tObj.tiempoRestante
          };
        });
      }

      clientes.push(c);
    });
  }

  // 6) Reconectar "clientesAtendiendo" en cada nodo
  //    Ahora que ya existen todos los clientes, podemos usarlos por índice.
  data.nodes.forEach((nd, idxNode) => {
    // Si el nodo actual es el idxNode, recuperamos su instancia real:
    let nodeInst = nodes[idxNode];

    // "nd.clientesAtendiendo" es un array de índices de clientes
    if (nd.clientesAtendiendo && nd.clientesAtendiendo.length > 0) {
      nd.clientesAtendiendo.forEach((clientIdx) => {
        let cliRef = clientes[clientIdx];
        if (cliRef) {
          nodeInst.clientesAtendiendo.push({ cliente: cliRef });
        }
      });
    }
  });

  // 7) Forzar un redibujado y actualizar paneles de control
  nodeLayer.draw();
  clienteLayer.draw();
  actualizaPanelControl();

  console.log("Estado importado correctamente.");
}

function handleImportFile(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = async (evt) => {
    let data = JSON.parse(evt.target.result);
    await importState(data);
  };
  reader.readAsText(file);
}