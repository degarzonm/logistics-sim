// src/core/GameState.js
// Versión unificada de GameState que combina la implementación original
// (gestión completa de nodos, paths, vehículos, efectos, etc.) con las
// extensiones funcionales introducidas en la versión más reciente
// (addMoney, efectos desacoplados, actualización de clientes, cambio de tipo
// de nodos seleccionados, etc.).

import { EventEmitter } from "./EventEmitter.js";
import { Node } from "../models/Node.js";
import { Path } from "../models/Path.js";
import { Vehiculo } from "../models/Vehicle.js";
import { Cliente } from "../models/Client.js";
import { Recurso } from "../models/Resource.js";
import { Pedido } from "../models/Pedido.js";
import { RouteService } from "../services/RouteService.js";

export class GameState extends EventEmitter {
  constructor() {
    super();

    // --- Propiedades de estado global -----------------------------------
    this.money = 1000000;
    this.productionActive = true;

    // Colecciones indexadas por id ---------------------------------------
    this.nodes = new Map();
    this.paths = new Map();
    this.vehicles = new Map();
    this.clients = new Map();
    this.pedidos = new Map();

    // Efectos visuales (texto flotante, explosiones, etc.)
    this.effects = [];

    // Catálogo de recursos disponibles nombre, precio, dificultad, color ------
    this.tiposRecurso = {
      A: new Recurso("A", 1000, 1, "#aa0000"),
      B: new Recurso("B", 2000, 1.5, "#00aa00"),
      C: new Recurso("C", 9000, 2, "#1212aa"),
      D: new Recurso("D", 3000, 3, "#aaaa00"),
      E: new Recurso("E", 4000, 4, "#00aaaa"),
    };

    // Restricciones de conexión entre tipos de nodo ----------------------
    this.allowedConnections = {
      fuente: ["almacen", "transformador", "tienda", "sumidero"],
      almacen: ["fuente", "almacen", "transformador", "sumidero"],
      transformador: ["almacen", "transformador", "sumidero"],
      sumidero: [],
      tienda: ["fuente", "almacen", "transformador", "sumidero"],
      generic: ["fuente", "almacen", "transformador", "sumidero"],
    };
  }

  /* --------------------------------------------------------------------- */
  /* ---------------------- API de utilidades extra ---------------------- */
  /* --------------------------------------------------------------------- */

  /** Incrementa la cantidad de dinero disponible. */
  addMoney(amount) {
    this.money += amount;
    this.emit("moneyChanged");
  }

  /**
   * Emite un evento para que la vista cree un efecto visual.
   * La data del efecto se pasa íntegra al listener correspondiente.
   */
  addEffect(effectData) {
    this.emit("effectAdded", effectData);
  }

  /** Modifica una propiedad arbitraria de un nodo y emite actualización. */
  updateNodeProperty(nodeId, property, value) {
    const node = this.nodes.get(nodeId);
    if (node && Object.prototype.hasOwnProperty.call(node, property)) {
      node[property] = value;
      this.emit("stateChanged");
    }
  }

  /** Cambia el tipo de todos los nodos actualmente seleccionados. */
  changeSelectedNodesType(newType) {
    this.nodes.forEach((node) => {
      if (node.selected) {
        node.type = newType;
        node.setCapacityByType(); // Actualizar capacidad según tipo

        if (newType === "fuente" && node.flota.length === 0) {
          node.initializeAsFuente?.();
          node.flota.forEach((v) => {
            this.vehicles.set(v.id, v);
            v.homeNodeId = node.id; // <-- AÑADIR: establecer base
          });
        }
      }
    });
    this.emit("stateChanged");
  }

  /** Elimina del mapa todos los nodos seleccionados actualmente. */
  removeSelectedNodes() {
    const toDelete = [];
    this.nodes.forEach((n) => {
      if (n.selected) toDelete.push(n.id);
    });
    toDelete.forEach((id) => this.removeNode(id));
  }

  /* --------------------------------------------------------------------- */
  /* ------------------- Métodos de mutación de estado ------------------- */
  /* --------------------------------------------------------------------- */

  addNode(lat, lng, type = "fuente") {
    const newNode = new Node(lat, lng, type);
    this.nodes.set(newNode.id, newNode);

    if (type === "fuente") {
      newNode.flota.forEach((v) => this.vehicles.set(v.id, v));
    }

    this.emit("nodeAdded", newNode);
    this.emit("stateChanged");
    return newNode;
  }

  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Quitar paths conectados
    [...node.pathIds].forEach((id) => this.removePath(id));

    // Eliminar vehículos asociados a la flota del nodo del estado global
    node.flota.forEach((v) => this.vehicles.delete(v.id));

    this.nodes.delete(nodeId);
    this.emit("nodeRemoved", nodeId);
    this.emit("stateChanged");
  }

  moveNode(nodeId, newLat, newLng) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.lat = newLat;
    node.lng = newLng;

    // Notificar a los listeners (por ejemplo mapView) que las geometrías asociadas deben actualizarse
    this.emit("nodeMoved", node);
    this.emit("stateChanged");
  }

  addPath(nodeA_id, nodeB_id, segments, geometry) {
    const nodeA = this.nodes.get(nodeA_id);
    const nodeB = this.nodes.get(nodeB_id);
    if (!nodeA || !nodeB) return null;

    const newPath = new Path(nodeA.id, nodeB.id, segments, geometry);
    this.paths.set(newPath.id, newPath);

    nodeA.addPath(newPath.id);
    nodeB.addPath(newPath.id);

    this.emit("pathAdded", newPath);
    this.emit("stateChanged");
    return newPath;
  }

  removePathBetween(nodeA_id, nodeB_id) {
    const nodeA = this.nodes.get(nodeA_id);
    if (!nodeA) return;

    for (const pathId of nodeA.pathIds) {
      const path = this.paths.get(pathId);
      if (
        (path.nodeA_id === nodeA_id && path.nodeB_id === nodeB_id) ||
        (path.nodeA_id === nodeB_id && path.nodeB_id === nodeA_id)
      ) {
        this.removePath(pathId);
        break;
      }
    }
  }

  removePath(pathId) {
    const path = this.paths.get(pathId);
    if (!path) return;

    const nodeA = this.nodes.get(path.nodeA_id);
    const nodeB = this.nodes.get(path.nodeB_id);

    nodeA?.removePath(pathId);
    nodeB?.removePath(pathId);

    this.paths.delete(pathId);
    this.emit("pathRemoved", pathId);
    this.emit("stateChanged");
  }

  toggleNodeSelection(nodeId, isShiftPressed) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    if (!isShiftPressed) {
      this.nodes.forEach((n) => {
        if (n.id !== nodeId) n.selected = false;
      });
    }

    node.selected = !node.selected;
    this.emit("selectionChanged");
    this.emit("stateChanged");
  }

  toggleVehicleSelection(vehicleId, isShiftPressed) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;

    if (!isShiftPressed) {
      this.clearSelections();
    }

    vehicle.selected = !vehicle.selected;
    this.emit("selectionChanged");
    this.emit("stateChanged");
  }

  clearSelections() {
    let changed = false;
    this.nodes.forEach((n) => {
      if (n.selected) {
        n.selected = false;
        changed = true;
      }
    });
    this.vehicles.forEach((v) => {
      if (v.selected) {
        v.selected = false;
        changed = true;
      }
    });
    if (changed) {
      this.emit("selectionChanged");
    }
  }

  toggleProduction() {
    this.productionActive = !this.productionActive;
    this.emit("productionStateChanged", this.productionActive);
    this.emit("stateChanged");
  }

  createPedido(origenId, destinoId, items) {
    const pedido = new Pedido(origenId, destinoId, items);
    this.pedidos.set(pedido.id, pedido);
    console.log(
      `[GameState] Nuevo pedido #${pedido.id} creado de ${destinoId} para ${origenId}. estado = ${pedido.estado}`
    );
    this.emit("stateChanged");
    return pedido;
  }

  async launchVehicleOnMission(vehicleId, pedidoId) {
    const vehiculo = this.vehicles.get(vehicleId);
    const pedido = this.pedidos.get(pedidoId);
    if (!vehiculo || !pedido) return;

    console.log(
      `[GameState] Lanzando vehículo #${vehicleId} para pedido #${pedidoId}`
    );
    const nodoOrigen = this.nodes.get(pedido.proveedorId);
    const nodoDestino = this.nodes.get(pedido.solicitanteId);

    const routeData = await new RouteService().getRoute(
      nodoOrigen,
      nodoDestino
    );
    if (routeData) {
      // Path es temporal y solo para este viaje
      const tempPath = new Path(
        nodoOrigen.id,
        nodoDestino.id,
        routeData.segments,
        routeData.geometry
      );
      this.paths.set(tempPath.id, tempPath);

      vehiculo.iniciarRutaMisionDePedido(
        tempPath.id,
        nodoOrigen,
        "ENTREGA",
        nodoDestino.id,
        pedido.id
      );
      this.emit("stateChanged");
    }
  }

  async assignVehicleToNode(vehicleId, nodeId) {
    const vehicle = this.vehicles.get(vehicleId);
    const node = this.nodes.get(nodeId);
    if (!vehicle || !node || vehicle.status !== "LIBRE") return;

    const routeData = await new RouteService().getRoute(
      { lat: vehicle.lat, lng: vehicle.lng },
      node
    );
    if (routeData) {
      const tempPath = new Path(
        0,
        nodeId,
        routeData.segments,
        routeData.geometry
      );
      this.paths.set(tempPath.id, tempPath);
      vehicle.iniciarRuta(
        tempPath.id,
        { lat: vehicle.lat, lng: vehicle.lng },
        "ASIGNACION",
        nodeId
      );
      this.emit("stateChanged");
    }
  }
  async moveFreeVehicleTo(vehicleId, latlng) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.status !== "LIBRE") return;

    const routeData = await new RouteService().getRoute(
      { lat: vehicle.lat, lng: vehicle.lng },
      latlng
    );
    if (routeData) {
      const tempPath = new Path(0, 0, routeData.segments, routeData.geometry); // Ruta virtual
      this.paths.set(tempPath.id, tempPath);
      vehicle.iniciarRuta(
        tempPath.id,
        { lat: vehicle.lat, lng: vehicle.lng },
        "MOVE",
        latlng
      );
      this.emit("stateChanged");
    }
  }
  expelVehicle(vehicleId) {
    const vehicle = this.vehicles.get(vehicleId);
    console.log(
      `[GameState] Expulsando vehículo #${vehicleId} del nodo ${vehicle.homeNodeId}`
    );
    if (!vehicle || vehicle.status !== "ESTACIONADO") return;

    const homeNode = this.nodes.get(vehicle.homeNodeId);
    if (homeNode) {
      homeNode.flota = homeNode.flota.filter((v) => v.id !== vehicleId);

      // Calcular una posición aleatoria en un radio de 20m
      const radius = 20; // metros
      const angle = Math.random() * 2 * Math.PI;
      const dLat = (radius * Math.cos(angle)) / 111111;
      const dLng =
        (radius * Math.sin(angle)) /
        (111111 * Math.cos(homeNode.lat * (Math.PI / 180)));
      const newLat = homeNode.lat + dLat;
      const newLng = homeNode.lng + dLng;

      vehicle.liberar(newLat, newLng);
      console.log(
        `[GameState] Vehículo #${vehicle.id} expulsado de Nodo #${homeNode.id} a [${newLat}, ${newLng}]`
      );
      this.emit("stateChanged");
    }
  }
  /* --------------------------------------------------------------------- */
  /* ------------------------- Lógica principal -------------------------- */
  /* --------------------------------------------------------------------- */

  update(dt, now, nodeLogic = null) {
    if (nodeLogic) nodeLogic.update(dt, now);
    this.updateVehicles(dt, now);
    this.updateClients(dt, now);
    this.emit("stateChanged");
  }

  /** Lógica por defecto si no se inyecta objeto externo. */
  internalNodeLogic(dt, now) {
    if (!this.productionActive) return;

    this.nodes.forEach((node) => {
      if (node.type === "fuente") {
        if (now - node.lastProductionTime >= node.productionInterval) {
          node.almacena({ [node.item_gen]: 1 });
          node.lastProductionTime = now;
        }
      }
      // TODO: lógica de transformadores, tiendas, sumideros...
    });
  }

  /** Lógica de movimiento y finalización de rutas de vehículos. */
  async updateVehicles(dt, now) {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.status === "EN_MISION" && !vehicle.rutaCompletada) {
        const path = this.paths.get(vehicle.pathId);
        if (!path) {
          vehicle.rutaCompletada = true;
          continue;
        }

        const speedMs = (vehicle.velocidad * 1000) / 3600;
        vehicle.segmentElapsedMs += dt;
        let segment = path.segments[vehicle.currentSegmentIndex];
        let travelTimeMs = (segment.distanceM / speedMs) * 1000;

        while (vehicle.segmentElapsedMs >= travelTimeMs) {
          vehicle.segmentElapsedMs -= travelTimeMs;
          vehicle.currentSegmentIndex++;
          if (vehicle.currentSegmentIndex >= path.segments.length) {
            vehicle.rutaCompletada = true;
            vehicle.lat = segment.lat2;
            vehicle.lng = segment.lng2;
            this.paths.delete(vehicle.pathId); // Borramos el path temporal

            const missionType = vehicle.mission.type;
            const destinationNode = this.nodes.get(
              vehicle.mission.targetNodeId
            );

            switch (missionType) {
              case "ENTREGA": {
                if (!destinationNode) break;
                const pedido = this.pedidos.get(vehicle.mission.pedidoId);
                if (pedido) pedido.estado = "COMPLETADO";
                destinationNode.almacena(vehicle.descargarTodo());

                const homeNode = this.nodes.get(vehicle.homeNodeId);
                if (homeNode) {
                  const routeData = await new RouteService().getRoute(
                    destinationNode,
                    homeNode
                  );
                  if (routeData) {
                    const returnPath = new Path(
                      destinationNode.id,
                      homeNode.id,
                      routeData.segments,
                      routeData.geometry
                    );
                    this.paths.set(returnPath.id, returnPath);
                    vehicle.iniciarRuta(
                      returnPath.id,
                      destinationNode,
                      "REGRESO",
                      homeNode.id
                    );
                  }
                } else {
                  vehicle.liberar(destinationNode.lat, destinationNode.lng);
                }
                break;
              }
              case "REGRESO":
              case "ASIGNACION": {
                if (destinationNode) vehicle.estacionar(destinationNode);
                break;
              }
              case "MOVE": {
                vehicle.liberar(
                  vehicle.mission.targetLatLng.lat,
                  vehicle.mission.targetLatLng.lng
                );
                break;
              }
            }
            this.emit("stateChanged");
            break;
          }
          segment = path.segments[vehicle.currentSegmentIndex];
          travelTimeMs = (segment.distanceM / speedMs) * 1000;
        }
        if (!vehicle.rutaCompletada) {
          //avance interpolado en el segmento actual
          const t = vehicle.segmentElapsedMs / travelTimeMs;
          vehicle.lat = segment.lat1 + (segment.lat2 - segment.lat1) * t;
          vehicle.lng = segment.lng1 + (segment.lng2 - segment.lng1) * t;
        }
      }
    }
  }

  /** Lógica asociada a los clientes (tiempo de espera / desistimiento). */
  updateClients(dt, now) {
    this.clients.forEach((client) => {
      if (client.atendido || client.desistio) {
        this.clients.delete(client.id);
        return;
      }

      client.tiempoEnEspera += dt;
      if (client.tiempoEnEspera >= client.tiempoEsperaMax) {
        client.desistio = true;
        this.addEffect({
          type: "text",
          lat: client.lat,
          lng: client.lng,
          text: "X",
          color: "#FF4136",
          startTime: now,
        });
      }
    });
  }

  /* --------------------------------------------------------------------- */
  /* ----------------------------- Utilidades ---------------------------- */
  /* --------------------------------------------------------------------- */

  /** Encuentra un nodo cercano a unas coordenadas (umbral en metros). */
  findNodeAt(lat, lng, threshold = 30) {
    for (const node of this.nodes.values()) {
      const dist = L.latLng(node.lat, node.lng).distanceTo([lat, lng]);
      if (dist < threshold) return node;
    }
    return null;
  }

  /* --------------------------------------------------------------------- */
  /* -------------------- Persistencia / serialización ------------------- */
  /* --------------------------------------------------------------------- */

  getFullState() {
    return {
      money: this.money,
      productionActive: this.productionActive,
      nodes: Array.from(this.nodes.values()),
      paths: Array.from(this.paths.values()),
      vehicles: Array.from(this.vehicles.values()),
      clients: Array.from(this.clients.values()),
    };
  }

  setFullState(data) {
    this.money = data.money ?? 1000000;
    this.productionActive = data.productionActive ?? false;

    this.nodes.clear();
    this.paths.clear();
    this.vehicles.clear();
    this.clients.clear();

    Node.nextId = 1;
    Path.nextId = 1;
    Vehiculo.nextId = 1;
    Cliente.nextId = 1;

    // Reconstruir nodos
    data.nodes?.forEach((nd) => {
      const node = Object.assign(new Node(0, 0), nd);
      this.nodes.set(node.id, node);
      if (node.id >= Node.nextId) Node.nextId = node.id + 1;
    });

    // Reconstruir paths
    data.paths?.forEach((pd) => {
      const path = Object.assign(new Path(), pd);
      this.paths.set(path.id, path);
      if (path.id >= Path.nextId) Path.nextId = path.id + 1;
    });

    // Reconstruir vehículos
    data.vehicles?.forEach((vd) => {
      const vehicle = Object.assign(new Vehiculo(), vd);
      this.vehicles.set(vehicle.id, vehicle);
      if (vehicle.id >= Vehiculo.nextId) Vehiculo.nextId = vehicle.id + 1;
    });

    // Reconstruir clientes
    data.clients?.forEach((cd) => {
      const client = Object.assign(new Cliente(), cd);
      this.clients.set(client.id, client);
      if (client.id >= Cliente.nextId) Cliente.nextId = client.id + 1;
    });

    this.emit("stateImported");
    this.emit("stateChanged");
  }

  /** Borra todo el estado de la simulación. */
  clearAll() {
    this.nodes.clear();
    this.paths.clear();
    this.vehicles.clear();
    this.clients.clear();

    this.money = 1000;
    this.productionActive = false;

    Node.nextId = 1;
    Path.nextId = 1;
    Vehiculo.nextId = 1;
    Cliente.nextId = 1;

    this.emit("stateCleared");
    this.emit("stateChanged");
  }
}
