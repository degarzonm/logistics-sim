

function actualizaPanelControl() {
  if (!window.nodePanels) {
    window.nodePanels = {};
  }

  nodes.forEach((nd) => {
    let nodeId = nd._id;
    let panelEl = window.nodePanels[nodeId];
    let isSelectedVisible = nd.selected && estaEnPantalla(nd);

    if (isSelectedVisible) {
      // Crear panel si no existe
      if (!panelEl) {
        panelEl = document.createElement("div");
        panelEl.classList.add("node-control-panel");
        document.body.appendChild(panelEl);
        window.nodePanels[nodeId] = panelEl;

        // Construye el contenido la primera vez
        buildPanelContent(panelEl, nd);
        
        // Guardamos el tipo inicial para saber si debemos reconstruir
        nd._lastType = nd.type;
      }
      else {
        // Si el nodo cambió de tipo, reconstruye su contenido
        if (nd.type !== nd._lastType) {
          // Vacía y vuelve a crear
          nd._lastType = nd.type;
        }
        panelEl.innerHTML = "";
        buildPanelContent(panelEl, nd);
        // Caso contrario, mantenemos el contenido (no perdemos foco).
      }

      // Reposicionar y mostrar
      let point = map.latLngToContainerPoint([nd.lat, nd.lng]);
      panelEl.style.left = (point.x + 10) + "px";
      panelEl.style.top  = (point.y + 10) + "px";
      panelEl.classList.remove("hidden");
    } 
    else {
      // Si no está seleccionado o no está en pantalla => ocultamos
      if (panelEl) {
        panelEl.classList.add("hidden");
      }
    }
  });
}

// buildPanelContent: función para construir el contenido del panel de control
function buildPanelContent(panelEl, node) {
  // Título
  const title = document.createElement("h4");
  title.textContent = node.type;
  panelEl.appendChild(title);

  // Crea el div con los controles específicos
  let controlsDiv = creaControlesNodo(node);
  panelEl.appendChild(controlsDiv);
}

// Función simple para verificar si el nodo está en la vista actual:
function estaEnPantalla(nodo) {
  return map.getBounds().contains([nodo.lat, nodo.lng]);
}

function creaControlesNodo(node) {
  const container = document.createElement("div");
  // Botón para expulsar flota (si existe flota)
  if (node.flota && node.flota.length > 0) {
    let btnExpulsar = document.createElement("button");
    btnExpulsar.innerText = "Expulsar Flota";
    btnExpulsar.onclick = () => {
      node.expulsarFlota();
      actualizaPanelControl();
    };
    container.appendChild(btnExpulsar);
  }

  // Selección y envío de vehículo (solo si hay flota)
  if (node.flota && node.flota.length > 0) {
    // 1) Selecciona uno de la flota
    let labelVeh = document.createElement("label");
    labelVeh.textContent = "Vehículo:";
    let selectVeh = document.createElement("select");
    node.flota.forEach((v, i) => {
      let opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${v.tipo} ${v._id}`;
      selectVeh.appendChild(opt);
    });
    labelVeh.appendChild(selectVeh);
    container.appendChild(labelVeh);

    // 2) Input para la carga {A: X, B: Y...} (simplificado)
    // Podrías hacer varios inputs, aquí se hará uno genérico tipo "A=2,B=5" 
    let labelCarga = document.createElement("label");
    labelCarga.textContent = "Carga (A=2,B=1):";
    let inputCarga = document.createElement("input");
    inputCarga.type = "text";
    labelCarga.appendChild(inputCarga);
    container.appendChild(labelCarga);

    // 3) Seleccionar nodo destino
    let labelDestino = document.createElement("label");
    labelDestino.textContent = "Destino:";
    let selectDestino = document.createElement("select");
    node.rutas.forEach((r, idx) => {
      
        let opt = document.createElement("option");
        opt.value = r.nodo._id;
        opt.textContent = `${r.nodo.type} #${r.nodo._id}`;
        selectDestino.appendChild(opt);
      
    });
    labelDestino.appendChild(selectDestino);
    container.appendChild(labelDestino);

    // 4) Botón "Despachar"
    let btnDesp = document.createElement("button");
    btnDesp.innerText = "Despachar Vehículo";
    btnDesp.onclick = () => {
      let vehIndex = parseInt(selectVeh.value);
      let veh = node.flota[vehIndex];
      if (!veh) return;

      // Parsear la carga
      let raw = inputCarga.value.trim(); 
      // Ej: "A=2,B=1"
      let cargaObj = {};
      if (raw) {
        let parts = raw.split(",");
        parts.forEach((p) => {
          let [k, v] = p.split("=");
          if (k && v) {
            cargaObj[k.trim()] = parseInt(v.trim());
          }
        });
      }
      // Buscar el nodo destino
      let destId = parseInt(selectDestino.value);
      let destinoNode = nodes.find((nd) => nd._id === destId);
      if (!destinoNode) return;

      node.despacharVehiculo(veh, destinoNode, cargaObj)
        .then((msg) => {
          console.log(msg);
          // se inicia la logística, el vehicle se moverá 
          actualizaPanelControl();
        })
        .catch((err) => {
          console.warn("Error al despachar:", err);
        });
    };
    container.appendChild(btnDesp);
  }
  // Aquí añadiremos según el tipo de nodo
  switch (node.type) {
    case "fuente":
      container.appendChild(creaFuenteControl(node));
      break;

    case "transformador":
      container.appendChild(creaTransformadorControl(node));
      break;

    case "almacen":
      // Si deseas algo para el almacén, agrégalo aquí
      // container.appendChild(createAlmacenControls(node));
      break;

    // case "tienda":
    //   // Si en un futuro lo desarrollas, lo pones aquí
    //   break;
    case "tienda":

    break;

    case "sumidero":
      // Si deseas algo para el sumidero, agrégalo aquí
      break;
    
    default:
      // "generic" u otros
      // container.appendChild(createGenericControls(node));
      break;
  }

  return container;
}

function creaFuenteControl(node) {
  const div = document.createElement("div");

  // 1. Menú desplegable para item_gen
  const labelItemGen = document.createElement("label");
  labelItemGen.textContent = "Genera:";
  const selectItemGen = document.createElement("select");
  selectItemGen.style.marginRight = "10px";

  // Poblar el menú con los tipos de recurso
  Object.keys(tiposRecurso).forEach((tipo) => {
    const option = document.createElement("option");
    option.value = tipo;
    option.textContent = tipo;
    if (node.item_gen === tipo) {
      option.selected = true;
    }
    selectItemGen.appendChild(option);
  });

  // Actualizar el nodo al cambiar el valor
  selectItemGen.addEventListener("change", () => {
    node.item_gen = selectItemGen.value;
    node.precio_venta = Math.floor(tiposRecurso[selectItemGen.value].precio * 0.7);
  });

  labelItemGen.appendChild(selectItemGen);
  div.appendChild(labelItemGen);

  // 2. Input para productionInterval
  const labelInterval = document.createElement("label");
  labelInterval.textContent = "Frecuencia (s): ";
  labelInterval.style.display = "block"; // Para que se muestre debajo
  const inputInterval = document.createElement("input");
  inputInterval.type = "number";
  inputInterval.value = node.productionInterval / 1000;
  inputInterval.min = "0.0001";

  // Actualizar el nodo al cambiar el valor
  inputInterval.addEventListener("change", () => {
    node.productionInterval = parseInt(inputInterval.value * 1000);
  });

  labelInterval.appendChild(inputInterval);
  div.appendChild(labelInterval);

  return div;
}

function creaTransformadorControl(node) {
  const div = document.createElement("div");

  const title = document.createElement("h5");
  title.textContent = "Controles de transformador";
  div.appendChild(title);

  // 1. Menú desplegable para entry_item
  const labelEntry = document.createElement("label");
  labelEntry.textContent = "Receta: ";
  const selectEntry = document.createElement("select");
  selectEntry.style.marginRight = "10px";

  // Poblar el menú con los tipos de recurso
  Object.keys(tiposRecurso).forEach((tipo) => {
    const option = document.createElement("option");
    option.value = tipo;
    option.textContent = tipo;
    if (node.entry_item === tipo) {
      option.selected = true;
    }
    selectEntry.appendChild(option);
  });

  // Actualizar el nodo al cambiar el valor
  selectEntry.addEventListener("change", () => {
    node.entry_item = selectEntry.value;
  });

  labelEntry.appendChild(selectEntry);
  div.appendChild(labelEntry);

  // 2. Menú desplegable para transformed_item
  const labelOutput = document.createElement("label");
  labelOutput.textContent = "Genera: ";
  labelOutput.style.display = "block";
  const selectOutput = document.createElement("select");

  // Poblar el menú con los tipos de recurso
  Object.keys(tiposRecurso).forEach((tipo) => {
    const option = document.createElement("option");
    option.value = tipo;
    option.textContent = tipo;
    if (node.transformed_item === tipo) {
      option.selected = true;
    }
    selectOutput.appendChild(option);
  });

  // Actualizar el nodo al cambiar el valor
  selectOutput.addEventListener("change", () => {
    node.transformed_item = selectOutput.value;
  });

  labelOutput.appendChild(selectOutput);
  div.appendChild(labelOutput);

  // 3. Input para tiempo de transformación
  const labelTime = document.createElement("label");
  labelTime.textContent = "Tiempo de transformación (s): ";
  labelTime.style.display = "block";
  const inputTime = document.createElement("input");
  inputTime.type = "number";
  inputTime.value = node.t_transform / 1000;
  inputTime.min = "1";

  inputTime.addEventListener("change", () => {
    node.t_transform = parseInt(inputTime.value * 1000);
  });

  labelTime.appendChild(inputTime);
  div.appendChild(labelTime);

  return div;
}
