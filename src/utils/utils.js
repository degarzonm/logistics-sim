/**
 * Retorna el color de visualización para un tipo de nodo.
 * @param {string} type - El tipo del nodo ('fuente', 'almacen', etc.).
 * @returns {string} Un color CSS.
 */
export function getNodeColor(type) {
    switch (type) {
        case "fuente": return "green";
        case "sumidero": return "red";
        case "almacen": return "blue";
        case "transformador": return "orange";
        case "tienda": return "gold";
        default: return "gray";
    }
}

/**
 * Convierte un color hexadecimal a un objeto RGB.
 * @param {string} hex - El color en formato #RRGGBB.
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

/**
 * Limita la frecuencia de ejecución de una función.
 * @param {Function} func - La función a ejecutar.
 * @param {number} delay - El tiempo de espera en milisegundos.
 * @returns {Function} La función "debounced".
 */
export function debounce(func, delay) {
    let debounceTimer;
    return function(...args) {
        const context = this;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

/**
 * Formatea un número a dinero, 1000000 se convierte en $1,000,000.
 * @param {number} num - El número a formatear.
 * @returns {string} El número formateado.
 */

export function formatMoney(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}