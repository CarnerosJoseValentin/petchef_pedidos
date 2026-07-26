import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

export default function Carrito() {
  const router = useRouter();
  const { userData } = useAuth();
  const [carrito, setCarrito] = useState([]);
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState({});
  const [problemasStock, setProblemmasStock] = useState([]);

  useEffect(() => {
    cargarCarrito();
  }, []);

  useEffect(() => {
    if (carrito.length > 0) {
      cargarStockIngredientes();
    }
  }, [carrito]);

  useEffect(() => {
    if (carrito.length > 0 && Object.keys(ingredientesDisponibles).length > 0) {
      validarStockCarrito();
    }
  }, [carrito, ingredientesDisponibles]);

  const cargarCarrito = () => {
    const carritoGuardado = sessionStorage.getItem("carrito");
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  };

  // Cargar stock disponible de todos los ingredientes usados en el carrito
  const cargarStockIngredientes = async () => {
    if (carrito.length === 0) return;

    // Recopilar IDs únicos de ingredientes
    const ingredientesIds = new Set();
    carrito.forEach((vianda) => {
      vianda.ingredientes.forEach((ing) => {
        ingredientesIds.add(ing.ingredienteId);
      });
    });

    // Consultar stock actual (importar desde firestore)
    const { getDoc, doc } = await import("firebase/firestore");
    const { db } = await import("../lib/firebase");

    const stockMap = {};
    for (const id of ingredientesIds) {
      const ingredienteDoc = await getDoc(doc(db, "ingredientes", id));
      if (ingredienteDoc.exists()) {
        stockMap[id] = ingredienteDoc.data().stockGramos;
      }
    }

    setIngredientesDisponibles(stockMap);
  };

  // Validar stock total del carrito contra stock disponible
  const validarStockCarrito = () => {
    // Calcular uso total de cada ingrediente en TODO el carrito
    const usoTotal = {};
    const detalleUso = {}; // Para mensajes detallados

    carrito.forEach((vianda, viandaIndex) => {
      vianda.ingredientes.forEach((ing) => {
        const key = ing.ingredienteId;
        const gramos = ing.gramos * vianda.cantidadViandas;
        usoTotal[key] = (usoTotal[key] || 0) + gramos;

        if (!detalleUso[key]) {
          detalleUso[key] = {
            nombre: ing.nombre,
            viandas: [],
          };
        }
        detalleUso[key].viandas.push({
          mascota: vianda.mascotaNombre,
          cantidad: vianda.cantidadViandas,
          gramosPorVianda: ing.gramos,
          total: gramos,
        });
      });
    });

    // Verificar contra stock real
    const problemas = [];
    for (const [ingredienteId, gramosUsados] of Object.entries(usoTotal)) {
      const stockDisponible = ingredientesDisponibles[ingredienteId] || 0;
      if (gramosUsados > stockDisponible) {
        problemas.push({
          id: ingredienteId,
          nombre: detalleUso[ingredienteId].nombre,
          usado: gramosUsados,
          disponible: stockDisponible,
          exceso: gramosUsados - stockDisponible,
          detalle: detalleUso[ingredienteId].viandas,
        });
      }
    }

    setProblemmasStock(problemas);

    if (problemas.length > 0) {
      const mensaje = problemas
        .map(
          (p) =>
            `${p.nombre}:\n` +
            `- En tu carrito: ${p.usado}g\n` +
            `- Disponible: ${p.disponible}g\n` +
            `- Exceso: ${p.exceso}g`
        )
        .join("\n\n");

      console.warn("⚠️ Problemas de stock detectados:", problemas);

      // No mostramos alert automático, solo guardamos los problemas
      // El usuario verá la alerta visual en la UI
    }
  };

  const guardarCarrito = (nuevoCarrito) => {
    setCarrito(nuevoCarrito);
    sessionStorage.setItem("carrito", JSON.stringify(nuevoCarrito));
  };

  const handleCantidadChange = (index, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;

    const vianda = carrito[index];

    const ingredientesSinStock = [];

    vianda.ingredientes.forEach((ing) => {
      const gramosNecesarios = ing.gramos * nuevaCantidad;

      // Calcular cuánto se está usando en OTRAS viandas
      let usadoEnOtras = 0;
      carrito.forEach((v, i) => {
        if (i !== index) {
          // No contar la vianda actual
          v.ingredientes.forEach((otroIng) => {
            if (otroIng.ingredienteId === ing.ingredienteId) {
              usadoEnOtras += otroIng.gramos * v.cantidadViandas;
            }
          });
        }
      });

      const stockDisponible = ingredientesDisponibles[ing.ingredienteId] || 0;
      const stockRealDisponible = stockDisponible - usadoEnOtras;

      if (gramosNecesarios > stockRealDisponible) {
        const cantidadMaxima = Math.floor(stockRealDisponible / ing.gramos);
        ingredientesSinStock.push({
          nombre: ing.nombre,
          necesario: gramosNecesarios,
          disponibleTotal: stockDisponible,
          usadoEnOtras: usadoEnOtras,
          disponibleReal: stockRealDisponible,
          maxViandas: cantidadMaxima,
        });
      }
    });

    if (ingredientesSinStock.length > 0) {
      const maxViandas = Math.min(
        ...ingredientesSinStock.map((i) => i.maxViandas)
      );

      const mensaje = ingredientesSinStock
        .map(
          (i) =>
            `${i.nombre}:\n` +
            `- Necesitas: ${i.necesario}g\n` +
            `- Stock total: ${i.disponibleTotal}g\n` +
            `- Usado en otras viandas: ${i.usadoEnOtras}g\n` +
            `- Disponible para esta vianda: ${i.disponibleReal}g`
        )
        .join("\n\n");

      alert(
        `⚠️ Stock insuficiente para ${nuevaCantidad} viandas\n\n${mensaje}\n\nMáximo de viandas posible: ${maxViandas}`
      );
      return;
    }

    // Si hay stock suficiente, actualizar
    const nuevoCarrito = [...carrito];
    nuevoCarrito[index].cantidadViandas = nuevaCantidad;
    nuevoCarrito[index].subtotal =
      nuevoCarrito[index].precioUnitario * nuevaCantidad;
    guardarCarrito(nuevoCarrito);
  };

  const handleEliminarVianda = (index) => {
    if (confirm("¿Eliminar esta vianda del carrito?")) {
      const nuevoCarrito = carrito.filter((_, i) => i !== index);
      guardarCarrito(nuevoCarrito);
    }
  };

  const calcularTotalCarrito = () => {
    return carrito.reduce((total, vianda) => total + vianda.subtotal, 0);
  };

  const handleAgregarMasViandas = () => {
    router.push("/seleccionar-animal");
  };

  const handleContinuar = () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    if (problemasStock.length > 0) {
      const mensaje = problemasStock
        .map((p) => `${p.nombre}: excede por ${p.exceso}g`)
        .join("\n");

      alert(
        `⚠️ No puedes continuar\n\n` +
          `Hay problemas de stock:\n${mensaje}\n\n` +
          `Por favor ajusta las cantidades o elimina viandas.`
      );
      return;
    }

    // Preparar datos para siguiente fase
    const pedidoData = {
      viandas: carrito,
      subtotalPedido: calcularTotalCarrito(),
    };

    sessionStorage.setItem("pedidoData", JSON.stringify(pedidoData));
    router.push("/cupones");
  };

  if (carrito.length === 0) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h2 className="text-2xl font-bold text-primary mb-4">
                Tu carrito está vacío
              </h2>
              <p className="text-gray-600 mb-6">
                Agrega viandas para tus amig@s de 4 patas
              </p>
              <Button onClick={() => router.push("/seleccionar-animal")}>
                Armar Viandas
              </Button>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto pt-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-suez text-primary">Tu Carrito 🛒</h1>
              <button
                onClick={handleAgregarMasViandas}
                className="text-secondary hover:underline text-sm"
              >
                + Agregar más viandas
              </button>
            </div>

            {/* Alerta de problemas de stock */}
            {problemasStock.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                <h3 className="font-bold text-red-800 mb-2">
                  ⚠️ Problemas de Stock Detectados
                </h3>
                <div className="space-y-2 text-sm text-red-700">
                  {problemasStock.map((p, i) => (
                    <div key={i} className="border-b border-red-200 pb-2">
                      <p className="font-medium">{p.nombre}</p>
                      <p>• En tu carrito: {p.usado}g</p>
                      <p>• Disponible: {p.disponible}g</p>
                      <p className="font-bold">• Exceso: {p.exceso}g</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-red-800 font-medium">
                  Por favor ajusta las cantidades o elimina viandas antes de
                  continuar.
                </p>
              </div>
            )}

            {/* Lista de viandas */}
            <div className="space-y-4 mb-6">
              {carrito.map((vianda, index) => {
                const iconoMascota =
                  vianda.mascotaTipo === "perro" ? "🐕" : "🐱";

                return (
                  <Card key={index} className="border-2 border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{iconoMascota}</div>
                        <div>
                          <h3 className="text-lg font-bold text-primary">
                            Vianda para {vianda.mascotaNombre}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {vianda.mascotaTipo}
                          </p>
                          {vianda.tipoCoccion && (
                            <p className="text-xs text-secondary font-medium mt-1">
                              {vianda.tipoCoccion === "cruda"
                                ? "🥩 Cruda"
                                : "🍲 Cocida"}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarVianda(index)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Ingredientes */}
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        Ingredientes:
                      </p>
                      <div className="space-y-1">
                        {vianda.ingredientes.map((ing, i) => (
                          <div key={i} className="text-sm">
                            <span>
                              • {ing.nombre}: {ing.gramos}g
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between text-sm font-medium">
                        <span>Precio por vianda:</span>
                        <span className="text-primary">
                          ${vianda.precioUnitario.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Notas si existen */}
                    {vianda.notas && (
                      <div className="mb-4 pb-4 border-b">
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          📝 Observaciones:
                        </p>
                        <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-200">
                          {vianda.notas}
                        </p>
                      </div>
                    )}
                    {/* Cantidad */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Cantidad de viandas:
                      </span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() =>
                            handleCantidadChange(
                              index,
                              vianda.cantidadViandas - 1
                            )
                          }
                          className="w-8 h-8 bg-secondary text-white rounded-lg font-bold hover:bg-primary transition-colors"
                        >
                          -
                        </button>
                        <div className="w-16 text-center text-lg font-bold text-primary">
                          {vianda.cantidadViandas}
                        </div>
                        <button
                          onClick={() =>
                            handleCantidadChange(
                              index,
                              vianda.cantidadViandas + 1
                            )
                          }
                          className="w-8 h-8 bg-secondary text-white rounded-lg font-bold hover:bg-primary transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Subtotal {vianda.mascotaNombre}:
                        </span>
                        <span className="text-xl font-bold text-primary">
                          ${vianda.subtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Resumen total */}
            <Card className="mb-6 bg-blue-50 border-2 border-secondary">
              <h3 className="font-bold text-primary mb-4 text-lg">
                Resumen del Carrito
              </h3>

              <div className="space-y-2">
                {carrito.map((vianda, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {vianda.mascotaNombre} ({vianda.cantidadViandas} viandas)
                    </span>
                    <span className="font-medium">
                      ${vianda.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-blue-300 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-primary">
                    TOTAL CARRITO
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${calcularTotalCarrito().toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Botones de acción */}
            <div className="space-y-3 max-w-md mx-auto">
              <Button onClick={handleAgregarMasViandas} variant="secondary">
                + Agregar vianda para otr@ amig@
              </Button>
              <Button
                onClick={handleContinuar}
                disabled={problemasStock.length > 0}
              >
                Continuar al pago →
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
