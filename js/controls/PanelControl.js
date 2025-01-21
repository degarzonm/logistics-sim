function actualizaPanelControl() {
  let ctn = document.getElementById("control-panels-container");
  if (!ctn) return;

  // Verificar si algún input dentro del contenedor está enfocado
  let enFoco = ctn.querySelector(
    "input:focus, select:focus, textarea:focus"
  );
  if (enFoco) {
    // Si hay un input enfocado, no actualizar el panel para evitar perder el foco
    return;
  }

  // Limpiar el contenido actual del panel
  ctn.innerHTML = "";

  // Obtener los nodos seleccionados
  let sel = nodes.filter((n) => n.selected);
  sel.forEach((nd) => {
    let div = document.createElement("div");
    div.classList.add("control-panel");

    // Información básica del nodo
    div.innerHTML = `
        <h4>${nd.type}</h4>
        <p>Inventario: ${JSON.stringify(nd.inventory)}</p>
        <p>Lat: ${nd.lat.toFixed(3)}, Lng: ${nd.lng.toFixed(3)}</p>
      `;

    // Añadir los controles dinámicos según el tipo de nodo
    const controlsDiv = creaControlesNodo(nd);
    div.appendChild(controlsDiv);

    // Agregar el panel completo al contenedor principal
    ctn.appendChild(div);
  });
}

function creaControlesNodo(node) {
  const container = document.createElement("div");

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

  

  // 1. Input para item_gen
  const labelItemGen = document.createElement("label");
  labelItemGen.textContent = "Genera:";
  const inputItemGen = document.createElement("input");
  inputItemGen.type = "text";
  inputItemGen.value = node.item_gen;
  inputItemGen.style.marginRight = "10px";

  // Actualizar el nodo al cambiar el valor
  inputItemGen.addEventListener("change", () => {
    node.item_gen = inputItemGen.value;
    node.precio_venta = Math.floor(tiposRecurso[inputItemGen.value].precio*0.7);
    // Opcional: Actualizar el panel si es necesario
    // updateControlPanels();
  });

  labelItemGen.appendChild(inputItemGen);
  div.appendChild(labelItemGen);

  // 2. Input para productionInterval
  const labelInterval = document.createElement("label");
  labelInterval.textContent = "Frecuencia (s): ";
  labelInterval.style.display = "block"; // Para que se muestre debajo
  const inputInterval = document.createElement("input");
  inputInterval.type = "number";
  inputInterval.value = node.productionInterval/1000;
  inputInterval.min = "0.0001";

  // Actualizar el nodo al cambiar el valor
  inputInterval.addEventListener("change", () => {
    node.productionInterval = parseInt(inputInterval.value*1000);
    // Opcional: Actualizar el panel si es necesario
    // updateControlPanels();
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

  // 1. Entrada
  const labelEntry = document.createElement("label");
  labelEntry.textContent = "Receta: ";
  const inputEntry = document.createElement("input");
  inputEntry.type = "text";
  inputEntry.value = node.entry_item;
  inputEntry.style.marginRight = "10px";

  inputEntry.addEventListener("change", () => {
    node.entry_item = inputEntry.value;
  });

  labelEntry.appendChild(inputEntry);
  div.appendChild(labelEntry);

  // 2. Salida
  const labelOutput = document.createElement("label");
  labelOutput.textContent = "Genera: ";
  labelOutput.style.display = "block";
  const inputOutput = document.createElement("input");
  inputOutput.type = "text";
  inputOutput.value = node.transformed_item;

  inputOutput.addEventListener("change", () => {
    node.transformed_item = inputOutput.value;
  });

  labelOutput.appendChild(inputOutput);
  div.appendChild(labelOutput);

  // 3. Tiempo de transformación
  const labelTime = document.createElement("label");
  labelTime.textContent = "Tiempo de transformación (s): ";
  labelTime.style.display = "block";
  const inputTime = document.createElement("input");
  inputTime.type = "number";
  inputTime.value = node.t_transform/1000;
  inputTime.min = "1";

  inputTime.addEventListener("change", () => {
    node.t_transform = parseInt(inputTime.value*1000);
  });

  labelTime.appendChild(inputTime);
  div.appendChild(labelTime);

  return div;
}
