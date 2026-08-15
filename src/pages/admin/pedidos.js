import { useState } from 'react';
import { usePedidos } from '../../hooks/usePedidos';
import { useCambiarEstadoPedido } from '../../hooks/useCambiarEstadoPedido';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Layout from "../../components/layout/Layout";
import FiltrosPedidos from '../../components/admin/pedidos/FiltrosPedidos';
import EstadisticasPedidos from '../../components/admin/pedidos/EstadisticasPedidos';
import PedidoRow from '../../components/admin/pedidos/PedidoRow';
import ModalDetallePedidoAdmin from '../../components/admin/pedidos/ModalDetallePedidoAdmin';

export default function AdminPedidos() {
  const { pedidos, loading } = usePedidos(null, false);
  const { cambiarEstadoPedido } = useCambiarEstadoPedido(pedidos);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const pedidosFiltrados = pedidos.filter(pedido => {
    const cumpleFiltroEstado = filtroEstado === 'todos' || pedido.estado === filtroEstado;
    const cumpleBusqueda =
      pedido.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.email?.toLowerCase().includes(busqueda.toLowerCase());

    return cumpleFiltroEstado && cumpleBusqueda;
  });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <Layout>
          <div className="text-center py-8">Cargando pedidos...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div>
          <h1 className="text-3xl font-bold text-primary mb-8">Pedidos</h1>

          <FiltrosPedidos
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
          />

          <EstadisticasPedidos pedidos={pedidos} />

          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No hay pedidos que mostrar
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map(pedido => (
                <PedidoRow
                  key={pedido.id}
                  pedido={pedido}
                  onVerDetalle={setPedidoSeleccionado}
                  onCambiarEstado={cambiarEstadoPedido}
                />
              ))}
            </div>
          )}

          {pedidoSeleccionado && (
            <ModalDetallePedidoAdmin
              pedido={pedidoSeleccionado}
              onCerrar={() => setPedidoSeleccionado(null)}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
