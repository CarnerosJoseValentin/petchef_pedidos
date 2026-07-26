import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { getCuponPorCodigo } from "../lib/firestore";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

export default function Cupones() {
  const router = useRouter();
  const { user } = useAuth();
  const { configuracion, loading: configLoading } = useConfiguracion();
  const [pedidoData, setPedidoData] = useState(null);
  const [codigoCupon, setCodigoCupon] = useState("");
  const [cuponesAplicados, setCuponesAplicados] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem("pedidoData");
    if (!data) {
      router.push("/carrito");
      return;
    }
    setPedidoData(JSON.parse(data));
  }, [router]);

  const validarCupon = async (codigo) => {
    setLoading(true);
    setError("");

    const result = await getCuponPorCodigo(codigo);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return false;
    }

    const cupon = result.data;

    if (cupon.fechaVencimiento) {
      const fechaVenc = cupon.fechaVencimiento.toDate();
      if (fechaVenc < new Date()) {
        setError("Este cupón ha expirado");
        setLoading(false);
        return false;
      }
    }

    if (cupon.montoMinimo && pedidoData.subtotalPedido < cupon.montoMinimo) {
      setError(
        `Este cupón requiere un monto mínimo de $${cupon.montoMinimo.toLocaleString()}`
      );
      setLoading(false);
      return false;
    }

    if (cupon.usoMaximo && cupon.usoActual >= cupon.usoMaximo) {
      setError("Este cupón ha alcanzado su límite de usos");
      setLoading(false);
      return false;
    }

    if (cuponesAplicados.some((c) => c.codigo === cupon.codigo)) {
      setError("Este cupón ya está aplicado");
      setLoading(false);
      return false;
    }

    if (
      !configuracion?.cupones?.permitirAcumulables &&
      cuponesAplicados.length > 0
    ) {
      setError("No se pueden acumular cupones");
      setLoading(false);
      return false;
    }

    setLoading(false);
    return cupon;
  };

  const handleAplicarCupon = async () => {
    if (!codigoCupon.trim()) {
      setError("Ingresa un código de cupón");
      return;
    }

    const cupon = await validarCupon(codigoCupon);
    if (cupon) {
      setCuponesAplicados([...cuponesAplicados, cupon]);
      setCodigoCupon("");
      setError("");
    }
  };

  const handleEliminarCupon = (codigo) => {
    setCuponesAplicados(cuponesAplicados.filter((c) => c.codigo !== codigo));
  };

  const calcularDescuentos = () => {
    let totalDescuento = 0;

    cuponesAplicados.forEach((cupon) => {
      if (cupon.tipo === "porcentaje") {
        totalDescuento += (pedidoData.subtotalPedido * cupon.valor) / 100;
      } else if (cupon.tipo === "montoFijo") {
        totalDescuento += cupon.valor;
      }
    });

    return totalDescuento;
  };

  const tieneEnvioGratis = () => {
    return cuponesAplicados.some((c) => c.tipo === "envioGratis");
  };

  const calcularTotal = () => {
    if (!pedidoData) return 0;
    return pedidoData.subtotalPedido - calcularDescuentos();
  };

  const montoFaltanteEnvioGratis = () => {
    if (!configuracion?.cupones?.montoEnvioGratis) return 0;
    const faltante = configuracion.cupones.montoEnvioGratis - calcularTotal();
    return faltante > 0 ? faltante : 0;
  };

  const handleContinuar = () => {
    const datosActualizados = {
      ...pedidoData,
      cuponesAplicados: cuponesAplicados.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        tipo: c.tipo,
        valor: c.valor,
      })),
      descuentoCupones: calcularDescuentos(),
      envioGratis: tieneEnvioGratis(),
    };

    sessionStorage.setItem("pedidoData", JSON.stringify(datosActualizados));
    router.push("/pago");
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
              onClick={() => router.push("/carrito")}
              className="text-secondary mb-4 hover:underline"
            >
              ← Volver al carrito
            </button>

            {/* Resumen de viandas */}
            <Card className="mb-4">
              <h3 className="font-bold text-primary mb-3">
                Viandas en tu pedido:
              </h3>
              <div className="space-y-2">
                {pedidoData.viandas.map((vianda, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"}{" "}
                      {vianda.mascotaNombre} ({vianda.cantidadViandas})
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
                Cupones de Descuento
              </h2>

              {/* Input y botón con misma altura */}
              <div className="flex space-x-2 mb-4">
                <input
                  placeholder="Código de cupón"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <button
                  onClick={handleAplicarCupon}
                  disabled={loading}
                  className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? "Validando..." : "Aplicar"}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {cuponesAplicados.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-bold text-primary mb-2">
                    Cupones aplicados:
                  </h3>
                  <div className="space-y-2">
                    {cuponesAplicados.map((cupon, index) => (
                      <div
                        key={index}
                        className="bg-green-50 border border-green-200 p-3 rounded flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-green-800">
                            {cupon.codigo}
                          </p>
                          <p className="text-sm text-green-600">
                            {cupon.tipo === "porcentaje" &&
                              `${cupon.valor}% de descuento`}
                            {cupon.tipo === "montoFijo" &&
                              `$${cupon.valor.toLocaleString()} de descuento`}
                            {cupon.tipo === "envioGratis" && "Envío gratis"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEliminarCupon(cupon.codigo)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {configuracion?.cupones?.descuentoEfectivoPorcentaje > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="font-bold text-blue-800">
                    💵 Descuento por Efectivo
                  </p>
                  <p className="text-sm text-blue-600">
                    {configuracion.cupones.descuentoEfectivoPorcentaje}%
                    adicional al pagar en efectivo
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Se aplicará en el siguiente paso
                  </p>
                </div>
              )}
            </Card>

            <Card className="mb-6 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-primary mb-4">
                Resumen Actualizado
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal pedido</span>
                  <span className="font-medium">
                    ${pedidoData.subtotalPedido.toLocaleString()}
                  </span>
                </div>

                {calcularDescuentos() > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuentos aplicados</span>
                    <span className="font-medium">
                      -${calcularDescuentos().toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-blue-300 pt-4">
                <div className="flex justify-between font-bold text-primary text-lg">
                  <span>TOTAL</span>
                  <span>${calcularTotal().toLocaleString()}</span>
                </div>
              </div>

              {!tieneEnvioGratis() && montoFaltanteEnvioGratis() > 0 && (
                <div className="mt-4 text-sm text-center text-gray-600">
                  Agrega ${montoFaltanteEnvioGratis().toLocaleString()} más para
                  envío GRATIS
                </div>
              )}
            </Card>

            <div className="space-y-3 max-w-md mx-auto">
              <Button
                onClick={() => router.push("/carrito")}
                variant="secondary"
              >
                ← Volver al carrito
              </Button>
              <Button onClick={handleContinuar}>Continuar al pago →</Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
