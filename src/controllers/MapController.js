// src/controllers/MapController.js
import { RouteService } from "../services/RouteService.js";

const DRAG_RECALCULATION_THRESHOLD_METERS = 15;

export class MapController {
  constructor(map, gameState, nodeLayer, vehicleLayer) {
    this.map = map;
    this.gameState = gameState;
    this.nodeLayer = nodeLayer;
    this.vehicleLayer = vehicleLayer;

    this.routeService = new RouteService(); // Servicio para obtener rutas de OSRM

    this.draggingNode = null;
    this.dragStartPoint = null;
    this._setupListeners();
  }

  _setupListeners() {
    this.map.on("contextmenu", this._onRightClick.bind(this));

    const canvas = this.nodeLayer.getCanvasElement();
    canvas.addEventListener("mousedown", this._onMouseDown.bind(this));
    canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
    canvas.addEventListener("mouseup", this._onMouseUp.bind(this));
    canvas.addEventListener("click", this._onClick.bind(this));
  }

  _getCanvasPoint(e) {
    const rect = e.target.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // --- MANEJADORES DE EVENTOS ---
  _onRightClick(e) {
    e.originalEvent.preventDefault();
    
    const selectedVehicle = Array.from(this.gameState.vehicles.values()).find(
      v => v.selected && v.status === 'LIBRE'
    );
    
    if (selectedVehicle) {
      // Si hay un vehículo libre seleccionado, la acción es moverlo.
      const point = e.containerPoint;
      const clickedNode = this.nodeLayer.getNodeAtPoint(point.x, point.y);
      
      if (clickedNode) {
        // Clic derecho sobre un nodo: ASIGNARLO
        this.gameState.assignVehicleToNode(selectedVehicle.id, clickedNode.id);
      } else {
        // Clic derecho sobre el mapa: MOVERLO
        this.gameState.moveFreeVehicleTo(selectedVehicle.id, e.latlng);
      }
    } else {
      // Si no hay vehículo seleccionado, la acción es crear un nodo.
      this.gameState.addNode(e.latlng.lat, e.latlng.lng, 'fuente');
    }
  }

  _onMouseDown(e) {
    const point = this._getCanvasPoint(e);
    const clickedNode = this.nodeLayer.getNodeAtPoint(point.x, point.y);

    if (clickedNode) {
      this.draggingNode = clickedNode;
      this.dragStartPoint = point;
      // AÑADIR: Guardamos la posición geográfica inicial
      this.dragStartLatLng = L.latLng(clickedNode.lat, clickedNode.lng);
      this.map.dragging.disable();
    }
  }

  _onMouseMove(e) {
    if (!this.draggingNode) return;

    const point = this._getCanvasPoint(e);
    const newLatLng = this.map.containerPointToLatLng(point);

    this.draggingNode.lat = newLatLng.lat;
    this.draggingNode.lng = newLatLng.lng;

    this.nodeLayer.draw();
  }

  _onMouseUp(e) {
    if (this.draggingNode) {
      const finalLatLng = L.latLng(
        this.draggingNode.lat,
        this.draggingNode.lng
      );
      const distanceMoved = this.dragStartLatLng.distanceTo(finalLatLng);

      // Si se movió más del umbral, persistimos el cambio.
      if (distanceMoved > DRAG_RECALCULATION_THRESHOLD_METERS) {
        this.gameState.moveNode(
          this.draggingNode.id,
          finalLatLng.lat,
          finalLatLng.lng
        );
        this.recalculateNodePaths(this.draggingNode.id);
      } else {
        // Si no, revertimos la posición visual y forzamos un redibujado
        // desde el estado original (sin cambios).
        this.draggingNode.lat = this.dragStartLatLng.lat;
        this.draggingNode.lng = this.dragStartLatLng.lng;
        // Emitir stateChanged asegura que la vista se sincronice con el estado real
        this.gameState.emit("stateChanged");
      }

      this.draggingNode = null;
      this.dragStartPoint = null;
      this.dragStartLatLng = null;
      this.map.dragging.enable();
    }
  }

  _onClick(e) {
    const distanceDragged = this.dragStartPoint
      ? Math.hypot(
          e.clientX - this.dragStartPoint.x,
          e.clientY - this.dragStartPoint.y
        )
      : 0;
    if (distanceDragged > 5) {
      // Si se movió más de 5px, no es un click
      return;
    }

    const point = this._getCanvasPoint(e);
    const clickedNode = this.nodeLayer.getNodeAtPoint(point.x, point.y);

    const clickedVehicle = this.vehicleLayer.getVehicleAtPoint(
      point.x,
      point.y
    );

    if (clickedNode) {
      this.gameState.toggleNodeSelection(clickedNode.id, e.shiftKey);
    } else if (clickedVehicle) {
      this.gameState.toggleVehicleSelection(clickedVehicle.id, e.shiftKey); // Necesitaremos este método
    } else {
      this.gameState.clearSelections();
    }
  }

  // --- MÉTODOS DE ACCIÓN (Llamados por UIController o atajos de teclado) ---

  async createPathsForSelectedNodes() {
    const selectedNodes = Array.from(this.gameState.nodes.values()).filter(
      (n) => n.selected
    );
    if (selectedNodes.length < 2) return;

    for (let i = 0; i < selectedNodes.length - 1; i++) {
      for (let j = i + 1; j < selectedNodes.length; j++) {
        const nodeA = selectedNodes[i];
        const nodeB = selectedNodes[j];

        // Pedir la ruta al servicio
        const routeData = await this.routeService.getRoute(nodeA, nodeB);
        if (routeData) {
          // Añadir la ruta al estado del juego
          this.gameState.addPath(
            nodeA.id,
            nodeB.id,
            routeData.segments,
            routeData.geometry
          );
        }
      }
    }
  }

  removePathsForSelectedNodes() {
    const selectedNodes = Array.from(this.gameState.nodes.values()).filter(
      (n) => n.selected
    );
    if (selectedNodes.length < 2) return;

    for (let i = 0; i < selectedNodes.length - 1; i++) {
      for (let j = i + 1; j < selectedNodes.length; j++) {
        this.gameState.removePathBetween(
          selectedNodes[i].id,
          selectedNodes[j].id
        );
      }
    }
  }

  async recalculateNodePaths(nodeId) {
    const node = this.gameState.nodes.get(nodeId);
    if (!node) return;

    const connectedNodeIds = [];
    for (const pathId of node.pathIds) {
      const path = this.gameState.paths.get(pathId);
      const otherNodeId =
        path.nodeA_id === nodeId ? path.nodeB_id : path.nodeA_id;
      connectedNodeIds.push(otherNodeId);
    }

    // Borramos las rutas viejas
    [...node.pathIds].forEach((pathId) => this.gameState.removePath(pathId));

    // Y creamos las nuevas con la posición actualizada
    for (const otherNodeId of connectedNodeIds) {
      const otherNode = this.gameState.nodes.get(otherNodeId);
      const routeData = await this.routeService.getRoute(node, otherNode);
      if (routeData) {
        this.gameState.addPath(
          node.id,
          otherNode.id,
          routeData.segments,
          routeData.geometry
        );
      }
    }
  }
}
