import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePedidos } from '../../hooks/usePedidos';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Layout from "../../components/layout/Layout";

export default function ProduccionPedidos() {
  const { userData } = useAuth();
  const { pedidos, loading, ultimaActualizacion } = usePedidos(null, false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Solo estados relevantes para producción
  const estados = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'preparacion', label: 'En Preparación' },
    { value: 'listo', label: 'Listo' }
  ];

  const pedidosFiltrados = pedidos.filter(pedido => {
    // Filtrar solo pedidos en estados operativos (no cancelados ni entregados)
    const estadosValidos = ['pendiente', 'preparacion', 'listo'];
    if (!estadosValidos.includes(pedido.estado)) return false;

    const cumpleFiltroEstado = filtroEstado === 'todos' || pedido.estado === filtroEstado;
    const cumpleBusqueda = 
      pedido.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleFiltroEstado && cumpleBusqueda;
  });

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    if (!window.confirm(`¿Confirmar cambio de estado a "${getEstadoLabel(nuevoEstado)}"?`)) {
      return;
    }

    try {
      setProcesando(true);
      
      const functions = getFunctions();
      const cambiarEstado = httpsCallable(functions, 'cambiarEstadoPedido');
      
      const resultado = await cambiarEstado({ pedidoId, nuevoEstado });
      
      if (resultado.data.success) {
        alert('✅ Estado actualizado correctamente');
        window.location.reload();
      } else {
        alert('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: 'Pendiente',
      preparacion: 'En Preparación',
      listo: 'Listo'
    };
    return labels[estado] || estado;
  };

  const formatearFecha = (timestamp) => {
    if (!timestamp) return 'N/A';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
      listo: 'bg-green-100 text-green-800 border-green-300'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Determinar qué acción puede hacer según el estado actual
  const getAccionDisponible = (estado) => {
    if (estado === 'pendiente') {
      return { nuevoEstado: 'preparacion', label: '▶️ Pasar a Preparación', color: 'bg-blue-500 hover:bg-blue-600' };
    }
    if (estado === 'preparacion') {
      return { nuevoEstado: 'listo', label: '✅ Marcar como Listo', color: 'bg-green-500 hover:bg-green-600' };
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['produccion']}>
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-8">Cargando pedidos...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['produccion']}>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">📋 Panel de Producción</h1>
            {ultimaActualizacion && (
              <p className="text-xs text-gray-500">
                Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')}
              </p>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Filtrar por estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                >
                  {estados.map(estado => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Número de pedido o cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Pendientes"
              value={pedidos.filter(p => p.estado === 'pendiente').length}
              color="bg-yellow-100"
              icon="⏳"
            />
            <StatCard
              title="En Preparación"
              value={pedidos.filter(p => p.estado === 'preparacion').length}
              color="bg-blue-100"
              icon="👨‍🍳"
            />
            <StatCard
              title="Listos"
              value={pedidos.filter(p => p.estado === 'listo').length}
              color="bg-green-100"
              icon="✅"
            />
          </div>

          {/* Lista de pedidos */}
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No hay pedidos que mostrar
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map(pedido => {
                const accion = getAccionDisponible(pedido.estado);
                
                return (
                  <div
                    key={pedido.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-primary text-lg">
                          #{pedido.numeroPedido}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {pedido.usuario?.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatearFecha(pedido.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded border text-sm font-medium ${getEstadoColor(pedido.estado)}`}>
                          {getEstadoLabel(pedido.estado)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600">Viandas</p>
                        <p className="text-sm font-medium">
                          {pedido.viandas?.reduce((sum, v) => sum + v.cantidadViandas, 0) || pedido.cantidadViandas} unidades
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Entrega</p>
                        <p className="text-sm font-medium">
                          {pedido.entrega?.fecha}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pedido.entrega?.tipo === 'retiro' ? '🏪 Retiro' : '🚚 Envío'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Pago</p>
                        <p className="text-sm font-medium">
                          {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '💳 Naranja X'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Indicadores rápidos de cocción y notas */}
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {pedido.viandas?.some(v => v.tipoCoccion === 'cruda') && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 border border-red-300 rounded font-bold">
                          🥩 CONTIENE CRUDA
                        </span>
                      )}
                      {pedido.viandas?.some(v => v.tipoCoccion === 'cocida') && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded font-bold">
                          🍲 CONTIENE COCIDA
                        </span>
                      )}
                      {pedido.viandas?.some(v => v.notas) && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded font-bold">
                          ⚠️ TIENE OBSERVACIONES
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => setPedidoSeleccionado(pedido)}
                        className="text-secondary text-sm hover:underline"
                      >
                        📄 Ver detalle completo
                      </button>

                      {accion && (
                        <button
                          onClick={() => handleCambiarEstado(pedido.id, accion.nuevoEstado)}
                          disabled={procesando}
                          className={`ml-auto ${accion.color} text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium`}
                        >
                          {accion.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de detalle */}
          {pedidoSeleccionado && (
            <ModalDetallePedido
              pedido={pedidoSeleccionado}
              onCerrar={() => setPedidoSeleccionado(null)}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

const StatCard = ({ title, value, color, icon }) => (
  <div className={`${color} rounded-lg p-4 border border-gray-200`}>
    <p className="text-sm text-gray-600 mb-1">{icon} {title}</p>
    <p className="text-2xl font-bold text-primary">{value}</p>
  </div>
);

const ModalDetallePedido = ({ pedido, onCerrar }) => {
  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: 'Pendiente',
      preparacion: 'En Preparación',
      listo: 'Listo',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };
    return labels[estado] || estado;
  };

  const getEstadoColorModal = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      preparacion: 'bg-blue-100 text-blue-800',
      listo: 'bg-green-100 text-green-800',
      entregado: 'bg-gray-100 text-gray-800',
      cancelado: 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            Detalle del Pedido #{pedido.numeroPedido}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Estado del pedido */}
          <div>
            <h3 className="font-bold text-primary mb-2">Estado</h3>
            <span className={`inline-block px-4 py-2 rounded-full font-bold ${getEstadoColorModal(pedido.estado)}`}>
              {getEstadoLabel(pedido.estado)}
            </span>
          </div>

          {/* Información del cliente */}
          <div>
            <h3 className="font-bold text-primary mb-2">Cliente</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Nombre:</span> {pedido.usuario?.nombre}</p>
              <p><span className="font-medium">Teléfono:</span> {pedido.usuario?.telefono || 'N/A'}</p>
            </div>
          </div>

          {/* Detalle de Viandas con INGREDIENTES */}
          <div>
            <h3 className="font-bold text-primary mb-2">🍖 Detalle de Producción</h3>
            {pedido.viandas && pedido.viandas.length > 0 ? (
              <div className="space-y-3">
                {pedido.viandas.map((vianda, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-primary">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">
                        {vianda.mascotaTipo === 'perro' ? '🐕' : '🐱'}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{vianda.mascotaNombre}</p>
                        <p className="text-sm text-gray-600">
                          📦 {vianda.cantidadViandas} viandas
                        </p>
                        {vianda.tipoCoccion && (
                          <div className="mt-1">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                              vianda.tipoCoccion === 'cruda' 
                                ? 'bg-red-100 text-red-800 border-2 border-red-400' 
                                : 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                            }`}>
                              {vianda.tipoCoccion === 'cruda' ? '🥩 CRUDA' : '🍲 COCIDA'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <p className="font-bold text-sm mb-2 text-primary">Ingredientes por vianda:</p>
                      <ul className="space-y-1">
                        {vianda.ingredientes?.map((ing, i) => (
                          <li key={i} className="text-sm flex justify-between">
                            <span>• {ing.nombre}</span>
                            <span className="font-bold">{ing.gramos}g</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t mt-2 pt-2">
                        <p className="text-sm font-bold text-primary">
                          Total a preparar: {vianda.cantidadViandas} viandas
                        </p>
                      </div>
                    </div>
                    
                    {/* Notas/Observaciones del cliente - MUY VISIBLE */}
                    {vianda.notas && (
                      <div className="mt-3 bg-yellow-100 border-4 border-yellow-400 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">⚠️</span>
                          <div className="flex-1">
                            <p className="font-bold text-yellow-900 text-sm mb-1">
                              📝 OBSERVACIONES DEL CLIENTE:
                            </p>
                            <p className="text-sm text-yellow-900 font-medium">
                              {vianda.notas}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Tipo: {pedido.tipoMascota === 'perro' ? 'Perro 🐕' : 'Gato 🐱'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Cantidad: {pedido.cantidadViandas} viandas
                </p>
                <div className="space-y-2">
                  {pedido.ingredientes?.map((ing, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{ing.nombre}: {ing.gramos}g por vianda</span>
                      <span className="font-medium">
                        Total: {ing.gramos * pedido.cantidadViandas}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Entrega */}
          <div>
            <h3 className="font-bold text-primary mb-2">Entrega</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Tipo:</span> {pedido.entrega?.tipo === 'retiro' ? '🏪 Retiro en local' : '🚚 Envío a domicilio'}</p>
              <p><span className="font-medium">Fecha:</span> {pedido.entrega?.fecha}</p>
              {pedido.entrega?.franjaHoraria && (
                <p><span className="font-medium">Horario:</span> {pedido.entrega.franjaHoraria}</p>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <h3 className="font-bold text-primary mb-2">Método de Pago</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium">
                {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '💳 Naranja X'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <button
            onClick={onCerrar}
            className="w-full bg-secondary text-white px-6 py-3 rounded-lg hover:bg-primary transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};