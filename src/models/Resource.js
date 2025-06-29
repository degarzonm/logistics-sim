export class Recurso {
    constructor(tipo, precio, dificultad, color = "#AAAAAA") {
        this.tipo = tipo;
        this.precio = precio;
        this.dificultad = dificultad;
        this.color = color;
    }
}