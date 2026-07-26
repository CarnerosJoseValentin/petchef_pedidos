import { useState } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { usePedidos } from "../hooks/usePedidos";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

export default function MisPedidos() {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const { pedidos, loading, error } = usePedidos(filtroEstado);

  const estadoConfig = {
    pendiente: {
      color: "bg-yellow-100 text-yellow-800",
      icono: "⏳",
      label: "Pendiente",
    },
    preparacion: {
      color: "bg-blue-100 text-blue-800",
      icono: "👨‍🍳",
      label: "En Preparación",
    },
    listo: {
      color: "bg-green-100 text-green-800",
      icono: "✅",
      label: "Listo",
    },
    entregado: {
      color: "bg-gray-100 text-gray-800",
      icono: "📦",
      label: "Entregado",
    },
    cancelado: {
      color: "bg-red-100 text-red-800",
      icono: "❌",
      label: "Cancelado",
    },
  };

  const formatearFecha = (timestamp) => {
    if (!timestamp) return "Fecha no disponible";
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatearFechaCorta = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleRepetirPedido = async (pedido) => {
    const totalViandas = pedido.viandas?.length || 0;
    const mensaje = 
      `🔄 Repetir Pedido #${pedido.numeroPedido}\n\n` +
      `📦 ${totalViandas} vianda${totalViandas !== 1 ? 's' : ''} para repetir\n\n` +
      `Se agregarán todas las viandas a tu carrito con los precios actuales.\n\n` +
      `¿Deseas continuar?`;
    
    if (!confirm(mensaje)) {
      return;
    }

    try {
      console.log("🔍 Validando stock para repetir pedido...");

      // Recopilar todos los ingredientes únicos y sus cantidades totales
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
const ingredientesActualizados = {}; // Guardar ingredientes con precios actuales

for (const [id, data] of Object.entries(ingredientesNecesarios)) {
  const ingredienteDoc = await getDoc(doc(db, "ingredientes", id));

  if (ingredienteDoc.exists()) {
    const ingredienteData = ingredienteDoc.data();
    const stockActual = ingredienteData.stockGramos;
    const precioActual = ingredienteData.precioGramo;

    // Guardar precio actual
    ingredientesActualizados[id] = {
      ...data,
      precioGramo: precioActual,
    };

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

// Si hay ingredientes sin stock, mostrar ADVERTENCIA pero permitir continuar
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

  const mensaje =
    "⚠️ Atención:\n\n" +
    advertencias.join("\n\n") +
    "\n\n" +
    "Como tu pedido se prepara en 7 días, podemos conseguir los ingredientes faltantes.\n\n" +
    "¿Deseas agregar el pedido al carrito de todas formas?";

  if (!confirm(mensaje)) {
    console.log("❌ Usuario canceló debido a advertencias de stock");
    return;
  }
  
  console.log("✅ Usuario confirmó continuar a pesar de advertencias");
}

// Construir carrito con PRECIOS ACTUALES
console.log("✅ Construyendo carrito con precios actuales...");

const nuevoCarrito = pedido.viandas.map((vianda) => {
  // Recalcular ingredientes con precios actuales
  const ingredientesActualizadosVianda = vianda.ingredientes
    .map((ing) => {
      const ingredienteActual = ingredientesActualizados[ing.ingredienteId];
      
      // Si el ingrediente no existe más, omitirlo
      if (!ingredienteActual) {
        console.log(`⚠️ Omitiendo ingrediente no disponible: ${ing.nombre}`);
        return null;
      }

      // Recalcular con precio actual
      const subtotal = ing.gramos * ingredienteActual.precioGramo;

      return {
        ingredienteId: ing.ingredienteId,
        nombre: ing.nombre,
        gramos: ing.gramos,
        precioGramo: ingredienteActual.precioGramo, // ← PRECIO ACTUAL
        subtotal: subtotal, // ← RECALCULADO
      };
    })
    .filter(ing => ing !== null); // Eliminar ingredientes omitidos

  // Calcular precio unitario con precios actuales
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
    precioUnitario: precioUnitarioActual, // ← PRECIO RECALCULADO
    pesoTotal: pesoTotal,
    cantidadViandas: 1,
    subtotal: precioUnitarioActual, // ← PRECIO RECALCULADO
  };
});

      sessionStorage.setItem("carrito", JSON.stringify(nuevoCarrito));

      const mensajeExito = 
        `✅ ¡Pedido agregado al carrito!\n\n` +
        `📦 ${nuevoCarrito.length} vianda${nuevoCarrito.length !== 1 ? 's' : ''} agregada${nuevoCarrito.length !== 1 ? 's' : ''}\n` +
        `🔢 Cantidad inicial: 1 unidad por vianda\n\n` +
        `Puedes ajustar cantidades y fechas de entrega en el carrito.`;
      
      alert(mensajeExito);

      router.push("/carrito");
    } catch (error) {
      console.error("Error al repetir pedido:", error);
      alert("Error al verificar stock. Por favor intenta nuevamente.");
    }
  };

  const handleVerDetalle = (pedido) => {
    setPedidoSeleccionado(pedido);
  };

  const handleCerrarDetalle = () => {
    setPedidoSeleccionado(null);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-primary text-xl">Cargando pedidos...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md text-center">
              <p className="text-red-600 mb-4">
                Error al cargar pedidos: {error}
              </p>
              <Button onClick={() => router.reload()}>Reintentar</Button>
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
          <div className="max-w-4xl mx-auto pt-8">
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => router.push("/seleccionar-animal")}
                className="text-secondary hover:underline mb-4"
              >
                ← Volver al inicio
              </button>
              <h1 className="text-3xl font-suez text-primary">
                Mis Pedidos 📋
              </h1>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
              <h3 className="font-bold text-primary mb-3">
                Filtrar por estado:
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroEstado(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filtroEstado === null
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Todos
                </button>
                {Object.entries(estadoConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFiltroEstado(key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filtroEstado === key
                        ? config.color
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {config.icono} {config.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Lista de pedidos */}
            {pedidos.length === 0 ? (
              <Card className="text-center p-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-primary mb-2">
                  No hay pedidos
                </h3>
                <p className="text-gray-600 mb-6">
                  {filtroEstado
                    ? `No tienes pedidos con estado "${estadoConfig[filtroEstado].label}"`
                    : "Aún no has realizado ningún pedido"}
                </p>
                <Button onClick={() => router.push("/seleccionar-animal")}>
                  Hacer mi primer pedido
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => {
                  const config =
                    estadoConfig[pedido.estado] || estadoConfig.pendiente;
                  const totalViandas =
                    pedido.viandas?.reduce(
                      (sum, v) => sum + v.cantidadViandas,
                      0
                    ) || 0;

                  return (
                    <Card
                      key={pedido.id}
                      className="border-2 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Info principal */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold ${config.color}`}
                            >
                              {config.icono} {config.label}
                            </span>
                            <span className="text-lg font-bold text-secondary">
                              #{pedido.numeroPedido}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📅 {formatearFechaCorta(pedido.createdAt)}</p>
                            <p>
                              🐾 {totalViandas} viandas para{" "}
                              {pedido.viandas?.length || 0} mascota(s)
                            </p>
                            <p>
                              {pedido.entrega?.tipo === "retiro"
                                ? "🏪 Retiro"
                                : "🚚 Envío"}{" "}
                              - Fecha: {pedido.entrega?.fecha}
                            </p>
                          </div>
                        </div>

                        {/* Total y acciones */}
                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-2xl font-bold text-primary">
                              ${pedido.precios?.total?.toLocaleString() || "0"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerDetalle(pedido)}
                              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors text-sm"
                            >
                              Ver detalle
                            </button>
                            {pedido.estado === "entregado" && (
                              <button
                                onClick={() => handleRepetirPedido(pedido)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                title="Repetir este pedido"
                              >
                                🔄 Repetir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal de detalle */}
        {pedidoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-primary">
                  Pedido #{pedidoSeleccionado.numeroPedido}
                </h2>
                <button
                  onClick={handleCerrarDetalle}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Estado */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-4 py-2 rounded-full font-bold ${
                      estadoConfig[pedidoSeleccionado.estado]?.color
                    }`}
                  >
                    {estadoConfig[pedidoSeleccionado.estado]?.icono}{" "}
                    {estadoConfig[pedidoSeleccionado.estado]?.label}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatearFecha(pedidoSeleccionado.createdAt)}
                  </span>
                </div>

                {/* Viandas */}
                <div>
                  <h3 className="font-bold text-primary mb-3">
                    Detalle de Viandas
                  </h3>
                  {pedidoSeleccionado.viandas?.map((vianda, index) => (
                    <Card key={index} className="mb-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"}
                        </span>
                        <div>
                          <p className="font-bold">{vianda.mascotaNombre}</p>
                          <p className="text-sm text-gray-600">
                            {vianda.cantidadViandas} viandas × $
                            {vianda.precioUnitario?.toLocaleString()}
                          </p>
                          {vianda.tipoCoccion && (
                            <p className="text-xs text-secondary font-medium mt-1">
                              {vianda.tipoCoccion === "cruda" ? "🥩 Cruda" : "🍲 Cocida"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 ml-10">
                        <p className="mb-1">Ingredientes:</p>
                        <ul className="space-y-1">
                          {vianda.ingredientes?.map((ing, i) => (
                            <li key={i}>
                              • {ing.nombre}: {ing.gramos}g
                            </li>
                          ))}
                        </ul>
                        </div>
                      {vianda.notas && (
                        <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 p-3 rounded">
                          <p className="text-xs font-bold text-yellow-900 mb-1">
                            📝 Observaciones:
                          </p>
                          <p className="text-sm text-yellow-900">
                            {vianda.notas}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Entrega */}
                <div>
                  <h3 className="font-bold text-primary mb-2">
                    Datos de Entrega
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Tipo:</span>{" "}
                      {pedidoSeleccionado.entrega?.tipo === "retiro"
                        ? "🏪 Retiro en local"
                        : "🚚 Envío a domicilio"}
                    </p>
                    <p>
                      <span className="text-gray-600">Dirección:</span>{" "}
                      {pedidoSeleccionado.entrega?.direccion}
                    </p>
                    <p>
                      <span className="text-gray-600">Fecha:</span>{" "}
                      {pedidoSeleccionado.entrega?.fecha}
                    </p>
                    {pedidoSeleccionado.entrega?.franjaHoraria && (
                      <p>
                        <span className="text-gray-600">Horario:</span>{" "}
                        {pedidoSeleccionado.entrega.franjaHoraria}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen de pago */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-bold text-primary mb-2">
                    Resumen de Pago
                  </h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>
                        $
                        {pedidoSeleccionado.precios?.subtotalViandas?.toLocaleString()}
                      </span>
                    </div>
                    {pedidoSeleccionado.precios?.descuentoCupones > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Cupones:</span>
                        <span>
                          -$
                          {pedidoSeleccionado.precios.descuentoCupones.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {pedidoSeleccionado.precios?.descuentoEfectivo > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento efectivo:</span>
                        <span>
                          -$
                          {pedidoSeleccionado.precios.descuentoEfectivo.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {pedidoSeleccionado.precios?.costoEnvio > 0 && (
                      <div className="flex justify-between">
                        <span>Envío:</span>
                        <span>
                          +$
                          {pedidoSeleccionado.precios.costoEnvio.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                      <span>TOTAL:</span>
                      <span>
                        ${pedidoSeleccionado.precios?.total?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Método de pago */}
                <div className="text-sm">
                  <span className="text-gray-600">Método de pago:</span>{" "}
                  <span className="font-medium">
                    {pedidoSeleccionado.metodoPago === "efectivo"
                      ? "💵 Efectivo"
                      : "💳 MercadoPago"}
                  </span>
                </div>
              </div>

              <div className="border-t p-4 flex gap-3">
                <Button
                  onClick={handleCerrarDetalle}
                  variant="secondary"
                  className="flex-1"
                >
                  Cerrar
                </Button>
                {pedidoSeleccionado.estado === "entregado" && (
                  <Button
                    onClick={() => {
                      handleRepetirPedido(pedidoSeleccionado);
                      handleCerrarDetalle();
                    }}
                    className="flex-1"
                  >
                    🔄 Repetir Pedido
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
