class CapaNodos extends L.Layer {
  constructor() {
    super();
    this.nodos = []; // Lista de nodos a dibujar
    this.nodosSeleccionados = new Set(); // Nodos seleccionados
 
    this.arrastreNodo = null; // Nodo actualmente arrastrado
    this.dragOffset = { x: 0, y: 0 };
    this.dragOffsetTotal = { x: 0, y: 0 };
    this.activadoresRutas = [];
    // Bind event handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  onAdd(map) {
    this.map = map;

    // Crear el elemento Canvas
    this.canvas = L.DomUtil.create("canvas", "node-layer");
    this.canvas.width = map.getSize().x;
    this.canvas.height = map.getSize().y;
    this.ctx = this.canvas.getContext("2d");

    // Añadir el Canvas al pane de overlay
    let pane = map.getPanes().overlayPane;
    pane.appendChild(this.canvas);

    // Escuchar eventos de movimiento y redimensionamiento para ajustar el Canvas
    map.on("move", this._reset, this);
    map.on("resize", this._resize, this);

    // Escuchar eventos de interacción
    L.DomEvent.on(this.canvas, "mousedown", this._onMouseDown);
    L.DomEvent.on(this.canvas, "mousemove", this._onMouseMove);
    L.DomEvent.on(this.canvas, "mouseup", this._onMouseUp);
    L.DomEvent.on(this.canvas, "click", this._onClick);

    this.draw(); // Dibujar inicialmente
  }

  onRemove(map) {
    // Remover el Canvas del pane
    let pane = map.getPanes().overlayPane;
    pane.removeChild(this.canvas);

    // Remover listeners
    map.off("move", this._reset, this);
    map.off("resize", this._resize, this);

    L.DomEvent.off(this.canvas, "mousedown", this._onMouseDown);
    L.DomEvent.off(this.canvas, "mousemove", this._onMouseMove);
    L.DomEvent.off(this.canvas, "mouseup", this._onMouseUp);
    L.DomEvent.off(this.canvas, "click", this._onClick);
  }

  // Ajustar la posición del Canvas según el movimiento del mapa
  _reset() {
    let topLeft = this.map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
    this.draw();
  }

  // Ajustar el tamaño del Canvas según el redimensionamiento del mapa
  _resize(e) {
    this.canvas.width = e.newSize.x;
    this.canvas.height = e.newSize.y;
    this.draw();
  }

  // Añadir nodos a la capa
  addNodes(nodes) {
    this.nodos = nodes;
    this.draw();
  }

  // Dibujar todos los nodos en el Canvas
  draw() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.activadoresRutas = [];

    this.nodos.forEach((node) => {
      this._dibujaNodo(node);
    });
  }

  // Método para dibujar un único nodo
  _dibujaNodo(nodo) {
    let latlng = [nodo.lat, nodo.lng];
    let point = this.map.latLngToContainerPoint(latlng);
    let scaleFactor = 1 + (this.map.getZoom() - 15) * 0.15;
    let finalRadius = nodo.size * scaleFactor;
    //Escala 
  
    // Dibujar el nodo
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, finalRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = getNodeColor(nodo);
    this.ctx.fill();
    this.ctx.closePath();

    // Si el nodo está seleccionado, dibujar un borde destacado
    if (nodo.selected) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, finalRadius + 3, 0, Math.PI * 2);
      this.ctx.strokeStyle = "#FFD700"; // Dorado
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.closePath();

      // ***** MODIFICACIÓN: Cuando el nodo está seleccionado, dibujar
      // sus "activators" para cada ruta
       
      this._dibujaActivadores(nodo, scaleFactor);
    }

    // Dibujar el texto del inventario
    this.ctx.font = `${Math.round(12 * scaleFactor)}px Arial`;
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      Object.keys(nodo.inventory)
        .map((k) => `${k}: ${nodo.inventory[k]}`)
        .join(", "),
      point.x,
      point.y - finalRadius - 5
    );
    //Dibujar el texto del item que genera solo si es una fuente, debajo del nodo
    if (nodo.type === "fuente") {
      this.ctx.fillText(nodo.item_gen, point.x, point.y + finalRadius + 15);
    }

    // Optional: Visual feedback if node is being dragged
    if (nodo === this.arrastreNodo) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, finalRadius + 5, 0, Math.PI * 2);
      this.ctx.strokeStyle = "#00FFFF";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.closePath();
    }
  }

  /**
   * Dibuja activadores de rutas en el canvas, para cuando un nodo está
   * seleccionado. Los activadores son pequeños círculos que indican si
   * esa ruta esta activa o no.
   * @param {Node} node - El nodo que se dibujará con activadores
   * @param {number} scaleFactor - Un factor de escala para el tamaño de
   * los activadores
   */
  _dibujaActivadores(node, scaleFactor) {
    let canvasWidth = this.canvas.width;
    let canvasHeight = this.canvas.height;

    // Ajustamos un radio base para los activators
    let activatorBaseRadius = 7;
    let activatorRadius = activatorBaseRadius * scaleFactor;
    if (activatorRadius < 5) activatorRadius = 5;

    // Recorremos todos los paths del nodo
    node.paths.forEach((p) => {
      // Determinar si este nodo es "A" o "B" en ese path
      let other = null;
      let isNodeA = false;
      if (p.nodeA === node) {
        isNodeA = true;
        other = p.nodeB;
      } else {
        other = p.nodeA;
      }

      // Tomar la polyline del path y obtener la "tercera parte" de los puntos
      // En este ejemplo: tomaremos latlng intermedio = polyline latlngs [ 1/3 ]
      let latlngs = p.polyline.getLatLngs();
      if (!latlngs || latlngs.length === 0) return;

      let midIndex = Math.floor(isNodeA ? 8*latlngs.length / 9 : 1*latlngs.length / 9);
      let midLatLng = latlngs[midIndex]; 

      // Convertir a punto en pantalla
      let midPoint = this.map.latLngToContainerPoint(midLatLng);

      // Si está fuera de la pantalla, clamp al borde + 30 px
      let clampedX = Math.max(30, Math.min(midPoint.x, canvasWidth - 30));
      let clampedY = Math.max(30, Math.min(midPoint.y, canvasHeight - 30));
      // Color: si isNodeA => p.activeAtoB, si no => p.activeBtoA
      let isActive = isNodeA ? p.activeAtoB : p.activeBtoA;
      let color = isActive ? "limegreen" : "red";

      // Dibujar el círculo
      this.ctx.beginPath();
      this.ctx.arc(clampedX, clampedY, activatorRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.closePath();

      // Guardar info en pathActivators
      this.activadoresRutas.push(new ActivadorDeCamino(node, p,
        isNodeA,
        clampedX, clampedY,
        activatorRadius));
    });
  }

  // Obtener el color del nodo basado en su tipo
  

  // Manejo de eventos de clic
  _onClick(e) {
    let rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // ***** MODIFICACIÓN:
    // Primero, detectamos si se ha hecho click sobre un pathActivator
    for (let activ of this.activadoresRutas) {
       
      
      if (activ.dentro(x, y)) {
        
        // Toggle la dirección de la ruta, sin deseleccionar
        activ.activarRuta();
        // Forzamos un redibujado
        this.draw();
        actualizaPanelControl();
        return; // Importante: return para que no se deseleccionen los nodos
      }
    }

    // Si no se hizo clic en ningún pathActivator, entonces
    // chequeamos clic en un nodo
    let nodeClicked = false;
    for (let node of this.nodos) {
      // Usar el radio escalado
      let currentZoom = this.map.getZoom();
      let scaleFactor = 1 + (currentZoom - 15) * 0.15;
      if (scaleFactor < 0.2) scaleFactor = 0.2;
      if (scaleFactor > 5) scaleFactor = 5;
      let finalRadius = node.size * scaleFactor;

      let point = this.map.latLngToContainerPoint([node.lat, node.lng]);
      let distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= finalRadius) {
        nodeClicked = true;

        if (!e.shiftKey) {
          this.nodos.forEach((n) => (n.selected = false));
        }
        node.selected = !node.selected;

        this.draw();
        actualizaPanelControl();
        return;
      }
    }

    if (!nodeClicked) {
      // Deselect all nodes when clicking outside any node
      this.nodos.forEach((n) => (n.selected = false));
      this.draw();
      actualizaPanelControl();
    }
  }

  // Manejo de eventos de arrastre
  _onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let nodeClicked = false;

    // Detect if a node was clicked to start dragging
    for (let node of this.nodos) {
      const point = this.map.latLngToContainerPoint([node.lat, node.lng]);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= node.size) {
        // Disable map dragging to allow node dragging
        this.map.dragging.disable();

        this.arrastreNodo = node;
        this.dragOffset = {
          x: point.x - x,
          y: point.y - y,
        };

        nodeClicked = true;
        break; // Exit the loop since we've found the clicked node
      }
    }

    if (!nodeClicked) {
      // Enable map dragging since no node was clicked
      this.map.dragging.enable();

      // Optionally, deselect all nodes when clicking outside
      
      this.draw();
      actualizaPanelControl();
    }
  }

  _onMouseMove(e) {
    if (this.arrastreNodo) {
      let rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Calculate the new position
      let containerPoint = L.point(
        x + this.dragOffset.x,
        y + this.dragOffset.y
      );
      let latlng = this.map.containerPointToLatLng(containerPoint);

      // Update node's position
      this.arrastreNodo.lat = latlng.lat;
      this.arrastreNodo.lng = latlng.lng;

      //update total drag offset
      this.dragOffsetTotal.x += x - this.dragOffset.x;
      this.dragOffsetTotal.y += y - this.dragOffset.y;

      // Redraw the canvas
      this.draw();
      if (particleLayer && typeof particleLayer.draw === "function") {
        particleLayer.draw();
      }
      actualizaPanelControl();
    }
  }

  _onMouseUp(e) {
    if (this.arrastreNodo) {
      if (this.dragOffsetTotal.x > 15000 || this.dragOffsetTotal.y > 15000) {
    
        // Crear una función debounced compartida
        let paths = this.arrastreNodo.paths;
        const debouncedUpdate = debounce(() => {
          paths.forEach((p) => {
            p.updatePolyline();

          });
        }, 300);

        // Llamar a la función debounced
        debouncedUpdate();
      }
      this.arrastreNodo = null;
      this.dragOffset = { x: 0, y: 0 };
      this.dragOffsetTotal = { x: 0, y: 0 };

      // Rehabilitar el arrastre del mapa después de mover el nodo
      this.map.dragging.enable();
    }
  }
}
