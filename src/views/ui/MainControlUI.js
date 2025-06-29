export class MainControlUI {
    constructor() {
        this._getDOMElements();
    }

    _getDOMElements() {
        this.elements = {
            createPath: document.getElementById('createCaminoButton'),
            clearPath: document.getElementById('limpiarCaminoSeleccionadoButton'),
            clearAll: document.getElementById('limpiarTodoButton'),
            toggleProduction: document.getElementById('empezarProduccionButton'),
            exportState: document.getElementById('exportButton'),
            importState: document.getElementById('importButton'),
            importFileInput: document.getElementById('importFileInput'),
        };
    }

    /**
     * Conecta las acciones (callbacks) a los eventos de los botones.
     * @param {object} actions - Objeto con callbacks: { onCreatePath, onClearPath, ... }
     */
    bindActions(actions) {
        this.elements.createPath.addEventListener('click', actions.onCreatePath);
        this.elements.clearPath.addEventListener('click', actions.onClearPath);
        this.elements.clearAll.addEventListener('click', actions.onClearAll);
        this.elements.toggleProduction.addEventListener('click', actions.onToggleProduction);
        this.elements.exportState.addEventListener('click', actions.onExport);
        this.elements.importState.addEventListener('click', () => this.elements.importFileInput.click());
        this.elements.importFileInput.addEventListener('change', (e) => actions.onImport(e.target.files[0]));
    }

    /**
     * Actualiza el estado visual de los controles.
     * @param {object} state - Objeto con el estado a reflejar: { isProductionActive }
     */
    update(state) {
        if (state.isProductionActive !== undefined) {
            this.elements.toggleProduction.textContent = state.isProductionActive 
                ? 'Detener Producción (E)' 
                : 'Empezar Producción (E)';
            this.elements.toggleProduction.style.backgroundColor = state.isProductionActive ? '#28a745' : '#dc3545';
        }
    }
}