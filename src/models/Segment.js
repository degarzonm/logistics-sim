export class Segment {
    /**
     * @param {number} lat1 
     * @param {number} lng1 
     * @param {number} lat2 
     * @param {number} lng2 
     * @param {number} distanceM - Distancia precalculada en metros.
     */
    constructor(lat1, lng1, lat2, lng2, distanceM) {
        this.lat1 = lat1;
        this.lng1 = lng1;
        this.lat2 = lat2;
        this.lng2 = lng2;
        this.distanceM = distanceM;
    }

    /**
     * Calcula el tiempo de viaje para este segmento basado en una velocidad dada.
     * @param {number} speedKmh - Velocidad en kilómetros por hora.
     * @returns {number} Tiempo de viaje en milisegundos.
     */
    getTravelTimeMs(speedKmh) {
        if (speedKmh === 0) return Infinity;
        const speedMs = (speedKmh * 1000) / 3600; // km/h a m/s
        return (this.distanceM / speedMs) * 1000;
    }
}