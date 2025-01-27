/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
//Game variables
let mundo = {
  tema: {
    tema_mapa: "dark_all",
    color_vehiculos: "#FCD144",
    color_caminos: "#FFFFFF",
  },
  mapa: { centro: [4.626907913301086, -74.1755128361618], zoom: 17 },
  vehiculos: [],
  factorVentaFuente: 0.7,
};
let gameSpeed = 1;
let gamePaused = false;
let now = Date.now();
let money = 1000;
let puntaje = 0;
let gameStarted = false;
let gameEnded = false;
let team_id = 1;
let team_color = "#3fb0c4";

//Map variables
let map; // Instancia Leaflet
let nodes = [];
let flotaGlobal = [];
let paths = [];
//let particles = []; // en proceso de actualizar vehiculos en vez de partículas
let clientes = [];

// Capas Canvas
let vehiculosLayer; // capa para vehiculos
let nodeLayer; // capa para nodos
let clienteLayer; // capa para clientes

// Botones
let createCaminoButton;
let distribuirButton;
let limpiarCaminoSeleccionadoButton;
let limpiarTodoButton;
let empezarProduccionButton;
let detenerProduccionButton;
let descargarAlmacenesButton;
let exportButton;
let importButton;
let mostrarCaminosButton;
let importFileInput;

//controles de visibilidad
let mostrarCaminosFlag = true;

// Configuraciones de conexiones permitidas
const allowedConnections = {
  fuente: ["almacen", "transformador", "sumidero", "tienda"],
  almacen: ["fuente", "almacen", "transformador", "sumidero"],
  transformador: ["almacen", "transformador", "sumidero"],
  sumidero: [],
  tienda: ["fuente", "almacen", "transformador", "sumidero"],
  generic: ["fuente", "almacen", "transformador", "sumidero"],
};

// Producción
let productionActive = false;
let productionInterval = 1500; // ms entre producciones

// Detalles de cada tipo de recurso
let tiposRecurso = {};

//dev variables
let debug = false;

/****************************************************
 * INICIALIZACIÓN
 ****************************************************/
window.addEventListener("load", () => {
  //variables globales, agrega recursos: A, B, C, D, E
  tiposRecurso = {
    A: new Recurso("A", 5, 1, "#aa0000"),
    B: new Recurso("B", 15, 1.5, "#00aa00"),
    C: new Recurso("C", 25, 2, "#0000aa"),
    D: new Recurso("D", 50, 3, "#aaaa00"),
    E: new Recurso("E", 100, 4, "#00aaaa"),
  };
  // Inicializar el mapa
  map = L.map("map").setView(mundo.mapa.centro, mundo.mapa.zoom);
  estilo =
    "https://{s}.basemaps.cartocdn.com/rastertiles/" +
    mundo.tema.tema_mapa +
    "/{z}/{x}/{y}{r}.png";
  L.tileLayer(estilo, {
    maxZoom: 20,
    attribution: "© CartoDB, © OpenStreetMap",
  }).addTo(map);

  // Crear la capa de vehiculos y añadirla al mapa
  vehiculosLayer = new VehiculoLayer();
  map.addLayer(vehiculosLayer);

  // Crear la capa de nodos y añadirla al mapa
  nodeLayer = new CapaNodos();
  map.addLayer(nodeLayer);

  // Crear la capa de clientes y añadirla al mapa
  clienteLayer = new ClienteLayer();
  map.addLayer(clienteLayer);
  // crea mundo.vehiculos y añade una moto al jugador
  /*let motoInicial = new Vehiculo(
    "moto",
    map.getCenter().lat,
    map.getCenter().lng
  );
  mundo.vehiculos.push(motoInicial);*/

  // Botones
  createCaminoButton = document.getElementById("createCaminoButton");
  distribuirButton = document.getElementById("distribuirButton");
  limpiarCaminoSeleccionadoButton = document.getElementById(
    "limpiarCaminoSeleccionadoButton"
  );
  limpiarTodoButton = document.getElementById("limpiarTodoButton");
  empezarProduccionButton = document.getElementById("empezarProduccionButton");
  detenerProduccionButton = document.getElementById("detenerProduccionButton");
  descargarAlmacenesButton = document.getElementById(
    "descargarAlmacenesButton"
  );
  exportButton = document.getElementById("exportButton");
  importButton = document.getElementById("importButton");
  importFileInput = document.getElementById("importFileInput");
  mostrarCaminosButton = document.getElementById("mostrarCaminosButton");

  // Asignar eventos a los botones
  createCaminoButton.addEventListener("click", crearCaminosNodosSeleccionados);
  distribuirButton.addEventListener("click", iniciarDistribucion);
  limpiarCaminoSeleccionadoButton.addEventListener(
    "click",
    limpiarCaminoSeleccionado
  );
  limpiarTodoButton.addEventListener("click", limpiarTodo);
  empezarProduccionButton.addEventListener("click", () => {
    productionActive = !productionActive;
    //modifica el texto del botón
    empezarProduccionButton.innerText = productionActive
      ? "Detener Producción"
      : "Empezar Producción";
  });
  detenerProduccionButton.addEventListener(
    "click",
    () => (productionActive = false)
  );
  descargarAlmacenesButton.addEventListener("click", descargarAlmacenes);

  // Exportar/Importar
  exportButton.addEventListener("click", exportState);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", handleImportFile);

  // Mostrar Caminos
  mostrarCaminosButton.addEventListener("click", mostrarCaminos);

  // Clic derecho en el mapa => crear nodo
  map.on("contextmenu", (e) => {
    crearNodo(e.latlng.lat, e.latlng.lng);
  });
  //ctrl + click en el mapa => mover moto inicial a la posición del click
  map.on("click", (e) => {
    if (e.originalEvent.ctrlKey) {
      // Si presionamos Ctrl mientras hacemos clic en el mapa,
      // movemos la moto inicial (o cualquier vehículo que queramos).
      // Podrías buscar la primera moto de mundo.vehiculos, o un vehículo concreto.
      if (mundo.vehiculos.length > 0) {
        let veh = mundo.vehiculos[0]; // Por simplicidad, la primera moto
        veh.definirRuta(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  // Iniciar el loop de dibujo
  requestAnimationFrame(drawLoop);

  // Contenedor de paneles
  let panelsDiv = document.createElement("div");
  panelsDiv.id = "control-panels-container";
  document.body.appendChild(panelsDiv);
});

/****************************************************
 * FUNCIÓN PRINCIPAL DE DIBUJO (LOOP)
 ****************************************************/
function drawLoop() {
  now = Date.now();
  //Actualizar estadisticas globales
  actualizaEstadisticas();
  // Actualizar nodos
  nodes.forEach((n) => n.updateNode());
  // Actualizar clientes
  clientes.forEach((c) => c.updateCliente());
  // Actualizar posiciones de partículas basadas en el tiempo transcurrido

  /*
  // en proceso de actualizar vehiculos en vez de partículas
  particles.forEach((pt) => {
    let elapsed = currentTime - pt.tInicio;

    pt.actualizaPosicion(elapsed);
  });*/
  // ***** Actualizar vehículos GLOBALES

  mundo.vehiculos.forEach((veh) => {
    veh.actualizarPosicion(now);
    // Si llegó a destino y tenemos lógica adicional, se manejaría aquí
  });

  // ***** Recolectar también vehículos de cada nodo y actualizarlos
  // (Opcional: solo si un nodo puede mover sus vehículos en el mapa)
  nodes.forEach((node) => {
    node.flota.forEach((veh) => {
      veh.actualizarPosicion(now);
      // Manejar llegada de ruta, descarga, retorno, etc.
      if (veh.finishedRoute && !veh.enRetorno && veh.destinoNode) {
        // Ejemplo de descarga
        let cargamento = veh.descargarTodo();
        for (let tipo in cargamento) {
          veh.destinoNode.inventory[tipo] =
            (veh.destinoNode.inventory[tipo] || 0) + cargamento[tipo];
        }
        // Preparar retorno:
        veh.definirRuta(veh.origenNode.lat, veh.origenNode.lng);
        veh.enRetorno = true;
      } else if (veh.finishedRoute && veh.enRetorno) {
        // El vehículo ya regresó, lo estacionamos
        // Ejemplo:
        veh.lat = node.lat;
        veh.lng = node.lng;
        // Reseteamos flags
        veh.enMovimiento = false;
        veh.enRetorno = false;
      }
    });
  });

  // Dibujar todos los vehículos en la capa vehicleLayer
  vehiculosLayer.draw();

  // Procesar clientes ya atendidos
  clientes = clientes.filter((c) => !c.atendido);

  // Solicitar el siguiente frame
  requestAnimationFrame(drawLoop);
}

function actualizaEstadisticas() {
  document.getElementById("estadisticaDinero").innerText = `Dinero: $${money}`;
}
/****************************************************
 * CREAR / LIMPIAR
 ****************************************************/

function limpiarTodo() {
  // ***** particles = []; (Se elimina)
  // paths.forEach((p) => p.removeFromMap());
  paths.forEach((p) => p.view.removeFromMap());
  paths = [];
  nodes = [];

  // ***** Limpiar flota global
  flotaGlobal = [];

  nodeLayer.addNodes(nodes); // Actualizar la capa de nodos
  actualizaPanelControl();
}

function mostrarCaminos() {
  mostrarCaminosFlag = !mostrarCaminosFlag;
}
