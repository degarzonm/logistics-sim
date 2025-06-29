export class Vehiculo {
    static nextId = 1;

    constructor(tipo = "moto") {
        this.id = Vehiculo.nextId++;
        this.tipo = tipo;
        this.capacidad = 0;
        this.velocidad = 0; // en km/h
        this.speedFactor = 20; // factor para aumentar la velocidad en el mapa, bonus o penalización
        this._definirPropiedadesPorTipo();

        // --- Estado ---
        this.lat = null;
        this.lng = null;
        this.enMapa = false;
        this.selected = false;
        this.carga = {};
        
        // --- NUEVAS PROPIEDADES DE ESTADO Y MISIÓN ---
        /** @type {'ESTACIONADO' | 'EN_MISION' | 'LIBRE'} */
        this.status = 'ESTACIONADO'; 
        this.homeNodeId = null; // Nodo al que pertenece, su "base"
        
        // --- Movimiento ---
        this.pathId = null;
        this.currentSegmentIndex = 0;
        this.segmentElapsedMs = 0;
        this.rutaCompletada = false;

        // --- NUEVAS PROPIEDADES DE RUTA DE MISIÓN ---
        this.mission = {
            pedidoId: null,
            /** @type {'ENTREGA' | 'REGRESO' | 'ASIGNACION' | 'MOVE' | null} */
            type: null, 
            targetNodeId: null
        };
    }
    //constant in js
    /** Factor para convertir velocidad de km/h a m/s */
    
    
    _definirPropiedadesPorTipo() {
        switch (this.tipo) {
            case "moto":   this.capacidad = 5;   this.velocidad = 80 * this.speedFactor; break;
            case "van":    this.capacidad = 30;  this.velocidad = 50 * this.speedFactor; break;
            case "camion": this.capacidad = 150; this.velocidad = 30 * this.speedFactor; break;
            default:       this.capacidad = 5;   this.velocidad = 50 * this.speedFactor; break;
        }
    }

    // --- Métodos de cambio de estado ---
    estacionar(node) {
        this.status = 'ESTACIONADO';
        this.homeNodeId = node.id;
        this.enMapa = false;
        this.lat = node.lat;
        this.lng = node.lng;
        this.pathId = null;
        this.rutaCompletada = true;
        this.mission.pedidoId = null;
        this.mission.type = null;
        this.mission.targetNodeId = null;

        // Asegurarse de que el vehículo esté en la flota del nodo
        if (!node.flota.find(v => v.id === this.id)) {
            node.flota.push(this);
        }
    }
    
    iniciarRuta(pathId, startPos, missionType, target) {
        this.pathId = pathId;
        this.status = 'EN_MISION';
        this.enMapa = true;
        this.lat = startPos.lat;
        this.lng = startPos.lng;
        this.currentSegmentIndex = 0;
        this.segmentElapsedMs = 0;
        this.rutaCompletada = false;

        this.mission.type = missionType;
        
        if (typeof target.lat !== 'undefined') {
            // Es un objeto LatLng
            this.mission.targetLatLng = target;
            this.mission.targetNodeId = null;
        } else {
            // Es un ID de nodo
            this.mission.targetNodeId = target;
            this.mission.targetLatLng = null;
        }
    }

    iniciarRutaMisionDePedido(pathId, startNode, missionType, targetNodeId, pedidoId) {
        this.iniciarRuta(pathId, startNode, missionType, targetNodeId);
        this.mission.pedidoId = pedidoId;
    }

    liberar(lat, lng) {
        this.status = 'LIBRE';
        this.homeNodeId = null;
        this.enMapa = true;
        this.lat = lat;
        this.lng = lng;
    }
    
    // --- Métodos de gestión de carga ---
    cargar(items) {
        for (let tipo in items) {
            this.carga[tipo] = (this.carga[tipo] || 0) + items[tipo];
        }
    }

    descargarTodo() {
        const cargaDescargada = { ...this.carga }; // copia de la carga actual
        this.carga = {}; // reiniciar carga a vacío
        return cargaDescargada; // devuelve lo que se descargó     
    }
    
    getCargaTotal() {
        return Object.values(this.carga).reduce((a, b) => a + b, 0); // suma de todas las cargas
    }
    
    puedeCargar(pedido) {
        const cargaActual = this.getCargaTotal();
        const cargaNueva = pedido.totalItems();
        return (cargaActual + cargaNueva) <= this.capacidad;
    }
}