import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracion } from "../hooks/useConfiguracion";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from '../components/layout/Layout';

export default function Pago() {
  const router = useRouter();
  const { user } = useAuth();
  const { configuracion, loading: configLoading } = useConfiguracion();
  const [pedidoData, setPedidoData] = useState(null);
  const [metodoPago, setMetodoPago] = useState("");

  useEffect(() => {
    const data = sessionStorage.getItem("pedidoData");
    if (!data) {
      router.push("/carrito");
      return;
    }
    setPedidoData(JSON.parse(data));
  }, [router]);

  const calcularDescuentoEfectivo = () => {
    if (
      !configuracion?.cupones?.descuentoEfectivoPorcentaje ||
      metodoPago !== "efectivo"
    ) {
      return 0;
    }

    const subtotal =
      pedidoData.subtotalPedido - (pedidoData.descuentoCupones || 0);
    return (subtotal * configuracion.cupones.descuentoEfectivoPorcentaje) / 100;
  };

  const calcularTotal = () => {
    if (!pedidoData) return 0;

    let total = pedidoData.subtotalPedido;

    // Restar descuentos de cupones
    if (pedidoData.descuentoCupones) {
      total -= pedidoData.descuentoCupones;
    }

    // Restar descuento por efectivo si aplica
    if (metodoPago === "efectivo") {
      total -= calcularDescuentoEfectivo();
    }

    return total;
  };

  const handleContinuar = () => {
    if (!metodoPago) {
      alert("Por favor selecciona un método de pago");
      return;
    }

    const datosActualizados = {
      ...pedidoData,
      metodoPago,
      descuentoEfectivo: calcularDescuentoEfectivo(),
      totalConDescuentos: calcularTotal(),
    };

    sessionStorage.setItem("pedidoData", JSON.stringify(datosActualizados));
    router.push("/entrega");
  };

  if (!pedidoData || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <button
            onClick={() => router.back()}
            className="text-secondary mb-4 hover:underline"
          >
            ← Volver a cupones
          </button>

          {/* Resumen de viandas */}
          <Card className="mb-4">
            <h3 className="font-bold text-primary mb-3">Viandas en tu pedido:</h3>
            <div className="space-y-2">
              {pedidoData.viandas.map((vianda, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {vianda.mascotaTipo === 'perro' ? '🐕' : '🐱'} {vianda.mascotaNombre} ({vianda.cantidadViandas})
                  </span>
                  <span className="font-medium">
                    ${vianda.subtotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mb-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              Método de Pago
            </h2>

            <p className="text-sm text-gray-600 mb-4">
              Selecciona cómo deseas pagar:
            </p>

            <div className="space-y-4">
              {/* Opción Efectivo */}
              <div
                onClick={() => setMetodoPago("efectivo")}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  metodoPago === "efectivo"
                    ? "border-secondary bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    checked={metodoPago === "efectivo"}
                    onChange={() => setMetodoPago("efectivo")}
                    className="mr-3 w-5 h-5"
                  />
                  <span className="text-lg font-bold text-primary">
                    💵 Efectivo
                  </span>
                </div>

                {configuracion?.cupones?.descuentoEfectivoPorcentaje > 0 && (
                  <div className="ml-8">
                    <p className="text-sm text-green-600 font-medium">
                      ✅ Descuento del{" "}
                      {configuracion.cupones.descuentoEfectivoPorcentaje}%
                      aplicado
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Pagas al recibir tu pedido
                    </p>
                  </div>
                )}
              </div>

              {/* Opción MercadoPago */}
              <div
                onClick={() => setMetodoPago("mercadopago")}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  metodoPago === "mercadopago"
                    ? "border-secondary bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    checked={metodoPago === "mercadopago"}
                    onChange={() => setMetodoPago("mercadopago")}
                    className="mr-3 w-5 h-5"
                  />
                  <span className="text-lg font-bold text-primary">
                    💳 MercadoPago
                  </span>
                </div>

                <div className="ml-8">
                  <p className="text-xs text-gray-600 mt-1">
                    🔒 Pago procesado de forma segura
                  </p>
                  <p className="text-xs text-gray-600">
                    💳 Tarjetas de crédito, débito, y más
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mb-6 bg-blue-50 border-blue-200">
            <h3 className="font-bold text-primary mb-4">Resumen del Pedido</h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">
                  ${pedidoData.subtotalPedido.toLocaleString()}
                </span>
              </div>

              {pedidoData.descuentoCupones > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupones aplicados</span>
                  <span className="font-medium">
                    -${pedidoData.descuentoCupones.toLocaleString()}
                  </span>
                </div>
              )}

              {metodoPago === "efectivo" && calcularDescuentoEfectivo() > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Descuento efectivo (
                    {configuracion.cupones.descuentoEfectivoPorcentaje}%)
                  </span>
                  <span className="font-medium">
                    -${calcularDescuentoEfectivo().toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-blue-300 pt-4">
              <div className="flex justify-between font-bold text-primary text-lg">
                <span>TOTAL A PAGAR</span>
                <span>${calcularTotal().toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-3 max-w-md mx-auto">
            <Button onClick={() => router.back()} variant="secondary">
              ← Volver
            </Button>
            <Button onClick={handleContinuar} disabled={!metodoPago}>
              Continuar a entrega →
            </Button>
          </div>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}