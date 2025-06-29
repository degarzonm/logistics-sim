//import utils
import { formatMoney } from "../../utils/utils.js"; 

export class StatsUI {
    constructor(moneyElement) {
        this.moneyElement = moneyElement;
    }

    /**
     * Actualiza la interfaz de estadísticas.
     * @param {{money: number}} data - Datos para mostrar.
     */
    update(data) {
        if (this.moneyElement && data.money !== undefined) {
            this.moneyElement.textContent = `Dinero: ${formatMoney(data.money)}`;
        }
    }
}