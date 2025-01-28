/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
//Game variables
let mundo = {
  tema: {
    tema_mapa: "dark_nolabels",
    color_vehiculos: "#FCD144",
    color_caminos: "#FFFFFF",
    color_texto: "#cccccc",
  },
  mapa: {
    centro: { lat: 4.626907913301086, lng: -74.1755128361618 },
    zoom: 17,
  },
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
let vehiculoSeleccionado = null;
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
    C: new Recurso("C", 25, 2, "#1212aa"),
    D: new Recurso("D", 50, 3, "#aaaa00"),
    E: new Recurso("E", 100, 4, "#00aaaa"),
  };
  // Inicializar el mapa
  map = L.map("map").setView(
    [mundo.mapa.centro.lat, mundo.mapa.centro.lng],
    mundo.mapa.zoom
  );
  estilo =
    "https://{s}.basemaps.cartocdn.com/rastertiles/" +
    mundo.tema.tema_mapa +
    "/{z}/{x}/{y}{r}.png";
  L.tileLayer(estilo, {
    maxZoom: 20,
    attribution: "© CartoDB, © OpenStreetMap",
  }).addTo(map);

  // Crear la capa de vehiculos y añadirla al mapa
  // crea mundo.vehiculos y añade una moto al jugador
  let motoInicial = new Vehiculo("moto");
  motoInicial.setPos(mundo.mapa.centro);
  motoInicial.enMapa = true;
  motoInicial.carga = { A: 5, B: 5, C: 5, D: 5, E: 5 };
  mundo.vehiculos.push(motoInicial);

  vehiculosLayer = new VehiculoLayer();
  map.addLayer(vehiculosLayer);

  // Crear la capa de nodos y añadirla al mapa
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
  let dt = Date.now() - now;
  now = Date.now();
  //Actualizar estadisticas globales
  actualizaEstadisticas();
  // Actualizar nodos
  nodes.forEach((n) => n.updateNode());

  //actualiza los vehiculos

  for (let v of mundo.vehiculos) {
    if (v.enMapa && !v.cargando && v.tiempoCargaRestante <= 0) {
      v.update(dt);
      if (v.rutaCompletada) {
        let finalLat = null, finalLng = null;
        if (v.ruta && v.ruta.segmentos.length > 0) {
          let seg = v.ruta.segmentos[v.ruta.segmentos.length - 1];
          finalLat = seg.lat2;
          finalLng = seg.lng2;
        }
        console.log("Vehículo en destino final", finalLat, finalLng);
        let foundNode = nodes.find((n) => {
          let dist = L.latLng(n.lat, n.lng).distanceTo([finalLat, finalLng]);
          return dist < 30; 
        });
        if (foundNode) {
          // Descargamos
          foundNode.almacena(v.descargarTodo());
          
        }
        
        v.finalizaRuta();
      }
    }
  }

  // Actualizar clientes
  clientes.forEach((c) => c.updateCliente());
  // Dibuja los nodos
  nodeLayer.draw();
  clienteLayer.draw();
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
  mundo.vehiculos = [];

  nodeLayer.addNodes(nodes); // Actualizar la capa de nodos
  actualizaPanelControl();
}

function mostrarCaminos() {
  mostrarCaminosFlag = !mostrarCaminosFlag;
}
  