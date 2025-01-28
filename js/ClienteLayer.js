class ClienteLayer extends L.Layer {
  constructor() {
    super();
    this.clientes = [];
  }

  onAdd(map) {
    this.map = map;

    // Crear el elemento Canvas
    this.canvas = L.DomUtil.create("canvas", "clientes-layer");
    this.canvas.width = map.getSize().x;
    this.canvas.height = map.getSize().y;
    this.ctx = this.canvas.getContext("2d");

    // Añadir el Canvas al pane de overlay
    let pane = map.getPanes().overlayPane;
    pane.appendChild(this.canvas);

    // Escuchar eventos de movimiento y redimensionamiento para ajustar el Canvas
    map.on("move", this._reset, this);
    map.on("resize", this._resize, this);
    //L.DomEvent.disableContextMenu(this.canvas);
    this.draw(); // Dibujar inicialmente
  }

  onRemove(map) {
    // Remover el Canvas del pane
    let pane = map.getPanes().overlayPane;
    pane.removeChild(this.canvas);

    // Remover listeners
    map.off("move", this._reset, this);
    map.off("resize", this._resize, this);
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
 

  // Dibujar todas las partículas en el Canvas
  draw() {
    if (!this.ctx) return;

    // Limpiar el canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dibujar las partículas
    clientes.forEach((cliente) => {
      if (cliente.atendido) return;
      let point = this.map.latLngToContainerPoint([cliente.lat, cliente.lng]);
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      this.ctx.fillStyle = "gray";
      this.ctx.fill();
      this.ctx.closePath();
    });

    // 2) Dibujar explosiones
    let now = Date.now();
    let duracion = 1000; // duración de la explosión en ms
    for (let i = explosiones.length - 1; i >= 0; i--) {
      let ex = explosiones[i];
      let dt = now - ex.inicio; // milisegundos transcurridos

      // 1) Chequeo de "vida" de la partícula
      if (dt > duracion) {
        // Duración total = 1s (por ejemplo)
        explosiones.splice(i, 1);
        continue;
      }
      // Factor de transparencia decreciente
      let alpha = 1 - dt / duracion;
      if (alpha < 0) alpha = 0;
      // *** Si es un objeto de texto:
      if (ex.texto) {
        // Convertimos a coordenadas de pantalla
        let p = this.map.latLngToContainerPoint([ex.lat, ex.lng]);

        // Dibujamos el texto en verde y centrado
        this.ctx.save();
        this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
        this.ctx.font = "bold 12px Arial";
        this.ctx.textAlign = "center";
        // Un pequeño ajuste en Y para que aparezca sobre la posición
        this.ctx.fillText(ex.texto, p.x, p.y - 10);
        this.ctx.restore();

        continue; // Importante: no dibujamos círculo si es texto
      }
      // 2) Calcular nueva posición desplazada radialmente
      let dist = ex.speed * (dt / 1000); // distancia recorrida = velocidad * tiempo
      let newLat = ex.lat + (dist * Math.sin(ex.angle)) / 111111;
      let newLng =
        ex.lng +
        (dist * Math.cos(ex.angle)) /
          (111111 * Math.cos(ex.lat * (Math.PI / 180)));

      // Convertimos a coordenadas de pantalla
      let p = this.map.latLngToContainerPoint([newLat, newLng]);

      

      // 4) Convertir color hex a RGB
      let { r, g, b } = hexToRgb(ex.color);

      // 5) Dibujar la partícula
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.ctx.fill();
      this.ctx.closePath();
    }
  } 
}

let explosiones = [];

function spawnExplosion(lat, lng, colorHex = "#FFFFFF", texto = "") {
  // Sonido simple
  if ( texto != ""){
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let oscillator = audioCtx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime( Math.random()*50 + 180  , audioCtx.currentTime);
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.05);
  }

  let numParticulas = 8; // cantidad de "chispas"
  let ahora = Date.now();

  // Crear partículas
  for (let i = 0; i < numParticulas; i++) {
    let angle = Math.random() * 2 * Math.PI;
    let speed = Math.random() * 12 + 12; // velocidad en m/s
    explosiones.push({
      lat: lat,
      lng: lng,
      angle: angle,
      speed: speed,
      inicio: ahora,
      color: colorHex,
      texto: null, // sin texto para las chispas
    });
  }

  // *** Agregar un objeto "texto" si texto no está vacío.
  //     Este objeto se dibuja en verde y se desvanece en el mismo período
  if (texto !== "") {
    explosiones.push({
      lat: lat,
      lng: lng,
      angle: 0,
      speed: 0,
      inicio: ahora,
      color: "#00FF00", // en este caso no se usa para dibujar círculos
      texto: texto,     // aquí está la cadena del dinero
    });
  }
}
