class ActivadorDeCamino {
  constructor(node, ruta, esNodoA, x, y, radio) {
    this.nodo = node;
    this.ruta = ruta;
    this.esNodoA = esNodoA;
    this.x = x;
    this.y = y;
    this.radio = radio;
  }
  activarRuta() {
    if (this.esNodoA) {
      this.ruta.activeAtoB = !this.ruta.activeAtoB;
    } else {
      this.ruta.activeBtoA = !this.ruta.activeBtoA;
    }
  }

  dentro(x, y) {
    let distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    return distance <= this.radio;
  }
}
