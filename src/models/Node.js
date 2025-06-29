// src/models/Node.js
import { Vehiculo } from './Vehicle.js';

export class Node {
    static nextId = 1;
    constructor(lat, lng, type = "generic", size = 10) {
        this.id = Node.nextId++;
        this.lat = lat;
        this.lng = lng;
        this.type = type;
        this.size = size;
        this.selected = false;

        // Propiedades de negocio
        this.inventory = {};
        this.inventoryCapacity = Infinity; // Por defecto es infinito
        this.pathIds = new Set();
        this.flota = []; // Vehículos estacionados aquí

        // --- Propiedades específicas de tipo, fuente: ---
        this.item_gen = 'A';
        this.precio_venta = 3.5;
        this.productionInterval = 100;
        this.lastProductionTime = 0;
        //--- tipo transformación ---
        this.entry_item = 'A';
        this.transformed_item = 'B';
        this.t_transform = 500;
        this.isProcessing = false;
        this.lastTransformTime = 0;
        this.areaInfluencia = { r: 500, genInterval: 1800, lastGenTime: 0 };
        this.clientesAtendiendoIds = new Set();
        this.capacidadAtencion = 4;
        this.factorAtencionClientes = 1;

        this.setCapacityByType(); 
        if (type === "fuente") this.initializeAsFuente();
    }

    setCapacityByType() {
        switch (this.type) {
            case 'almacen':
                this.inventoryCapacity = 1000;
                break;
            case 'transformador':
                this.inventoryCapacity = 500;
                break;
            case 'tienda':
                this.inventoryCapacity = 150;
                break;
            default:
                this.inventoryCapacity = Infinity;
        }
    }

    initializeAsFuente() {
        this.flota = [];
        for (let i = 0; i < 1; i++) {
            const moto = new Vehiculo('moto');
            moto.estacionar(this); // Ahora recibe el objeto nodo
        }
    }

    getInventoryTotal() {
        return Object.values(this.inventory).reduce((sum, current) => sum + current, 0);
    }

    almacena(items) {
        const itemsAlmacenados = {};
        for (const tipo in items) {
            const cantidad = items[tipo];
            const espacioLibre = this.inventoryCapacity - this.getInventoryTotal();
            const cantidadAAlmacenar = Math.min(cantidad, espacioLibre);

            if (cantidadAAlmacenar > 0) {
                this.inventory[tipo] = (this.inventory[tipo] || 0) + cantidadAAlmacenar;
                itemsAlmacenados[tipo] = cantidadAAlmacenar;
            }
        }
        return itemsAlmacenados;
    }
    
    consumir(items) {
        for (const tipo in items) {
            if (this.inventory[tipo]) {
                this.inventory[tipo] -= items[tipo];
                if (this.inventory[tipo] <= 0) {
                    delete this.inventory[tipo];
                }
            }
        }
    }

    tieneInventarioSuficiente(items) {
        for (const tipo in items) {
            if ((this.inventory[tipo] || 0) < items[tipo]) {
                return false;
            }
        }
        return true;
    }

    addPath(pathId) {
        this.pathIds.add(pathId);
    }

    removePath(pathId) {
        this.pathIds.delete(pathId);
    }
}