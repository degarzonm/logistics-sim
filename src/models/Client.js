export class Cliente {
    static nextId = 1;
    constructor(lat, lng, demanda, tiempoEsperaMax, tiendaGeneradoraId) {
        this.id = Cliente.nextId++;
        this.lat = lat;
        this.lng = lng;
        this.tiendaGeneradoraId = tiendaGeneradoraId;
        
        this.demanda = demanda;
        this.tiempoEsperaMax = tiempoEsperaMax; // en ms
        this.tiempoEnEspera = 0; // en ms
        this.tiempoAtencion = 0; // se calcula basado en la demanda

        // Array de IDs de tiendas que intentan atenderlo
        this.tiendasAtendiendoIds = new Set();
        
        this.atendido = false; // Flag para saber si ya fue atendido
        this.desistio = false; // Flag para saber si se fue por exceso de espera
    }
}