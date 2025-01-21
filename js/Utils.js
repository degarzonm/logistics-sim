// Barajar (shuffle)
function shuffle(arr) {
    let array = arr.slice();
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /****************************************************
   * UTILS: Debounce
   *  Función para limitar la frecuencia de ejecución
   ****************************************************/
  function debounce(func, delay) {
    let debounceTimer;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
  }

  function hexToRgb(hex) {
    // Elimina el "#" al inicio si está presente
    hex = hex.replace(/^#/, '');
  
    // Parsea la cadena como un número hexadecimal
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8)  & 255;
    let b = bigint & 255;
  
    return { r, g, b };
  }

  function getNodeColorHex(node) {
    switch (node.type) {
      case "fuente":         return "#00FF00"; // verde
      case "sumidero":       return "#FF0000"; // rojo
      case "almacen":        return "#0000FF"; // azul
      case "transformador":  return "#FFA500"; // naranja
      case "tienda":         return "#FFD700"; // dorado
      default:               return "#808080"; // gris
    }
  }