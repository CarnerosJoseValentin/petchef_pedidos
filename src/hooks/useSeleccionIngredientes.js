import { useState, useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Extraído de ingredientes.js sin cambios de comportamiento: cantidades
 * elegidas, cálculo de stock disponible (descontando lo ya puesto en el
 * carrito de esta sesión), validaciones y armado de la vianda al continuar.
 */
export function useSeleccionIngredientes({
  ingredientes,
  animalId,
  mascotaNombre,
  tipo,
  tipoCoccion,
  notas,
}) {
  const router = useRouter();
  const [cantidades, setCantidades] = useState({});
  const [stockUsadoEnCarrito, setStockUsadoEnCarrito] = useState({});

  useEffect(() => {
    if (ingredientes.length > 0) {
      calcularStockUsado();
    }
  }, [ingredientes]);

  const calcularStockUsado = () => {
    const carritoActual = JSON.parse(sessionStorage.getItem("carrito") || "[]");
    const stockUsado = {};
    carritoActual.forEach((vianda) => {
      vianda.ingredientes.forEach((ing) => {
        const key = ing.ingredienteId;
        const gramosUsados = ing.gramos * vianda.cantidadViandas;
        stockUsado[key] = (stockUsado[key] || 0) + gramosUsados;
      });
    });
    setStockUsadoEnCarrito(stockUsado);
  };

  // Stock real disponible = stock total - stock ya puesto en el carrito
  const getStockDisponible = (ingredienteId, stockTotal) => {
    const usado = stockUsadoEnCarrito[ingredienteId] || 0;
    return Math.max(0, stockTotal - usado);
  };

  const handleCantidadChange = (ingredienteId, cantidad, ingrediente) => {
    const cantidadNum = parseFloat(cantidad) || 0;
    const stockReal = getStockDisponible(ingredienteId, ingrediente.stockGramos);

    if (cantidadNum > stockReal) {
      const usado = stockUsadoEnCarrito[ingredienteId] || 0;
      alert(
        `⚠️ Stock insuficiente\n\n` +
          `Disponible en tienda: ${ingrediente.stockGramos.toLocaleString("es-AR")}g\n` +
          `Ya en tu carrito: ${usado}g\n` +
          `Disponible para esta vianda: ${stockReal}g`
      );
      setCantidades((prev) => ({ ...prev, [ingredienteId]: stockReal }));
      return;
    }

    setCantidades((prev) => ({ ...prev, [ingredienteId]: cantidadNum }));
  };

  const calcularTotal = () =>
    ingredientes.reduce((total, ingrediente) => {
      const cantidad = cantidades[ingrediente.id] || 0;
      return total + cantidad * ingrediente.precioGramo;
    }, 0);

  const calcularPesoTotal = () => {
    const total = Object.values(cantidades).reduce((t, c) => t + c, 0);
    return Math.round(total * 100) / 100;
  };

  const hayCarrito = () => {
    const carritoActual = JSON.parse(sessionStorage.getItem("carrito") || "[]");
    return carritoActual.length > 0;
  };

  const continuar = () => {
    if (calcularTotal() === 0) {
      alert("Debes seleccionar al menos un ingrediente");
      return;
    }
    if (!tipoCoccion) {
      alert("Por favor selecciona si la vianda será cruda o cocida");
      return;
    }

    const ingredientesSinStock = [];
    ingredientes.forEach((ing) => {
      const cantidad = cantidades[ing.id] || 0;
      if (cantidad > 0) {
        const stockReal = getStockDisponible(ing.id, ing.stockGramos);
        if (cantidad > stockReal) {
          const usado = stockUsadoEnCarrito[ing.id] || 0;
          ingredientesSinStock.push({
            nombre: ing.nombre,
            solicitado: cantidad,
            disponibleTotal: ing.stockGramos,
            enCarrito: usado,
            disponibleReal: stockReal,
          });
        }
      }
    });

    if (ingredientesSinStock.length > 0) {
      const mensaje = ingredientesSinStock
        .map(
          (item) =>
            `${item.nombre}:\n` +
            `- Solicitaste: ${item.solicitado}g\n` +
            `- Ya en carrito: ${item.enCarrito}g\n` +
            `- Disponible: ${item.disponibleReal}g`
        )
        .join("\n\n");
      alert(`⚠️ Stock insuficiente:\n\n${mensaje}`);
      return;
    }

    const nuevaVianda = {
      mascotaId: animalId,
      mascotaNombre: mascotaNombre || "",
      mascotaTipo: tipo,
      tipoCoccion,
      notas: notas.trim(),
      ingredientes: ingredientes
        .filter((ing) => cantidades[ing.id] > 0)
        .map((ing) => ({
          ingredienteId: ing.id,
          nombre: ing.nombre,
          gramos: cantidades[ing.id],
          precioGramo: ing.precioGramo,
          subtotal: cantidades[ing.id] * ing.precioGramo,
        })),
      precioUnitario: calcularTotal(),
      pesoTotal: calcularPesoTotal(),
      cantidadViandas: 1,
      subtotal: calcularTotal(),
    };

    const carritoActual = JSON.parse(sessionStorage.getItem("carrito") || "[]");
    carritoActual.push(nuevaVianda);
    sessionStorage.setItem("carrito", JSON.stringify(carritoActual));

    router.push("/carrito");
  };

  return {
    cantidades,
    stockUsadoEnCarrito,
    getStockDisponible,
    handleCantidadChange,
    calcularTotal,
    calcularPesoTotal,
    hayCarrito,
    continuar,
  };
}
