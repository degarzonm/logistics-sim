export class VehiclePanelUI {
    constructor(container, gameState, mapView) {
        this.container = container;
        this.gameState = gameState;
        this.mapView = mapView;
        this.panel = null;
    }

    /** Muestra y actualiza el panel para el vehículo seleccionado */
    update() {
        const selectedVehicle = Array.from(this.gameState.vehicles.values()).find(v => v.selected);

        if (selectedVehicle) {
            if (!this.panel) {
                this.panel = document.createElement('div');
                this.panel.className = 'vehicle-control-panel'; // Usaremos el mismo estilo que el de nodo por ahora
                this.container.appendChild(this.panel);
            }
            this.panel.style.display = 'block';
            this.buildPanelContent(this.panel, selectedVehicle);
            this.positionPanel(this.panel, selectedVehicle);
        } else if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    buildPanelContent(panelEl, vehicle) {
        const homeNode = this.gameState.nodes.get(vehicle.homeNodeId);
        const homeNodeName = homeNode ? `${homeNode.type} #${homeNode.id}` : 'Ninguno (Libre)';
        const cargaText = Object.entries(vehicle.carga).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Vacío';

        panelEl.innerHTML = `
            <h4>Vehículo #${vehicle.id} (${vehicle.tipo})</h4>
            <p><strong>Estado:</strong> ${vehicle.status.replace('_', ' ')}</p>
            <p><strong>Base:</strong> ${homeNodeName}</p>
            <p><strong>Carga:</strong> ${cargaText}</p>
        `;
    }

    positionPanel(panelEl, vehicle) {
        const map = this.mapView.getMap();
        if (!map || !vehicle.enMapa) return;

        const point = map.latLngToContainerPoint([vehicle.lat, vehicle.lng]);
        const mapSize = map.getSize();
        const panelRect = panelEl.getBoundingClientRect();

        let left = point.x + 20;
        let top = point.y - 10;

        if (left + panelRect.width > mapSize.x - 10) {
            left = point.x - panelRect.width - 20;
        }
        if (top + panelRect.height > mapSize.y - 10) {
            top = mapSize.y - panelRect.height - 10;
        }
        if (top < 10) {
            top = 10;
        }

        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
    }
    
    hide() {
        if(this.panel) this.panel.style.display = 'none';
    }
}