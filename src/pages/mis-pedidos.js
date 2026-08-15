import { useState } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { usePedidos } from "../hooks/usePedidos";
import { useRepetirPedido } from "../hooks/useRepetirPedido";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";
import FiltroEstadoPedidos from "../components/pedidos/FiltroEstadoPedidos";
import PedidoCard from "../components/pedidos/PedidoCard";
import ModalDetallePedido from "../components/pedidos/ModalDetallePedido";
import { estadoConfig } from "../utils/estadoPedidoConfig";

export default function MisPedidos() {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const { pedidos, loading, error } = usePedidos(filtroEstado);
  const { repetirPedido } = useRepetirPedido();

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
              <p className="text-red-600 mb-4">Error al cargar pedidos: {error}</p>
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
            <div className="mb-6">
              <button
                onClick={() => router.push("/seleccionar-animal")}
                className="text-secondary hover:underline mb-4"
              >
                ← Volver al inicio
              </button>
              <h1 className="text-3xl font-suez text-primary">Mis Pedidos 📋</h1>
            </div>

            <FiltroEstadoPedidos
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
            />

            {pedidos.length === 0 ? (
              <Card className="text-center p-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-primary mb-2">No hay pedidos</h3>
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
                {pedidos.map((pedido) => (
                  <PedidoCard
                    key={pedido.id}
                    pedido={pedido}
                    onVerDetalle={setPedidoSeleccionado}
                    onRepetir={repetirPedido}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <ModalDetallePedido
          pedido={pedidoSeleccionado}
          onCerrar={() => setPedidoSeleccionado(null)}
          onRepetir={repetirPedido}
        />
      </Layout>
    </ProtectedRoute>
  );
}
