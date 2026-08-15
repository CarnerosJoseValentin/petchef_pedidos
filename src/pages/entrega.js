import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { useEntregaForm } from "../hooks/useEntregaForm";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";
import ResumenViandas from "../components/entrega/ResumenViandas";
import OpcionRetiro from "../components/entrega/OpcionRetiro";
import OpcionEnvio from "../components/entrega/OpcionEnvio";
import SelectorFecha from "../components/entrega/SelectorFecha";
import ResumenPrecioEntrega from "../components/entrega/ResumenPrecioEntrega";

export default function Entrega() {
  const router = useRouter();
  const { userData } = useAuth();
  const { configuracion, loading: configLoading } = useConfiguracion();
  const {
    inputRef,
    pedidoData,
    tipoEntrega,
    setTipoEntrega,
    direccion,
    referencia,
    setReferencia,
    fecha,
    setFecha,
    fechaMinima,
    franjaHoraria,
    setFranjaHoraria,
    zonaInfo,
    distanciaKm,
    validandoDireccion,
    errorDireccion,
    setErrorDireccion,
    calleSinNumero,
    setCalleSinNumero,
    franjasHorarias,
    calcularCostoEnvio,
    calcularTotal,
    handleContinuar,
  } = useEntregaForm({ userData, configuracion });

  if (!pedidoData || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  const costoEnvio = calcularCostoEnvio();

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-md mx-auto pt-8">
            <button
              onClick={() => router.back()}
              className="text-secondary mb-4 hover:underline"
            >
              ← Volver al pago
            </button>

            <ResumenViandas viandas={pedidoData.viandas} />

            <Card className="mb-6">
              <h2 className="text-xl font-bold text-primary mb-4">Tipo de Entrega</h2>
              <p className="text-sm text-gray-600 mb-4">¿Cómo quieres recibir tu pedido?</p>

              <div className="space-y-4">
                <OpcionRetiro
                  seleccionado={tipoEntrega === "retiro"}
                  onSeleccionar={() => setTipoEntrega("retiro")}
                  configuracion={configuracion}
                />

                <OpcionEnvio
                  seleccionado={tipoEntrega === "envio"}
                  onSeleccionar={() => setTipoEntrega("envio")}
                  inputRef={inputRef}
                  validandoDireccion={validandoDireccion}
                  errorDireccion={errorDireccion}
                  direccion={direccion}
                  zonaInfo={zonaInfo}
                  distanciaKm={distanciaKm}
                  calleSinNumero={calleSinNumero}
                  setCalleSinNumero={setCalleSinNumero}
                  setErrorDireccion={setErrorDireccion}
                  referencia={referencia}
                  setReferencia={setReferencia}
                  franjaHoraria={franjaHoraria}
                  setFranjaHoraria={setFranjaHoraria}
                  franjasHorarias={franjasHorarias}
                  costoEnvio={costoEnvio}
                  envioGratisPorCupon={!!pedidoData.envioGratis}
                />
              </div>

              <SelectorFecha
                tipoEntrega={tipoEntrega}
                fecha={fecha}
                setFecha={setFecha}
                fechaMinima={fechaMinima}
                configuracion={configuracion}
              />
            </Card>

            <ResumenPrecioEntrega
              subtotal={pedidoData.totalConDescuentos}
              tipoEntrega={tipoEntrega}
              zonaInfo={zonaInfo}
              costoEnvio={costoEnvio}
              total={calcularTotal()}
            />

            <div className="space-y-3 max-w-md mx-auto">
              <Button onClick={() => router.back()} variant="secondary">
                ← Volver
              </Button>
              <Button onClick={handleContinuar}>Confirmar pedido →</Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
