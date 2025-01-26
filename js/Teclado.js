// Teclas para cambiar tipo de nodos
window.addEventListener("keydown", (e) => {

  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return; // Ignora los atajos de teclado
  }

  let sel = nodes.filter((n) => n.selected);
  //if (sel.length === 0) return;
  switch (e.key.toLowerCase()) {
    case "c":
      crearCaminos();
      break;
    case "d":
      iniciarDistribucion();
      break;
    case "l":
      limpiarCaminoSeleccionado();
      break;

    case "e":
      empezarProduccionButton.click();
      break;
    case "p":
      detenerProduccionButton.click();
      break;
    case "r":
      descargarAlmacenesButton.click();
      break;

    case "f":
      sel.forEach((n) => n.changeType("fuente"));
      break;
    case "s":
      sel.forEach((n) => n.changeType("sumidero"));
      break;
    case "a":
      sel.forEach((n) => n.changeType("almacen"));
      break;
    case "t":
      sel.forEach((n) => n.changeType("transformador"));
      break;
    case "x":
      sel.forEach((n) => removerNodo(n));
      break;
    case "y":
      sel.forEach((n) => n.changeType("tienda"));
      break;
    default:
      break;
  }
  actualizaPanelControl();
});
