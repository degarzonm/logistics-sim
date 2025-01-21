// objeto Cliente: clase que modela un cliente a ser atendido, generado en el area de influencia de una tienda

/****************************************************
 * CLASE CLIENTE
 ****************************************************/
class Cliente {
  constructor(
    lat,
    lng,
    demanda = { A: 1 },
    tiempo_espera = 7000
  ) {
    this.lat = lat;
    this.lng = lng;
    // Este "nodoGenerador" no es la tienda que lo atiende,
    // solo la que lo generó ( para estadística).

    this.demanda = demanda;
    // TIEMPO DE ATENCIÓN basado en la cantidad de ítems demandados
    this.tiempoAtencion = 0;
    for (let tipo in demanda) {
      this.tiempoAtencion += demanda[tipo] * 120 * tiposRecurso[tipo].dificultad; 
    }
    // TIEMPO DE ESPERA
    this.tiempoEsperaMax = tiempo_espera;
    this.tiempoEnEspera = 0;

    // REFERENCIA A LAS TIENDAS QUE LO ESTÁN ATENDIENDO
    // array de objetos { tienda, tiempoRestante }
    this.tiendasAtendiendome = [];

    // FLAG que indica si el cliente finalizó su ciclo por alguna razón, sea atendido o no.
    this.atendido = false;
  }

  // Lógica principal del cliente
  updateCliente() {
    if (this.atendido) return;

    // 1) Aumentar tiempo de espera
    this.tiempoEnEspera += gameSpeed;
    if (this.tiempoEnEspera >= this.tiempoEsperaMax) {
      // NINGUNA TIENDA LO LOGRÓ ATENDER A TIEMPO
      this.atendido = true;
      spawnExplosion(this.lat, this.lng, "#ffffff");
      return;
    }

    // 2) Avanzar el "tiempoRestante" en cada tienda que lo está atendiendo.
    //    La primera tienda que llegue a 0 => "gana".
    for (let i = this.tiendasAtendiendome.length - 1; i >= 0; i--) {
      let tInfo = this.tiendasAtendiendome[i];
      tInfo.tiempoRestante -= gameSpeed;
      if (tInfo.tiempoRestante <= 0) {
        // ESTA TIENDA HA TERMINADO PRIMERO
        this.finalizarAtencion(tInfo.tienda);
        break;
      }
    }
  }

  // Método que la tienda llama cuando quiere atender al cliente
  // Retorna true si se agregó, false si la demanda no puede ser satisfecha.
  // (Aquí comprobamos si la tienda tiene inventario suficiente)
  solicitarAtencion(tienda, factorAtencionTienda) {
    // Verificar si la tienda tiene suficiente inventario para TODOS los ítems demandados.
    // Ej: { A: 2, B:1 } => la tienda requiere al menos 2 de A y 1 de B
    if (!tienda.suficienteInventario(this.demanda)) {
      return false;
    }
    // Ver si ya está en la lista (para no duplicar)
    let yaExiste = this.tiendasAtendiendome.find((t) => t.tienda === tienda);
    if (!yaExiste) {
      // Agregamos con el tiempoRestante
      this.tiendasAtendiendome.push({
        tienda: tienda,
        // Tiempo de atención del cliente, con un factor de atención de la tienda CON BASE 1 que es lo normal, 1.4 por ejemplo tomara menor tiempo
        tiempoRestante: this.tiempoAtencion / factorAtencionTienda,
      });
    }
    return true;
  }

  // Cuando una tienda finaliza primero
  finalizarAtencion(tiendaGanadora) {
    //console.log("Cliente atendido en", tiendaGanadora, "\nal cliente :", this);
    //al final de la atencion, verificar nuevamente si hay inventario en la tienda ganadora
    if (!tiendaGanadora.suficienteInventario(this.demanda)) {
      tiendaGanadora.abortarAtencion(this);
      return false;
    }
    this.atendido = true;

    // Consumir la demanda del cliente en el inventario de la tienda ganadora
    tiendaGanadora.consumirInventario(this.demanda);

    // Cobrar - simplificado por ahora
    let totalMoney = 0;
    for (let tipo in this.demanda) {
      totalMoney += tiposRecurso[tipo].precio;
    }
    money += totalMoney ; 

    // Retirar al cliente de la lista de atención de otras tiendas y la ganadora
    tiendaGanadora.abortarAtencion(this);
    this.tiendasAtendiendome.forEach((tInfo) => {
      if (tInfo.tienda !== tiendaGanadora) {
        tInfo.tienda.abortarAtencion(this);
      }
    });
    this.tiendasAtendiendome = [];

    // Lanzar "explosión" visual en la capa de clientes
    let colorTienda = getNodeColorHex(tiendaGanadora);
    spawnExplosion(this.lat, this.lng, colorTienda , `+$${totalMoney}`);
  }
}
