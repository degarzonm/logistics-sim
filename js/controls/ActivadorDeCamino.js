class ActivadorDeCamino {
  constructor(node, ruta, x, y, radio) {
    this.nodo = node;
    this.ruta = ruta;
    this.x = x;
    this.y = y;
    this.radio = radio;
  }
  activarRuta() {
    console.log(this.nodo);
    console.log(this.ruta);
    let ruta = this.nodo.rutas.find((r) => r.ruta._id == this.ruta._id);
    console.log("Activando ruta", ruta);
    ruta.activa = !ruta.activa;
  }

  dentro(x, y) {
    let distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    return distance <= this.radio;
  }
}
