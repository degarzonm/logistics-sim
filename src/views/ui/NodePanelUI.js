import { debounce } from "../../utils/utils.js";
import { PedidoPanelUI } from "./PedidoPanelUI.js";

export class NodePanelUI {
  /**
   * @param {HTMLElement} container Contenedor donde se insertan los paneles.
   * @param {GameState} gameState   Referencia al estado del juego.
   * @param {Object|null} mapView   Vista de mapa con getMap() o null.
   */
  constructor(container, gameState, mapView = null) {
    this.container = container;
    this.gameState = gameState;
    this.mapView = mapView;
    this.panels = new Map();
    this.activePedidoPanel = null;

    // CAMBIO: Escuchamos el evento `stateChanged` para actualizar el contenido
    // de los paneles visibles de forma eficiente, sin redibujar todo.
    this.gameState.on("stateChanged", () => this.updatePanelsContent());
  }

  // NUEVA FUNCIÓN: Actualiza solo el contenido de los paneles ya visibles.
  updatePanelsContent() {
    if (this.panels.size === 0) return;

    this.panels.forEach((panelEl, nodeId) => {
      const node = this.gameState.nodes.get(nodeId);
      if (node) {
        // Llamamos a las funciones que solo actualizan texto o listas de forma inteligente.
        this.buildOrUpdatePanelContent(panelEl, node);
      }
    });
  }

  hasVisiblePanels() {
    return this.panels.size > 0;
  }

  /**
   * Sincroniza los paneles abiertos con la selección de nodos y los posiciona.
   * Esta función ahora se centra en CREAR y DESTRUIR paneles, no en actualizar su contenido
   * frame a frame.
   */
  update() {
    const selectedNodes = Array.from(this.gameState.nodes.values()).filter(
      (n) => n.selected
    );
    const currentIds = new Set(this.panels.keys());
    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // 1. Remover paneles de nodos ya no seleccionados
    currentIds.forEach((id) => {
      if (!selectedIds.has(id)) {
        this.panels.get(id)?.remove();
        this.panels.delete(id);
      }
    });

    // 2. Crear paneles para nodos recién seleccionados
    selectedNodes.forEach((node) => {
      if (!this.panels.has(node.id)) {
        const panelEl = this.createPanel(node);
        this.container.appendChild(panelEl);
        this.panels.set(node.id, panelEl);
        this.buildOrUpdatePanelContent(panelEl, node); // Construcción inicial
        this.positionPanel(panelEl, node);
      }
    });
  }

  createPanel(node) {
    const panelEl = document.createElement("div");
    panelEl.className = "node-control-panel";
    panelEl.style.position = "absolute";
    panelEl.dataset.nodeId = node.id;
    return panelEl;
  }

  /* ------------------------------------------------------------------ */
  /*                            Posicionamiento                         */
  /* ------------------------------------------------------------------ */

  positionPanel(panelEl, node) {
    const mapInstance = this.mapView?.getMap?.() ?? (window.L && window.map);
    if (!mapInstance) return;

    const point = mapInstance.latLngToContainerPoint([node.lat, node.lng]);
    const mapSize = mapInstance.getSize();
    const { width, height } = panelEl.getBoundingClientRect();

    let left = point.x + 20;
    let top = point.y - 10;

    if (left + width > mapSize.x - 10) left = point.x - width - 20;
    if (top + height > mapSize.y - 10) top = mapSize.y - height - 10;
    if (top < 10) top = 10;

    panelEl.style.left = `${left}px`;
    panelEl.style.top = `${top}px`;
  }

  /* ------------------------------------------------------------------ */
  /*                Construcción / actualización de UI                  */
  /* ------------------------------------------------------------------ */

  buildOrUpdatePanelContent(panelEl, node) {
    // Si el tipo de nodo ha cambiado, reconstruir todo el panel.
    if (panelEl.dataset.nodeType !== node.type) {
      panelEl.innerHTML = "";
      panelEl.dataset.nodeType = node.type;
    }

    let title = panelEl.querySelector("h4");
    if (!title) {
      title = document.createElement("h4");
      panelEl.appendChild(title);
    }
    title.textContent = `${node.type} #${node.id}`;

    this.createOrUpdateInfoLine(
      panelEl,
      "inventory",
      `Inventario: ${node.getInventoryTotal()} / ${
        isFinite(node.inventoryCapacity) ? node.inventoryCapacity : "∞"
      }`
    );

    switch (node.type) {
      case "fuente":
        this.buildOrUpdateFuenteControls(panelEl, node);
        break;
      case "transformador":
        this.buildOrUpdateTransformadorControls(panelEl, node);
        break;
    }

    if (["fuente", "almacen", "transformador", "tienda"].includes(node.type)) {
      this.buildOrUpdateFlotaList(panelEl, node);
      this.createOrUpdateButton(panelEl, "crear-pedido", "Crear Pedido", () => {
        if (this.activePedidoPanel) this.activePedidoPanel.destroy();
        this.activePedidoPanel = new PedidoPanelUI(
          document.body,
          this.gameState,
          node,
          (origenId, destinoId, items) => {
            this.gameState.createPedido(origenId, destinoId, items);
            //this.activePedidoPanel = null;
          },
          () => {
            this.activePedidoPanel = null;
          }
        );
      });
    }
  }

  /* --------------------- Controles para FUENTE ----------------------- */

  buildOrUpdateFuenteControls(panelEl, node) {
    const resources = Object.keys(this.gameState.tiposRecurso);
    this.createOrUpdateSelect(
      panelEl,
      "item_gen",
      "Genera:",
      resources,
      node.item_gen,
      (value) => this.gameState.updateNodeProperty(node.id, "item_gen", value)
    );
    this.createOrUpdateNumberInput(
      panelEl,
      "productionInterval",
      "Intervalo (s):",
      node.productionInterval / 1000,
      (value) =>
        this.gameState.updateNodeProperty(
          node.id,
          "productionInterval",
          value * 1000
        )
    );
  }
 
  buildOrUpdateFlotaList(panelEl, node) {
    let listContainer = panelEl.querySelector(".vehicle-list");
    if (!listContainer) {
      listContainer = document.createElement("div");
      listContainer.className = "vehicle-list";
      listContainer.innerHTML = "<h5>Flota</h5>";
      panelEl.appendChild(listContainer);
    }

    // 1. Mapear los elementos del DOM existentes por ID de vehículo.
    const domVehicleItems = new Map();
    listContainer.querySelectorAll(".vehicle-list-item").forEach((item) => {
      domVehicleItems.set(item.dataset.vehicleId, item);
    });

    const stateVehicleIds = new Set(node.flota.map((v) => String(v.id)));

    // 2. Eliminar del DOM los vehículos que ya no están en la flota del nodo.
    domVehicleItems.forEach((item, vehicleId) => {
      if (!stateVehicleIds.has(vehicleId)) {
        item.remove();
        domVehicleItems.delete(vehicleId);
      }
    });

    // 3. Añadir al DOM los vehículos de la flota que no tienen un elemento.
    node.flota.forEach((vehicle) => {
      if (!domVehicleItems.has(String(vehicle.id))) {
        const itemEl = document.createElement("div");
        itemEl.className = "vehicle-list-item";
        itemEl.dataset.vehicleId = vehicle.id; // Guardamos el ID para futuras referencias.
        itemEl.innerHTML = `<span>${vehicle.tipo} #${vehicle.id}</span>`;

        const expelBtn = document.createElement("button");
        expelBtn.className = "expel-button";
        expelBtn.textContent = "Expulsar";
        expelBtn.onclick = () => {
          this.gameState.expelVehicle(vehicle.id);
        };

        itemEl.appendChild(expelBtn);
        listContainer.appendChild(itemEl);
      }
    });
  }

  /* ----------------- Controles para TRANSFORMADOR -------------------- */
  buildOrUpdateTransformadorControls(panelEl, node) {
    const resources = Object.keys(this.gameState.tiposRecurso);
    this.createOrUpdateSelect(
      panelEl,
      "entry_item",
      "Entra:",
      resources,
      node.entry_item,
      (value) => this.gameState.updateNodeProperty(node.id, "entry_item", value)
    );
    this.createOrUpdateSelect(
      panelEl,
      "transformed_item",
      "Sale:",
      resources,
      node.transformed_item,
      (value) =>
        this.gameState.updateNodeProperty(node.id, "transformed_item", value)
    );
    this.createOrUpdateNumberInput(
      panelEl,
      "t_transform",
      "Tiempo (s):",
      node.t_transform / 1000,
      (value) =>
        this.gameState.updateNodeProperty(node.id, "t_transform", value * 1000)
    );
  }

  /* ------------------------------------------------------------------ */
  /*                       Fábricas / Actualizadores                     */
  /* ------------------------------------------------------------------ */
  createOrUpdateSelect(
    panelEl,
    key,
    labelText,
    options,
    currentValue,
    onChange
  ) {
    const controlId = `node-${panelEl.dataset.nodeId}-${key}`;
    let label = panelEl.querySelector(`label[for="${controlId}"]`);
    let select;

    if (!label) {
      label = document.createElement("label");
      label.htmlFor = controlId;
      label.textContent = labelText;
      select = document.createElement("select");
      select.id = controlId;
      options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      select.addEventListener("change", () => onChange(select.value));
      panelEl.appendChild(label).appendChild(select);
    } else {
      select = label.querySelector("select");
    }
    if (select.value !== currentValue) select.value = currentValue;
  }

  createOrUpdateNumberInput(panelEl, key, labelText, currentValue, onChange) {
    const controlId = `node-${panelEl.dataset.nodeId}-${key}`;
    let label = panelEl.querySelector(`label[for="${controlId}"]`);
    let input;

    if (!label) {
      label = document.createElement("label");
      label.htmlFor = controlId;
      label.textContent = labelText;
      input = document.createElement("input");
      input.id = controlId;
      input.type = "number";
      input.step = "0.1";
      input.addEventListener(
        "input",
        debounce(() => onChange(parseFloat(input.value)), 400)
      );
      panelEl.appendChild(label).appendChild(input);
    } else {
      input = label.querySelector("input");
    }
    if (!input.matches(":focus") && parseFloat(input.value) !== currentValue) {
      input.value = currentValue;
    }
  }

  createOrUpdateInfoLine(panelEl, key, text) {
    const lineId = `node-info-${panelEl.dataset.nodeId}-${key}`;
    let p = panelEl.querySelector(`p[data-key="${key}"]`);
    if (!p) {
      p = document.createElement("p");
      p.dataset.key = key;
      // Lo insertamos después del título si existe, o al principio
      const title = panelEl.querySelector("h4");
      title.insertAdjacentElement("afterend", p);
    }
    if (p.innerHTML !== `<strong>${text}</strong>`) {
      p.innerHTML = `<strong>${text}</strong>`;
    }
  }

  createOrUpdateButton(panelEl, key, text, onClick) {
    const btnId = `node-btn-${panelEl.dataset.nodeId}-${key}`;
    let btn = panelEl.querySelector(`#${btnId}`);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = btnId;
      btn.style.width = "100%";
      btn.style.marginTop = "10px";
      btn.addEventListener("click", onClick);
      panelEl.appendChild(btn);
    }
    btn.textContent = text;
  }
}
