import { PathLayer } from './layers/PathLayer.js';
import { NodeLayer } from './layers/NodeLayer.js';
import { VehicleLayer } from './layers/VehicleLayer.js';
import { ClientLayer } from './layers/ClientLayer.js';
import { EffectsLayer } from './layers/EffectsLayer.js';

export class MapView {
    constructor(mapId, center, zoom) {
        this.map = L.map(mapId).setView(center, zoom);
        
        this._initTileLayer();
        
        // --- Inicialización de Capas de Dibujo---
        this.pathLayer = new PathLayer();       
        this.nodeLayer = new NodeLayer();
        this.vehicleLayer = new VehicleLayer();
        this.clientLayer = new ClientLayer();
        this.effectsLayer = new EffectsLayer();
        
        this.map.addLayer(this.pathLayer);      
        this.map.addLayer(this.nodeLayer);
        this.map.addLayer(this.vehicleLayer);
        this.map.addLayer(this.clientLayer);
        this.map.addLayer(this.effectsLayer);
    }

    _initTileLayer() {
        const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png";
        L.tileLayer(TILE_URL, {
            maxZoom: 20,
            attribution: '© CartoDB, © OpenStreetMap contributors'
        }).addTo(this.map);
    }
    
    getMap() {
        return this.map;
    }

    render(data) {
        // Cada capa recibe solo los datos que necesita
        this.pathLayer.setData(data.paths);
        this.nodeLayer.setData(data.nodes);
        this.vehicleLayer.setData(data.vehicles);
        this.clientLayer.setData(data.clients);
    }

    renderEffects() {
        this.effectsLayer.draw();
    }
    
    addEffect(effect) {
        this.effectsLayer.addEffect(effect);
    }

    clearAll() {
        this.pathLayer.setData([]);
        this.nodeLayer.setData([]);
        this.vehicleLayer.setData([]);
        this.clientLayer.setData([]);
        this.effectsLayer.effects = [];
        this.effectsLayer.draw(); 
    }
}