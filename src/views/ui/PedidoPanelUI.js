export class PedidoPanelUI {
  /**
   * @param {HTMLElement} container  Contenedor donde se monta el panel.
   * @param {GameState}   gameState  Estado global de la simulación.
   * @param {Node}        nodoOperador Nodo que inicia la operación.
   * @param {Function}    onConfirm   Callback con firmas:
   *                                  (solicitanteId, proveedorId, items)
   * @param {Function}    onCancel    Callback al cerrar sin confirmar.
   */
  constructor(container, gameState, nodoOperador, onConfirm, onCancel) {
    this.container = container;
    this.gameState = gameState;
    this.nodoOperador = nodoOperador;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    this.itemsPedido = {}; // { 'A': 1, 'B': 2, ... }
    this.selectedTargetNodeId = null;
    this.mode = "PEDIR"; // 'PEDIR' (pull) o 'ENVIAR' (push)

    this.panel = null;
    this.render();
  }

  /* ------------------------------------------------------------------ */
  /*                            Render inicial                          */
  /* ------------------------------------------------------------------ */

  render() {
    this.panel = document.createElement("div");
    this.panel.className = "pedido-panel";
    this.panel.innerHTML = `
        <div class="pedido-panel-header">
          <h4>Operación para ${this.nodoOperador.type} #${this.nodoOperador.id}</h4>
          <button class="close-btn">×</button>
        </div>
  
        <div class="pedido-panel-body">
          <div class="form-group mode-selector">
            <label for="radio-pedir"><input type="radio" id="radio-pedir" name="mode" value="PEDIR" checked> Pedir</label>
            <label for="radio-enviar"><input type="radio" id="radio-enviar" name="mode" value="ENVIAR">Enviar</label>
          </div>
  
          <div class="form-group">
            <label id="target-node-label" for="target-node-select">Destino</label>
            <select id="target-node-select"></select>
          </div>
  
          <div class="form-group items-to-order">
            <label>Ítems:</label>
          </div>
  
          <div class="form-group">
            <select id="item-add-select"></select>
            <input type="number" id="item-add-qty" min="1" value="1" style="width: 50px;">
            <button class="add-item-btn">Añadir</button>
          </div>
        </div>
  
        <div class="pedido-panel-footer">
          <button class="confirm-btn">Confirmar Operación</button>
          <button class="cancel-btn">Cancelar</button>
        </div>
      `;

    this.container.appendChild(this.panel);

    this.updateModeUI();
    this.bindEvents();
  }

  /* ------------------------------------------------------------------ */
  /*                       Lógica de UI según modo                      */
  /* ------------------------------------------------------------------ */

  updateModeUI() {
    const label = this.panel.querySelector("#target-node-label");
    label.textContent =
      this.mode === "PEDIR" ? "Pedir a (Proveedor):" : "Enviar a (Destino):";

    this.populateTargetNodeSelect();
    this.populateItemSelect();

    // Reset selección y lista de items
    this.selectedTargetNodeId = null;
    this.itemsPedido = {};
    this.updateItemsList();
  }

  /* ------------------------------------------------------------------ */
  /*                    Poblado de selects dinámicos                     */
  /* ------------------------------------------------------------------ */

  populateTargetNodeSelect() {
    const select = this.panel.querySelector("#target-node-select");
    select.innerHTML = '<option value="">Seleccione una ubicacion</option>';

    // Nodos conectados al operador mediante paths
    const connectedIds = new Set();
    this.nodoOperador.pathIds.forEach((pathId) => {
      const path = this.gameState.paths.get(pathId);
      if (!path) return;
      connectedIds.add(
        path.nodeA_id === this.nodoOperador.id ? path.nodeB_id : path.nodeA_id
      );
    });

    connectedIds.forEach((id) => {
      const node = this.gameState.nodes.get(id);
      if (!node) return;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${node.type} #${node.id}`;
      select.appendChild(opt);
    });
  }

  populateItemSelect() {
    const itemSelect = this.panel.querySelector("#item-add-select");
    itemSelect.innerHTML = "";

    // Si estamos enviando, limitar a inventario del nodo operador.
    const source =
      this.mode === "ENVIAR"
        ? this.nodoOperador.inventory
        : this.gameState.tiposRecurso;

    Object.keys(source).forEach((tipo) => {
      const opt = document.createElement("option");
      opt.value = tipo;
      opt.textContent = tipo;
      itemSelect.appendChild(opt);
    });
  }

  /* ------------------------------------------------------------------ */
  /*                            Eventos                                  */
  /* ------------------------------------------------------------------ */

  bindEvents() {
    // Cerrar / cancelar ---------------------------------------------------
    this.panel
      .querySelector(".close-btn")
      .addEventListener("click", () => this.destroy());
    this.panel
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.destroy());

    // Cambio de modo ------------------------------------------------------
    this.panel.querySelectorAll('input[name="mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.mode = e.target.value;
        this.updateModeUI();
      });
    });

    // Selección nodo destino / proveedor ---------------------------------
    this.panel
      .querySelector("#target-node-select")
      .addEventListener("change", (e) => {
        this.selectedTargetNodeId = e.target.value
          ? parseInt(e.target.value, 10)
          : null;
      });

    // Añadir ítem al pedido ----------------------------------------------
    this.panel.querySelector(".add-item-btn").addEventListener("click", () => {
      const tipo = this.panel.querySelector("#item-add-select").value;
      const qty = parseInt(this.panel.querySelector("#item-add-qty").value, 10);
      if (!tipo || qty <= 0) return;

      // Si estamos enviando, verificar stock disponible
      if (
        this.mode === "ENVIAR" &&
        (this.nodoOperador.inventory[tipo] || 0) < qty
      ) {
        alert("No hay suficiente inventario para enviar esa cantidad.");
        return;
      }

      this.itemsPedido[tipo] = (this.itemsPedido[tipo] || 0) + qty;
      this.updateItemsList();
    });

    // Confirmar operación -------------------------------------------------
    this.panel.querySelector(".confirm-btn").addEventListener("click", () => {
      if (Object.keys(this.itemsPedido).length === 0 && this.mode === "PEDIR") {
        alert("Debe seleccionar añadir al menos un ítem.");
        return;
      }

      let solicitanteId, proveedorId;
      if (this.mode === "PEDIR") {
        solicitanteId = this.nodoOperador.id;
        proveedorId = this.selectedTargetNodeId;
      } else {
        proveedorId = this.nodoOperador.id;
        solicitanteId = this.selectedTargetNodeId;
      }

      this.onConfirm(solicitanteId,proveedorId, this.itemsPedido);
      
    });
  }

  /* ------------------------------------------------------------------ */
  /*                       Lista dinámica de ítems                       */
  /* ------------------------------------------------------------------ */

  updateItemsList() {
    const container = this.panel.querySelector(".items-to-order");
    container.innerHTML = "<label>Ítems:</label>";

    Object.entries(this.itemsPedido).forEach(([tipo, qty]) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<span>${tipo}: ${qty}</span> <button data-tipo="${tipo}" class="remove-item-btn">-</button>`;
      container.appendChild(row);
    });

    // Reasignar eventos de eliminación
    container.querySelectorAll(".remove-item-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        delete this.itemsPedido[e.target.dataset.tipo];
        this.updateItemsList();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*                               Limpieza                              */
  /* ------------------------------------------------------------------ */

  destroy() {
    this.onCancel?.();
    this.panel.remove();
    this.panel = null;
  }
}
