import { MainControlUI } from "../views/ui/MainControlUI.js";

export class UIController {
  constructor({
    gameState,
    persistenceService,
    mapController,
    nodePanelUI,
    vehiclePanelUI,
  }) {
    this.gameState = gameState;
    this.persistenceService = persistenceService;
    this.mapController = mapController;
    this.nodePanelUI = nodePanelUI; 
    this.vehiclePanelUI = vehiclePanelUI;
    // Instanciar y vincular la UI del panel principal
    this.mainControlUI = new MainControlUI();
    this.mainControlUI.bindActions(this.getMainControlActions());

    this._setupStateListeners();
  }

  _setupStateListeners() {
    this.gameState.on("selectionChanged", () => {
      const selectedNode = Array.from(this.gameState.nodes.values()).find(
        (n) => n.selected
      );
      const selectedVehicle = Array.from(this.gameState.vehicles.values()).find(
        (v) => v.selected
      );

      if (selectedNode) {
        this.nodePanelUI.update();
        //this.vehiclePanelUI.hide();
      } else if (selectedVehicle) {
        this.vehiclePanelUI.update();
        this.nodePanelUI.update(); // Para que oculte los paneles de nodo
      } else {
        this.nodePanelUI.update();
        this.vehiclePanelUI.hide();
      }
    });

    this.gameState.on("stateChanged", () => {
      // CORRECCIÓN: Se elimina esta sección. Este era el origen principal del
      // parpadeo, ya que `stateChanged` se emite en cada frame. El panel del nodo
      // ahora se actualiza de forma más inteligente a través de otros eventos
      // como `selectionChanged` o su contenido se actualiza sin recrear el DOM.
      /*
      if (this.nodePanelUI.hasVisiblePanels()) {
        this.nodePanelUI.update();
      }
      */
      // El panel del vehículo se actualiza en el game loop para seguirlo, eso está bien.
    });
  }

  // Define las acciones para los botones de control principales
  getMainControlActions() {
    return {
      onCreatePath: () => this.mapController.createPathsForSelectedNodes(),
      onClearPath: () => this.mapController.removePathsForSelectedNodes(),
      onClearAll: () => this.gameState.clearAll(),
      onToggleProduction: () => this.gameState.toggleProduction(),
      onExport: () => this.persistenceService.exportState(),
      onImport: (file) => this.persistenceService.importState(file),
    };
  }
}
