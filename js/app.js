/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
//Game variables
let gameSpeed = 1;
let gamePaused = false;
let money = 1000;
let score = 0;
let gameStarted = false;
let gameEnded = false;
let team_id = 1;
let team_color = "#3fb0c4";

//Map variables
let map; // Instancia Leaflet
let nodes = [];
let paths = [];
let particles = [];
let clientes = [];

// Capas Canvas
let particleLayer; // capa para vehiculos
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
let importFileInput;

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
  map = L.map("map").setView([4.626907913301086, -74.1755128361618], 17);
  L.tileLayer(
    //estilo de mapa voyager sin etiquetas
    //"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    //estilo de mapa oscuro
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      attribution: "© CartoDB, © OpenStreetMap",
    }
  ).addTo(map);

  // Crear la capa de partículas y añadirla al mapa
  particleLayer = new ParticleLayer();
  map.addLayer(particleLayer);

  // Crear la capa de nodos yañadirla al mapa
  nodeLayer = new CapaNodos();
  map.addLayer(nodeLayer);

  // Crear la capa de clientes y añadirla al mapa
  clienteLayer = new ClienteLayer();
  map.addLayer(clienteLayer);

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

  // Asignar eventos a los botones
  createCaminoButton.addEventListener("click", crearCaminos);
  distribuirButton.addEventListener("click", iniciarDistribucion);
  limpiarCaminoSeleccionadoButton.addEventListener(
    "click",
    limpiarCaminoSeleccionado
  );
  limpiarTodoButton.addEventListener("click", limpiarTodo);
  empezarProduccionButton.addEventListener(
    "click",
    () => (productionActive = true)
  );
  detenerProduccionButton.addEventListener(
    "click",
    () => (productionActive = false)
  );
  descargarAlmacenesButton.addEventListener("click", descargarAlmacenes);

  // Exportar/Importar
  exportButton.addEventListener("click", exportState);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", handleImportFile);

  // Clic derecho en el mapa => crear nodo
  map.on("contextmenu", (e) => {
    crearNodo(e.latlng.lat, e.latlng.lng);
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
  //Actualizar estadisticas globales
  actualizaEstadisticas();
  // Actualizar nodos
  nodes.forEach((n) => n.updateNode());
  // Actualizar clientes
  clientes.forEach((c) => c.updateCliente());
  // Actualizar posiciones de partículas basadas en el tiempo transcurrido
  let currentTime = Date.now();

  particles.forEach((pt) => {
    let elapsed = currentTime - pt.tInicio;

    pt.actualizaPosicion(elapsed);
  });

  // Dibujar nodos en la capa Canvas
  nodeLayer.addNodes(nodes);

  // Dibujar partículas en la capa Canvas
  particleLayer.addParticles(particles);

  // Dibujar clientes en la capa Canvas
  clienteLayer.addClientes(clientes);

  // Procesar partículas finalizadas
  let ended = particles.filter((pt) => pt.rutaCompletada());
  ended.forEach((pt) => {
    let endNode = pt.getNodoFinal();
    if (endNode) {
      endNode.addResource(pt.tipoRec);
    }
  });
  // Eliminar partículas que han terminado su recorrido
  particles = particles.filter((pt) => !pt.rutaCompletada());

  //Eliminar clientes atendidos
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
  particles = [];
  paths.forEach((p) => p.removeFromMap());
  paths = [];
  nodes = [];
  nodeLayer.addNodes(nodes); // Actualizar la capa de nodos
  actualizaPanelControl();
}
