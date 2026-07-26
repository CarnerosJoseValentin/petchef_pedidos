import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../hooks/useAuth";
import { useIngredientes } from "../hooks/useIngredientes";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

const CATEGORIAS_CONFIG = [
  { key: 'carnes', label: 'CARNES' },
  { key: 'vegetales', label: 'VEGETALES' },
  { key: 'suplementos', label: 'SUPLEMENTOS' },
  { key: 'otros', label: 'OTROS' }
];

export default function Ingredientes() {
  const router = useRouter();
  const { animalId, tipo } = router.query;
  const { userData, loading: userLoading } = useAuth();
  const { ingredientes, loading: ingredientesLoading } = useIngredientes(
    tipo,
    true
  );
  const [cantidades, setCantidades] = useState({});
  const [tipoCoccion, setTipoCoccion] = useState("");
  const [notas, setNotas] = useState("");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  const toggleCategoria = (categoria) => {
    setCategoriasAbiertas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  }; 
  const [mascota, setMascota] = useState(null);
  const [stockUsadoEnCarrito, setStockUsadoEnCarrito] = useState({});


  useEffect(() => {
    if (userData && animalId) {
      const mascotaEncontrada = userData.mascotas?.find(
        (m) => m.id === animalId
      );
      setMascota(mascotaEncontrada);
    }
  }, [userData, animalId]);

  // Calcular stock ya usado en el carrito actual
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

  // Obtener stock REAL disponible (stock total - stock en carrito)
  const getStockDisponible = (ingredienteId, stockTotal) => {
    const usado = stockUsadoEnCarrito[ingredienteId] || 0;
    return Math.max(0, stockTotal - usado);
  };

  const handleCantidadChange = (ingredienteId, cantidad, ingrediente) => {
    const cantidadNum = parseFloat(cantidad) || 0;
    const stockReal = getStockDisponible(
      ingredienteId,
      ingrediente.stockGramos
    );

    if (cantidadNum > stockReal) {
      const usado = stockUsadoEnCarrito[ingredienteId] || 0;
      alert(
        `⚠️ Stock insuficiente\n\n` +
          `Disponible en tienda: ${ingrediente.stockGramos}g\n` +
          `Ya en tu carrito: ${usado}g\n` +
          `Disponible para esta vianda: ${stockReal}g`
      );
      setCantidades((prev) => ({
        ...prev,
        [ingredienteId]: stockReal,
      }));
      return;
    }

    setCantidades((prev) => ({
      ...prev,
      [ingredienteId]: cantidadNum,
    }));
  };

  const calcularTotal = () => {
    return ingredientes.reduce((total, ingrediente) => {
      const cantidad = cantidades[ingrediente.id] || 0;
      return total + cantidad * ingrediente.precioGramo;
    }, 0);
  };

  const calcularPesoTotal = () => {
    const total = Object.values(cantidades).reduce(
      (total, cantidad) => total + cantidad,
      0
    );
    // Redondear a 2 decimales para evitar errores de precisión
    return Math.round(total * 100) / 100;
  };

  const hayCarrito = () => {
    const carritoActual = JSON.parse(sessionStorage.getItem("carrito") || "[]");
    return carritoActual.length > 0;
  };

  // Prevenir cambio de valor con scroll del mouse
  const handleWheel = (e) => {
    // Si el elemento es un input number y está enfocado, prevenir scroll
    if (e.target.type === 'number' && document.activeElement === e.target) {
      e.preventDefault();
    }
  };

  const handleContinuar = () => {
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
      mascotaNombre: mascota?.nombre || "",
      mascotaTipo: tipo,
      tipoCoccion: tipoCoccion,
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

  if (userLoading || ingredientesLoading) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-primary text-xl">Cargando ingredientes...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!animalId || !tipo) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-gray-600 mb-4">
                Error: No se seleccionó ningún animal
              </p>
              <Button onClick={() => router.push("/seleccionar-animal")}>
                Volver a Seleccionar Animal
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!mascota) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-gray-600 mb-4">Error: Animal no encontrado</p>
              <Button onClick={() => router.push("/seleccionar-animal")}>
                Volver a Seleccionar Animal
              </Button>
            </div>
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
            <div className="bg-blue-50 p-6 rounded-lg mb-6 border-2 border-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">
                    {tipo === "perro" ? "🐕" : "🐱"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Armando vianda para {mascota.nombre}
                    </h2>
                    <p className="text-sm text-gray-600 capitalize">{tipo}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/seleccionar-animal")}
                  className="text-secondary hover:underline text-sm"
                >
                  ← Cambiar animal
                </button>
              </div>
            </div>

            {/* Alerta si hay stock usado en carrito */}
            {Object.keys(stockUsadoEnCarrito).length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ℹ️ Ya tienes ingredientes en tu carrito. El stock mostrado es
                  el disponible para esta nueva vianda.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-primary mb-4">
                Selecciona los ingredientes
              </h3>

              {ingredientes.length === 0 ? (
                <Card className="text-center p-8">
                  <p className="text-gray-600">
                    No hay ingredientes disponibles para {tipo}s en este
                    momento.
                  </p>
                </Card>
              ) : (
                (() => {
                  // Agrupar ingredientes por categoría
                  const ingredientesPorCategoria = CATEGORIAS_CONFIG.map(cat => ({
                    ...cat,
                    ingredientes: ingredientes.filter(ing => ing.categoria === cat.key)
                  })).filter(cat => cat.ingredientes.length > 0);

                  return (
                    <div className="space-y-6">
                      {ingredientesPorCategoria.map((categoria) => (
                        <div key={categoria.key} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                          {/* Header de categoría - Clickeable */}
                          <button
                            type="button"
                            onClick={() => toggleCategoria(categoria.key)}
                            className="w-full bg-gray-100 hover:bg-gray-200 transition-colors p-4 flex justify-between items-center"
                          >
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-primary">
                                {categoria.label}
                              </h3>
                              <span className="text-sm text-gray-600">
                                ({categoria.ingredientes.length} {categoria.ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'})
                              </span>
                            </div>
                            <span className="text-2xl text-gray-600">
                              {categoriasAbiertas[categoria.key] ? '▼' : '▶'}
                            </span>
                          </button>

                          {/* Contenido de categoría - Colapsable */}
                          {categoriasAbiertas[categoria.key] && (
                            <div className="p-4 space-y-4 bg-white">
                              {categoria.ingredientes.map((ingrediente) => {
                                const stockReal = getStockDisponible(
                                  ingrediente.id,
                                  ingrediente.stockGramos
                                );
                                const hayStockEnCarrito =
                                  (stockUsadoEnCarrito[ingrediente.id] || 0) > 0;

                                return (
                                  <Card key={ingrediente.id} className="border">
                                    <div className="flex justify-between items-center gap-4">
                                      <div className="flex-1">
                                        <h3 className="font-bold text-primary">
                                          {ingrediente.nombre}
                                        </h3>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          max={stockReal}
                                          step="0.01"
                                          placeholder="0"
                                          className="w-24 p-2 border rounded text-center"
                                          value={cantidades[ingrediente.id] || ""}
                                          onChange={(e) =>
                                            handleCantidadChange(
                                              ingrediente.id,
                                              e.target.value,
                                              ingrediente
                                            )
                                          }
                                          onWheel={handleWheel}
                                          disabled={stockReal === 0}
                                        />
                                        <span className="text-sm text-gray-500">gramos</span>

                                        {/* Tooltip de equivalencias */}
                                        <div className="relative group">
                                          <button
                                            type="button"
                                            className="text-secondary hover:text-primary transition-colors"
                                            title="Ver equivalencias"
                                          >
                                            <svg
                                              className="w-5 h-5"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          </button>

                                          {/* Tooltip content */}
                                          <div className="absolute right-0 top-8 z-10 w-64 p-3 bg-white border-2 border-secondary rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                            <div className="text-xs font-bold text-primary mb-2">
                                              📏 Equivalencias en gramos:
                                            </div>
                                            <div className="space-y-1 text-xs text-gray-700">
                                              <div className="flex justify-between">
                                                <span>🥄 1 cucharada sopera</span>
                                                <span className="font-bold">= 15g</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>🥄 1 cucharadita</span>
                                                <span className="font-bold">= 5g</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>🔪 Puntita de cuchillo</span>
                                                <span className="font-bold">= 0.3g</span>
                                              </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 italic">
                                              💡 Valores aproximados
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {stockReal === 0 && (
                                      <div className="mt-2 text-xs text-red-600 font-medium">
                                        ⚠️ Sin stock disponible (todo en tu carrito)
                                      </div>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Selector Cruda/Cocida */}
            {calcularTotal() > 0 && (
              <Card className="mt-6 border-2 border-secondary">
                <h3 className="font-bold text-primary mb-4">
                  ¿Cómo quieres la vianda para {mascota.nombre}?
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 has-[:checked]:border-secondary has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="tipoCoccion"
                      value="cruda"
                      checked={tipoCoccion === "cruda"}
                      onChange={(e) => setTipoCoccion(e.target.value)}
                      className="w-5 h-5 text-secondary"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-primary text-lg">
                        🥩 Cruda
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        Los ingredientes se entregarán sin cocción
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 has-[:checked]:border-secondary has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="tipoCoccion"
                      value="cocida"
                      checked={tipoCoccion === "cocida"}
                      onChange={(e) => setTipoCoccion(e.target.value)}
                      className="w-5 h-5 text-secondary"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-primary text-lg">
                        🍲 Cocida
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        Los ingredientes se cocinarán antes de entregar
                      </p>
                    </div>
                  </label>
                </div>
              </Card>
            )}

            {/* Campo de Notas */}
            {calcularTotal() > 0 && (
              <Card className="mt-6 border-2 border-gray-200">
                <h3 className="font-bold text-primary mb-2">
                  Observaciones o aclaraciones (opcional)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Ejemplo: "Alérgico a las uvas", "Sin zanahoria", "Trozos
                  pequeños", etc.
                </p>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  maxLength={500}
                  placeholder="Escribe aquí cualquier observación especial sobre esta vianda..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    💡 Esta mensaje será visible para el personal de producción
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      notas.length > 450 ? "text-orange-600" : "text-gray-500"
                    }`}
                  >
                    {notas.length}/500
                  </p>
                </div>
              </Card>
            )}

            {calcularTotal() > 0 && (
              <div className="mt-6 bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary mb-2">
                    Resumen de la vianda para {mascota.nombre}
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${calcularTotal().toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Peso total:{" "}
                    {calcularPesoTotal().toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                    g
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Precio por vianda individual
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 space-y-3 max-w-md mx-auto">
              <Button
                onClick={handleContinuar}
                disabled={calcularTotal() === 0}
                className="w-full"
              >
                Continuar con esta Vianda
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  router.push(hayCarrito() ? "/carrito" : "/seleccionar-animal")
                }
                className="w-full"
              >
                {hayCarrito() ? "← Volver al Carrito" : "← Volver a Mis Amig@s"}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
