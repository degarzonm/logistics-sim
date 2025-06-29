// src/controllers/KeyboardController.js
export class KeyboardController {
    /**
     * @param {Object.<string, Function>} actions - Un mapa de tecla a función.
     */
    constructor(actions) {
        this.actions = actions;
        this._setupListeners();
    }

    _setupListeners() {
        window.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    _handleKeyDown(e) {
        // Ignorar atajos si el usuario está escribiendo en un input
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
            return;
        }

        const action = this.actions[e.key.toLowerCase()];
        if (action) {
            e.preventDefault(); // Prevenir acciones por defecto del navegador (ej. 'e' abre email)
            action();
        }
    }
}