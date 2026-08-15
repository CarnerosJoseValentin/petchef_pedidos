import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Extraído de admin/pedidos.js sin cambios de comportamiento: cambia el
 * estado de un pedido vía Cloud Function, y si el nuevo estado es
 * "cancelado" restaura el stock automáticamente antes de cambiar el estado.
 */
export function useCambiarEstadoPedido(pedidos) {
  const [procesando, setProcesando] = useState(false);

  const actualizarEstadoSinStock = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
      const functions = getFunctions();
      const cambiarEstado = httpsCallable(functions, "cambiarEstadoPedido");
      const resultado = await cambiarEstado({ pedidoId, nuevoEstado });

      if (resultado.data.success) {
        alert("✅ Estado actualizado correctamente");
        window.location.reload();
      } else {
        alert("Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert("Error: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);

      if (nuevoEstado === "cancelado") {
        const pedido = pedidos.find((p) => p.id === pedidoId);

        if (!pedido) {
          alert("Error: Pedido no encontrado");
          return;
        }

        if (pedido.stockRestaurado) {
          alert("Este pedido ya tiene el stock restaurado.\nSolo se actualizará el estado.");
          await actualizarEstadoSinStock(pedidoId, nuevoEstado);
          return;
        }

        try {
          const functions = getFunctions();
          const restaurarStock = httpsCallable(functions, "restaurarStockPedido");
          const resultado = await restaurarStock({ pedidoId });

          if (resultado.data.success) {
            await actualizarEstadoSinStock(pedidoId, nuevoEstado);
            alert(
              `✅ Pedido cancelado y stock restaurado\n\n` +
                `${resultado.data.ingredientes.length} ingredientes devueltos al inventario`
            );
          } else {
            throw new Error(resultado.data.mensaje || "Error desconocido");
          }
        } catch (error) {
          console.error("❌ Error restaurando stock:", error);
          const confirmarSinStock = window.confirm(
            `⚠️ Error al restaurar stock:\n${error.message}\n\n` +
              `¿Deseas cancelar el pedido de todas formas SIN restaurar el stock?`
          );
          if (confirmarSinStock) {
            await actualizarEstadoSinStock(pedidoId, nuevoEstado);
            alert("⚠️ Pedido cancelado pero el stock NO fue restaurado");
          }
        }
      } else {
        await actualizarEstadoSinStock(pedidoId, nuevoEstado);
      }
    } catch (error) {
      console.error("Error en cambiarEstadoPedido:", error);
      alert("Error al cambiar estado del pedido: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  return { cambiarEstadoPedido, procesando };
}
