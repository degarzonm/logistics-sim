/**
 * Servicio para obtener datos de rutas desde una API externa (OSRM).
 */
export class RouteService {
    /**
     * Obtiene una ruta entre dos nodos.
     * @param {{lat: number, lng: number}} nodeA - Coordenadas del nodo de origen.
     * @param {{lat: number, lng: number}} nodeB - Coordenadas del nodo de destino.
     * @returns {Promise<{segments: Array<object>, geometry: Array<[number, number]>}|null>}
     */
    async getRoute(nodeA, nodeB) {
        const url = `https://router.project-osrm.org/route/v1/driving/${nodeA.lng},${nodeA.lat};${nodeB.lng},${nodeB.lat}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OSRM API error: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const geometry = route.geometry.coordinates.map(c => [c[1], c[0]]); // Convertir [lng, lat] a [lat, lng]
                
                // Construir los segmentos para el modelo
                const segments = [];
                for (let i = 0; i < geometry.length - 1; i++) {
                    const [lat1, lng1] = geometry[i];
                    const [lat2, lng2] = geometry[i + 1];
                    // La API de OSRM no provee la distancia por segmento, la calculamos nosotros
                    const distanceM = L.latLng(lat1, lng1).distanceTo([lat2, lng2]);
                    segments.push({ lat1, lng1, lat2, lng2, distanceM });
                }
                
                return { segments, geometry };
            }
            return null;
        } catch (error) {
            console.error("Error fetching route from OSRM:", error);
            // Fallback: crear una ruta recta si la API falla
            const distanceM = L.latLng(nodeA.lat, nodeA.lng).distanceTo([nodeB.lat, nodeB.lng]);
            return {
                segments: [{ lat1: nodeA.lat, lng1: nodeA.lng, lat2: nodeB.lat, lng2: nodeB.lng, distanceM }],
                geometry: [[nodeA.lat, nodeA.lng], [nodeB.lat, nodeB.lng]]
            };
        }
    }
}