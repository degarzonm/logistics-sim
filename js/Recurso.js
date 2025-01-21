//objeto recurso que modela un recurso a ser transportado

class Recurso {
    constructor(tipo, precio, dificultad, color = "#AAAAAA") {
        this.tipo = tipo;
        this.precio = precio;
        this.dificultad = dificultad;
        this.color = color;
    }
}