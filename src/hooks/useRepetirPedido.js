import { useRouter } from "next/router";

/**
 * Lógica de "repetir pedido": valida stock y precios ACTUALES contra
 * Firestore (nunca reusa los precios viejos del pedido original), arma un
 * carrito nuevo y navega a /carrito. Extraído tal cual estaba en
 * mis-pedidos.js, sin cambios de comportamiento.
 */
export function useRepetirPedido() {
  const router = useRouter();

  const repetirPedido = async (pedido) => {
    const totalViandas = pedido.viandas?.length || 0;
    const mensaje =
      `🔄 Repetir Pedido #${pedido.numeroPedido}\n\n` +
      `📦 ${totalViandas} vianda${totalViandas !== 1 ? "s" : ""} para repetir\n\n` +
      `Se agregarán todas las viandas a tu carrito con los precios actuales.\n\n` +
      `¿Deseas continuar?`;

    if (!confirm(mensaje)) return;

    try {
      // Recopilar ingredientes únicos y sus cantidades totales
      const ingredientesNecesarios = {};

      pedido.viandas.forEach((vianda) => {
        vianda.ingredientes.forEach((ing) => {
          if (ingredientesNecesarios[ing.ingredienteId]) {
            ingredientesNecesarios[ing.ingredienteId].gramosTotal +=
              ing.gramos * vianda.cantidadViandas;
          } else {
            ingredientesNecesarios[ing.ingredienteId] = {
              nombre: ing.nombre,
              gramosTotal: ing.gramos * vianda.cantidadViandas,
              ingredienteId: ing.ingredienteId,
            };
          }
        });
      });

      // Consultar stock Y precios actuales de Firestore
      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");

      const ingredientesSinStock = [];
      const ingredientesActualizados = {};

      for (const [id, data] of Object.entries(ingredientesNecesarios)) {
        const ingredienteDoc = await getDoc(doc(db, "ingredientes", id));

        if (ingredienteDoc.exists()) {
          const ingredienteData = ingredienteDoc.data();
          const stockActual = ingredienteData.stockGramos;
          const precioActual = ingredienteData.precioGramo;

          ingredientesActualizados[id] = { ...data, precioGramo: precioActual };

          if (stockActual < data.gramosTotal) {
            ingredientesSinStock.push({
              nombre: data.nombre,
              necesario: data.gramosTotal,
              disponible: stockActual,
              faltante: data.gramosTotal - stockActual,
            });
          }
        } else {
          ingredientesSinStock.push({
            nombre: data.nombre,
            necesario: data.gramosTotal,
            disponible: 0,
            faltante: data.gramosTotal,
            noDisponible: true,
          });
        }
      }

      // Si hay ingredientes sin stock, advertir pero permitir continuar
      if (ingredientesSinStock.length > 0) {
        const advertencias = ingredientesSinStock.map((item) => {
          if (item.noDisponible) {
            return `❌ ${item.nombre}: Ya no está disponible (se omitirá)`;
          }
          return (
            `⚠️ ${item.nombre}:\n` +
            `   • Necesitas: ${item.necesario}g\n` +
            `   • Disponible: ${item.disponible}g`
          );
        });

        const mensajeAdvertencia =
          "⚠️ Atención:\n\n" +
          advertencias.join("\n\n") +
          "\n\n" +
          "Como tu pedido se prepara en 7 días, podemos conseguir los ingredientes faltantes.\n\n" +
          "¿Deseas agregar el pedido al carrito de todas formas?";

        if (!confirm(mensajeAdvertencia)) return;
      }

      // Construir carrito con precios actuales (nunca los del pedido viejo)
      const nuevoCarrito = pedido.viandas.map((vianda) => {
        const ingredientesActualizadosVianda = vianda.ingredientes
          .map((ing) => {
            const ingredienteActual = ingredientesActualizados[ing.ingredienteId];
            if (!ingredienteActual) return null;

            const subtotal = ing.gramos * ingredienteActual.precioGramo;

            return {
              ingredienteId: ing.ingredienteId,
              nombre: ing.nombre,
              gramos: ing.gramos,
              precioGramo: ingredienteActual.precioGramo,
              subtotal,
            };
          })
          .filter((ing) => ing !== null);

        const precioUnitarioActual = ingredientesActualizadosVianda.reduce(
          (sum, ing) => sum + ing.subtotal,
          0
        );
        const pesoTotal = ingredientesActualizadosVianda.reduce(
          (sum, ing) => sum + ing.gramos,
          0
        );

        return {
          mascotaId: vianda.mascotaId || null,
          mascotaNombre: vianda.mascotaNombre,
          mascotaTipo: vianda.mascotaTipo,
          tipoCoccion: vianda.tipoCoccion || "",
          notas: vianda.notas || "",
          ingredientes: ingredientesActualizadosVianda,
          precioUnitario: precioUnitarioActual,
          pesoTotal,
          cantidadViandas: 1,
          subtotal: precioUnitarioActual,
        };
      });

      sessionStorage.setItem("carrito", JSON.stringify(nuevoCarrito));

      alert(
        `✅ ¡Pedido agregado al carrito!\n\n` +
          `📦 ${nuevoCarrito.length} vianda${nuevoCarrito.length !== 1 ? "s" : ""} agregada${nuevoCarrito.length !== 1 ? "s" : ""}\n` +
          `🔢 Cantidad inicial: 1 unidad por vianda\n\n` +
          `Puedes ajustar cantidades y fechas de entrega en el carrito.`
      );

      router.push("/carrito");
    } catch (error) {
      console.error("Error al repetir pedido:", error);
      alert("Error al verificar stock. Por favor intenta nuevamente.");
    }
  };

  return { repetirPedido };
}
