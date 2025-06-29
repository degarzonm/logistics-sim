export class PersistenceService {
    constructor(gameState) {
        this.gameState = gameState;
    }

    exportState() {
        const data = this.gameState.getFullState();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'logisticsSim_state.json';
        link.click();
        URL.revokeObjectURL(url);
        console.log("Estado exportado.");
    }

    importState(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.gameState.setFullState(data);
                console.log("Estado importado.");
            } catch (e) {
                console.error("Error al parsear el archivo de importación:", e);
                alert("El archivo no es un JSON válido.");
            }
        };
        reader.readAsText(file);
    }
}