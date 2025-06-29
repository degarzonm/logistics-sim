import { GameState } from "./core/GameState.js";
import { GameLoop } from "./core/GameLoop.js";
import { MapView } from "./views/MapView.js";
import { StatsUI } from "./views/ui/StatsUI.js";
import { NodePanelUI } from "./views/ui/NodePanelUI.js";
import { VehiclePanelUI } from "./views/ui/VehiclePanelUI.js";
import { MapController } from "./controllers/MapController.js";
import { UIController } from "./controllers/UIController.js";
import { KeyboardController } from "./controllers/KeyboardController.js";
import { PersistenceService } from "./services/PersistenceService.js";
import { NodeLogic } from "./services/NodeLogic.js";

const MAP_INIT_LAT_LNG = { lat: 4.6733543, lng: -74.09804 };

window.addEventListener("load", () => {
  // --- 1. MODELO Y SERVICIOS ---
  const gameState = new GameState();
  const nodeLogic = new NodeLogic(gameState);
  const persistenceService = new PersistenceService(gameState);

  // --- 2. VISTAS ---
  const mapView = new MapView("map", MAP_INIT_LAT_LNG, 17);
  const statsUI = new StatsUI(document.getElementById("estadisticaDinero"));
  const nodePanelUI = new NodePanelUI(
    document.getElementById("control-panels-container"),
    gameState,
    mapView
  );
  const vehiclePanelUI = new VehiclePanelUI(
    document.getElementById("control-panels-container"),
    gameState,
    mapView
  );
  // --- 3. CONTROLADORES ---
  const mapController = new MapController(
    mapView.getMap(),
    gameState,
    mapView.nodeLayer,
    mapView.vehicleLayer
  );
  const uiController = new UIController({
    gameState,
    persistenceService,
    mapController,
    nodePanelUI,
    vehiclePanelUI,
  });

  const keyboardActions = {
    c: () => mapController.createPathsForSelectedNodes(),
    l: () => mapController.removePathsForSelectedNodes(),
    e: () => gameState.toggleProduction(),
    f: () => gameState.changeSelectedNodesType("fuente"),
    s: () => gameState.changeSelectedNodesType("sumidero"),
    a: () => gameState.changeSelectedNodesType("almacen"),
    t: () => gameState.changeSelectedNodesType("transformador"),
    y: () => gameState.changeSelectedNodesType("tienda"),
    x: () => gameState.removeSelectedNodes(),
    Delete: () => gameState.removeSelectedNodes(),
  };
  const keyboardController = new KeyboardController(keyboardActions);

  // --- 4. CONEXIÓN MODELO-VISTA (Event Binding) ---
  gameState.on("stateChanged", () => {
    const state = gameState.getFullState();
    mapView.render({
      nodes: Array.from(state.nodes.values()),
      paths: Array.from(state.paths.values()),
      vehicles: Array.from(state.vehicles.values()).filter(
        (v) => v.status !== "ESTACIONADO"
      ),
      clients: Array.from(state.clients.values()),
    });
    statsUI.update({ money: gameState.money });
  });
  gameState.on("moneyChanged", () => statsUI.update({ money: gameState.money }));

  gameState.on("effectAdded", (effect) => mapView.addEffect(effect));
  gameState.on("stateImported", () => gameState.emit("stateChanged"));
  gameState.on("stateCleared", () => mapView.clearAll());
  gameState.on("productionStateChanged", (isActive) =>
    uiController.mainControlUI.update({ isProductionActive: isActive })
  );

  // --- 5. BUCLE DEL JUEGO ---
  const gameLoop = new GameLoop(
    (dt, now) => gameState.update(dt, now, nodeLogic),
    () => {
      mapView.renderEffects();
      vehiclePanelUI.update();
    }
  );

  // --- ARRANQUE ---
  gameState.emit("stateChanged"); // Renderizado inicial
  gameLoop.start();

  console.log("Simulador de Logística inicializado y completo.");
});
