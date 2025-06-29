import { Cliente } from "../models/Client.js";

/**
 * Encapsula la lógica de actualización para todos los tipos de nodos.
 */
export class NodeLogic {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update(dt, now) {
    if (this.gameState.productionActive) {
      this.gameState.nodes.forEach((node) => {
        this.updateProduction(node, now);
      });
    }

    this.gameState.nodes.forEach((node) => {
      if (node.type === "tienda") {
        this.updateTienda(node, dt, now);
      } else if (node.type === "transformador") {
        this.updateTransformation(node, now);
      }
    });

    // NUEVO: Procesar la lógica de pedidos en cada ciclo
    this.processPendingPedidos();
  }

  updateProduction(node, now) {
    if (
      node.type === "fuente" &&
      now - node.lastProductionTime >= node.productionInterval
    ) {
      node.almacena({ [node.item_gen]: 1 });
      node.lastProductionTime = now;
    }
  }

  updateTransformation(node, now) {
    if (node.type !== "transformador") return;

    if (node.isProcessing) {
      if (now - node.lastTransformTime >= node.t_transform) {
        node.consumir({ [node.entry_item]: 1 });
        node.almacena({ [node.transformed_item]: 1 });
        node.isProcessing = false;
      }
    } else if (node.tieneInventarioSuficiente({ [node.entry_item]: 1 })) {
      node.isProcessing = true;
      node.lastTransformTime = now;
    }
  }

  updateTienda(node, dt, now) {
    // 1. Generar nuevos clientes si corresponde
    if (
      now - node.areaInfluencia.lastGenTime >=
      node.areaInfluencia.genInterval
    ) {
      this.generateClientsForTienda(node);
      node.areaInfluencia.lastGenTime = now;
    }

    // 2. Buscar clientes pendientes para atender
    if (node.clientesAtendiendoIds.size < node.capacidadAtencion) {
      this.findNewClientsToServe(node);
    }
  }

  generateClientsForTienda(node) {
    const numClientes = Math.floor(Math.random() * 10) + 1;
    for (let i = 0; i < numClientes; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * node.areaInfluencia.r + 10;

      // Usamos la aproximación de la fórmula original para el offset
      const dLat = (radius * Math.cos(angle)) / 111111;
      const dLng =
        (radius * Math.sin(angle)) /
        (111111 * Math.cos(node.lat * (Math.PI / 180)));
      const clientLatLng = { lat: node.lat + dLat, lng: node.lng + dLng };

      const demanda = this.generateRandomDemand();
      const cliente = new Cliente(
        clientLatLng.lat,
        clientLatLng.lng,
        demanda,
        5000 + Math.floor(Math.random() * 5000), // Tiempo de espera aleatorio entre 5 y 9 segundos
        node.id
      );
      this.gameState.clients.set(cliente.id, cliente);
    }
  }

  generateRandomDemand() {
    let demanda = {};
    const tipos = Object.keys(this.gameState.tiposRecurso);
    const numItems = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numItems; i++) {
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      demanda[tipo] = (demanda[tipo] || 0) + 1;
    }
    return demanda;
  }

  findNewClientsToServe(tienda) {
    for (const cliente of this.gameState.clients.values()) {
      if (tienda.clientesAtendiendoIds.size >= tienda.capacidadAtencion) break;

      // Si el cliente no está siendo atendido, está en el área, y la tienda tiene inventario
      if (
        !cliente.atendido &&
        !cliente.desistio &&
        cliente.tiendasAtendiendoIds.size === 0
      ) {
        const dist = L.latLng(tienda.lat, tienda.lng).distanceTo([
          cliente.lat,
          cliente.lng,
        ]);
        if (
          dist <= tienda.areaInfluencia.r &&
          tienda.tieneInventarioSuficiente(cliente.demanda)
        ) {
          // Lógica de atención (simplificada para el ejemplo, se podría expandir)
          // La tienda "reclama" al cliente. En una simulación más compleja, habría un tiempo de "servicio".

          // Se consume el inventario y se gana dinero.
          tienda.consumir(cliente.demanda);
          let ganancia = 0;
          for (const tipo in cliente.demanda) {
            ganancia +=
              this.gameState.tiposRecurso[tipo].precio * cliente.demanda[tipo];
          }
          this.gameState.addMoney(ganancia);

          cliente.atendido = true;
          this.gameState.addEffect({
            type: "text",
            lat: cliente.lat,
            lng: cliente.lng,
            text: `+$${Math.floor(ganancia)}`,
            color: "#00FF00",
            startTime: Date.now(),
          });
        }
      }
    }
  }

  processPendingPedidos() {
    //console.log("[NodeLogic] Procesando pedidos pendientes...");
    for (const pedido of this.gameState.pedidos.values()) {
      if (pedido.estado !== "PENDIENTE") {
        //console.log( `[NodeLogic] Pedido #${pedido.id} ya no está pendiente: ${pedido.estado}`);
        continue;
      }

      const proveedor = this.gameState.nodes.get(pedido.proveedorId);
      if (!proveedor) {
        pedido.estado = "RECHAZADO";
        continue;
      }

      if (proveedor.tieneInventarioSuficiente(pedido.items)) {
        const vehiculo = proveedor.flota.find(
          (v) => (v.status === "ESTACIONADO" || v.status === "LIBRE") && v.puedeCargar(pedido)
        );
        if (vehiculo) {
          console.log(
            `[NodeLogic] Pedido #${pedido.id} aprobado. Proveedor #${proveedor.id} tiene stock y vehículo #${vehiculo.id} disponible.`
          );
          proveedor.consumir(pedido.items);
          vehiculo.cargar(pedido.items);
          proveedor.flota = proveedor.flota.filter((v) => v.id !== vehiculo.id);

          this.gameState.launchVehicleOnMission(vehiculo.id, pedido.id);

          pedido.estado = "EN_RUTA";
          pedido.vehiculoAsignadoId = vehiculo.id;
        }
      }
    }
  }
}
