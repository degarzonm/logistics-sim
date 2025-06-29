export class Pedido {
    static nextId = 1;

    /**
     * @param {number} origenId - ID del nodo que pide.
     * @param {number} destinoId - ID del nodo al que se le pide.
     * @param {Object.<string, number>} items - Objeto con los recursos y cantidades solicitadas.
     */
    constructor(origenId, destinoId, items) {
        this.id = Pedido.nextId++;
        this.solicitanteId = origenId;
        this.proveedorId = destinoId;
        this.items = items; // ej: { A: 10, C: 5 }

        /** @type {'PENDIENTE' | 'EN_RUTA' | 'ENTREGANDO' | 'REGRESANDO' | 'COMPLETADO' | 'RECHAZADO'} */
        this.estado = 'PENDIENTE';
        
        this.vehiculoAsignadoId = null;
        this.fechaCreacion = Date.now();
    }

    totalItems() {
        return Object.values(this.items).reduce((total, cantidad) => total + cantidad, 0);
    }
}