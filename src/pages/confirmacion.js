import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { createPedido, incrementarUsoCupon } from "../lib/firestore";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { crearPreferenciaPago } from "../lib/mercadopago";
import { getFunctions, httpsCallable } from "firebase/functions";
import Layout from "../components/layout/Layout";

export default function Confirmacion() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [pedidoData, setPedidoData] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(null);

  useEffect(() => {
    const data = sessionStorage.getItem("pedidoData");
    if (!data) {
      router.push("/carrito");
      return;
    }
    setPedidoData(JSON.parse(data));
  }, [router]);

  const formatearFecha = (fecha) => {
    const date = new Date(fecha + "T00:00:00");
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleConfirmarPedido = async () => {
    if (!pedidoData || !userData) return;

    setConfirmando(true);

    try {
      // Preparar lista de ingredientes para reducir stock
      console.log("Preparando lista de ingredientes...");
      const todosLosIngredientes = [];

      pedidoData.viandas.forEach((vianda) => {
        vianda.ingredientes.forEach((ing) => {
          const existente = todosLosIngredientes.find(
            (item) => item.ingredienteId === ing.ingredienteId
          );

          if (existente) {
            existente.gramos += ing.gramos * vianda.cantidadViandas;
          } else {
            todosLosIngredientes.push({
              ingredienteId: ing.ingredienteId,
              nombre: ing.nombre,
              gramos: ing.gramos * vianda.cantidadViandas,
            });
          }
        });
      });

      // Validar y reducir stock ANTES de crear el pedido
      console.log("Validando y reduciendo stock...");
      try {
        const functions = getFunctions();
        const reducirStock = httpsCallable(functions, "reducirStockPedido");

        await reducirStock({ ingredientes: todosLosIngredientes });
        console.log("✅ Stock reducido correctamente");
      } catch (stockError) {
        console.error("Error con el stock:", stockError);
        alert(`❌ ${stockError.message}\n\nNo se pudo completar el pedido.`);
        setConfirmando(false);
        return;
      }

      // Preparar datos del pedido
      const pedido = {
        usuarioId: user.uid,
        usuario: {
          nombre: `${userData.nombre} ${userData.apellido}`,
          email: userData.email,
          telefono: userData.telefono || "",
        },
        viandas: pedidoData.viandas,
        precios: {
          subtotalViandas: pedidoData.subtotalPedido,
          cuponesAplicados: pedidoData.cuponesAplicados || [],
          descuentoCupones: pedidoData.descuentoCupones || 0,
          descuentoEfectivo: pedidoData.descuentoEfectivo || 0,
          costoEnvio: pedidoData.costoEnvio || 0,
          total: pedidoData.totalFinal,
        },
        metodoPago: pedidoData.metodoPago,
        estadoPago: "pendiente",
        entrega: pedidoData.entrega,
        estado: "pendiente",
        notificaciones: {
          whatsappEnviado: false,
          emailEnviado: false,
        },
      };

      // Crear pedido en Firestore
      const result = await createPedido(pedido);

      if (!result.success) {
        throw new Error(result.error);
      }

      const pedidoId = result.id;

      // Enviar notificación de pedido confirmado (solo si es efectivo)
      if (pedidoData.metodoPago === "efectivo") {
        try {
          const notificar = httpsCallable(
            functions,
            "notificarPedidoConfirmadoCliente"
          );

          await notificar({
            ...pedido,
            numeroPedido: result.numeroPedido,
          });
        } catch (error) {
          console.log("Error enviando WhatsApp (no crítico):", error);
        }
      }

      // Incrementar uso de cupones aplicados
      if (
        pedidoData.cuponesAplicados &&
        pedidoData.cuponesAplicados.length > 0
      ) {
        for (const cupon of pedidoData.cuponesAplicados) {
          await incrementarUsoCupon(cupon.id);
        }
      }

      // SI ES MERCADOPAGO: Crear preferencia y redirigir
      if (pedidoData.metodoPago === "mercadopago") {
        const preferenceResult = await crearPreferenciaPago(pedidoId, {
          ...pedido,
          numeroPedido: result.numeroPedido,
          totalFinal: pedidoData.totalFinal,
        });

        if (!preferenceResult.success) {
          throw new Error("Error al crear preferencia de pago");
        }

        sessionStorage.setItem("ultimoPedidoId", pedidoId);
        sessionStorage.setItem("ultimoNumeroPedido", result.numeroPedido);

        window.location.href = preferenceResult.sandboxInitPoint;
        return;
      }

      // SI ES EFECTIVO: Continuar normalmente
      setPedidoCreado({
        id: pedidoId,
        numeroPedido: result.numeroPedido,
      });

      // Limpiar sessionStorage
      sessionStorage.removeItem("carrito");
      sessionStorage.removeItem("pedidoData");
    } catch (error) {
      console.error("Error al crear pedido:", error);
      alert(
        "Hubo un error al procesar tu pedido. Por favor intenta nuevamente."
      );
      setConfirmando(false);
    }
  };

  const handleVolverInicio = () => {
    router.push("/seleccionar-animal");
  };

  const handleVerPedidos = () => {
    router.push("/mis-pedidos");
  };

  if (!pedidoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  // Pantalla de éxito
  if (pedidoCreado) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-primary mb-4">
                ¡Pedido Confirmado!
              </h1>
              <p className="text-gray-600 mb-6">Tu número de pedido es:</p>
              <div className="bg-blue-50 border-2 border-secondary rounded-lg p-4 mb-6">
                <p className="text-3xl font-bold text-secondary">
                  #{pedidoCreado.numeroPedido}
                </p>
              </div>
              <div className="text-sm text-gray-600 mb-6 space-y-2">
                <p>📱 Te enviaremos notificaciones a tu WhatsApp</p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleVerPedidos}>Ver mis pedidos</Button>
                <Button onClick={handleVolverInicio} variant="secondary">
                  Hacer otro pedido
                </Button>
              </div>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Pantalla de confirmación
  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-md mx-auto pt-8">
            <button
              onClick={() => router.back()}
              className="text-secondary mb-4 hover:underline"
              disabled={confirmando}
            >
              ← Volver a entrega
            </button>

            <Card className="mb-6">
              <h2 className="text-xl font-bold text-primary mb-4">
                Confirmación de Pedido
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Revisa tu pedido antes de confirmar:
              </p>
            </Card>

            {/* Detalle de cada vianda */}
            <Card className="mb-4">
              <h3 className="font-bold text-primary mb-3">
                Detalle de Viandas
              </h3>
              <div className="space-y-4">
                {pedidoData.viandas.map((vianda, index) => {
                  const icono = vianda.mascotaTipo === "perro" ? "🐕" : "🐱";
                  return (
                    <div key={index} className="pb-4 border-b last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{icono}</span>
                        <div>
                          <p className="font-bold text-primary">
                            {vianda.mascotaNombre}
                          </p>
                          <p className="text-sm text-gray-600">
                            {vianda.cantidadViandas} viandas × $
                            {vianda.precioUnitario.toLocaleString()}
                          </p>
                          {vianda.tipoCoccion && (
                            <p className="text-xs text-secondary font-medium">
                              {vianda.tipoCoccion === "cruda"
                                ? "🥩 Cruda"
                                : "🍲 Cocida"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-10 text-xs text-gray-600">
                        <p className="mb-1">Ingredientes por vianda:</p>
                        <ul className="space-y-1">
                          {vianda.ingredientes.map((ing, i) => (
                            <li key={i}>
                              • {ing.nombre}: {ing.gramos}g
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="ml-10 mt-2 text-sm font-medium text-primary">
                        Subtotal: ${vianda.subtotal.toLocaleString()}
                      </div>
                      </div>
                );
              })}
            </div>

            {/* Mostrar notas si existen */}
            {pedidoData.viandas.some(v => v.notas) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  📝 Observaciones de producción:
                </p>
                {pedidoData.viandas.map((vianda, index) => (
                  vianda.notas && (
                    <div key={index} className="mb-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                      <p className="text-xs font-medium text-primary">
                        {vianda.mascotaNombre}:
                      </p>
                      <p className="text-xs text-gray-700">
                        {vianda.notas}
                      </p>
                    </div>
                  )
                ))}
              </div>
            )}
          </Card>

            <Card className="mb-4">
              <h3 className="font-bold text-primary mb-3">Método de Pago</h3>
              <p className="text-sm">
                {pedidoData.metodoPago === "efectivo"
                  ? "💵 Efectivo"
                  : "💳 MercadoPago"}
                {pedidoData.metodoPago === "efectivo" &&
                  pedidoData.descuentoEfectivo > 0 && (
                    <span className="text-green-600 ml-2">
                      (descuento aplicado)
                    </span>
                  )}
              </p>
            </Card>

            <Card className="mb-4">
              <h3 className="font-bold text-primary mb-3">Entrega</h3>
              <div className="text-sm space-y-2">
                <p>
                  <span className="text-gray-600">Tipo:</span>{" "}
                  <span className="font-medium">
                    {pedidoData.entrega.tipo === "retiro"
                      ? "🏪 Retiro en local"
                      : "🚚 Envío a domicilio"}
                  </span>
                </p>
                <p>
                  <span className="text-gray-600">Dirección:</span>{" "}
                  <span className="font-medium">
                    {pedidoData.entrega.direccion}
                  </span>
                </p>
                {pedidoData.entrega.referencia && (
                  <p>
                    <span className="text-gray-600">Referencia:</span>{" "}
                    <span className="font-medium">
                      {pedidoData.entrega.referencia}
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-gray-600">Fecha:</span>{" "}
                  <span className="font-medium">
                    {formatearFecha(pedidoData.entrega.fecha)}
                  </span>
                </p>
                {pedidoData.entrega.franjaHoraria && (
                  <p>
                    <span className="text-gray-600">Horario:</span>{" "}
                    <span className="font-medium">
                      {pedidoData.entrega.franjaHoraria}
                    </span>
                  </p>
                )}
                {pedidoData.entrega.tipo === "envio" &&
                  pedidoData.entrega.zonaInfo && (
                    <p>
                      <span className="text-gray-600">Zona:</span>{" "}
                      <span className="font-medium">
                        {pedidoData.entrega.zonaInfo.nombre}
                      </span>
                    </p>
                  )}
              </div>
            </Card>

            <Card className="mb-4 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-primary mb-3">Resumen de Pago</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal viandas</span>
                  <span className="font-medium">
                    ${pedidoData.subtotalPedido.toLocaleString()}
                  </span>
                </div>

                {pedidoData.descuentoCupones > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Cupones aplicados</span>
                    <span className="font-medium">
                      -${pedidoData.descuentoCupones.toLocaleString()}
                    </span>
                  </div>
                )}

                {pedidoData.descuentoEfectivo > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento efectivo</span>
                    <span className="font-medium">
                      -${pedidoData.descuentoEfectivo.toLocaleString()}
                    </span>
                  </div>
                )}

                {pedidoData.entrega.tipo === "envio" && (
                  <div className="flex justify-between">
                    <span>Envío</span>
                    <span className="font-medium">
                      {pedidoData.costoEnvio === 0
                        ? "GRATIS"
                        : `+$${pedidoData.costoEnvio.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-blue-300 mt-4 pt-4">
                <div className="flex justify-between font-bold text-primary text-lg">
                  <span>TOTAL A PAGAR</span>
                  <span>${pedidoData.totalFinal.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Importante</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>
                  • Preparación: mínima 7 días hábiles desde la confirmación del
                  pedido
                </li>
                <li>• Te notificaremos por WhatsApp cada cambio</li>
                {pedidoData.metodoPago === "efectivo" && (
                  <li>• Pago en efectivo al recibir el pedido</li>
                )}
              </ul>
            </Card>

            <div className="space-y-3 max-w-md mx-auto">
              <Button
                onClick={() => router.back()}
                variant="secondary"
                disabled={confirmando}
              >
                ← Modificar
              </Button>
              <Button onClick={handleConfirmarPedido} disabled={confirmando}>
                {confirmando ? "Procesando..." : "🎉 CONFIRMAR PEDIDO"}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
