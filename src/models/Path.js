import { Segment } from './Segment.js';

export class Path {
    static nextId = 1;

    /**
     * @param {number} nodeA_id - ID del nodo de origen.
     * @param {number} nodeB_id - ID del nodo de destino.
     * @param {Array<object>} segmentsData - Array de datos de segmentos (lat1, lng1, lat2, lng2, distanceM).
     * @param {Array<[number, number]>} geometry - Array de coordenadas [lat, lng] para la polilínea.
     */
    constructor(nodeA_id, nodeB_id, segmentsData, geometry) {
        this.id = Path.nextId++;
        this.nodeA_id = nodeA_id;
        this.nodeB_id = nodeB_id;
        
        // La geometría completa de la polilínea para el dibujado.
        // Array de [lat, lng]
        this.geometry = geometry || [];
        
        // Los segmentos individuales con su metadata (distancia, tiempo, etc.).
        this.segments = segmentsData.map(s => new Segment(s.lat1, s.lng1, s.lat2, s.lng2, s.distanceM));

        // Estado de activación del camino para la lógica de negocio.
        this.active = true;
    }
}