import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePedidos } from '../../hooks/usePedidos';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Layout from "../../components/layout/Layout";

export default function LogisticaPedidos() {
  const { userData } = useAuth();
  const { pedidos, loading, ultimaActualizacion } = usePedidos(null, false);
  const [busqueda, setBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const pedidosFiltrados = pedidos.filter(pedido => {
    
    if (pedido.estado !== 'listo' && pedido.estado !== 'en_camino') {
      return false;
    }

    const cumpleBusqueda = 
      pedido.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.entrega?.direccion?.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleBusqueda;
  });

  const handleMarcarEntregado = async (pedidoId) => {
    if (!window.confirm('¿Confirmar que el pedido fue ENTREGADO?')) {
      return;
    }

    try {
      setProcesando(true);
      
      const functions = getFunctions();
      const cambiarEstado = httpsCallable(functions, 'cambiarEstadoPedido');
      
      const resultado = await cambiarEstado({ 
        pedidoId, 
        nuevoEstado: 'entregado' 
      });
      
      if (resultado.data.success) {
        alert('✅ Pedido marcado como entregado correctamente');
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

  const handleSalirAEntregar = async (pedidoId) => {
    if (!window.confirm('¿Salir a entregar este pedido?')) {
      return;
    }

    try {
      setProcesando(true);
      
      const functions = getFunctions();
      const cambiarEstado = httpsCallable(functions, 'cambiarEstadoPedido');
      
      const resultado = await cambiarEstado({ 
        pedidoId, 
        nuevoEstado: 'en_camino' 
      });
      
      if (resultado.data.success) {
        alert('✅ Pedido marcado como "En Camino"');
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

// Separar por estado (solo envíos a domicilio)
const pedidosListos = pedidosFiltrados.filter(p => 
  p.estado === 'listo' && p.entrega?.tipo === 'envio'
);
const pedidosEnCamino = pedidosFiltrados.filter(p => 
  p.estado === 'en_camino' && p.entrega?.tipo === 'envio'
);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['logistica']}>
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-8">Cargando pedidos...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['logistica']}>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">🚚 Panel de Logística</h1>
          
          {/* Debug info */}
          {ultimaActualizacion && (
            <div className="mb-4 text-xs text-gray-500">
              Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')} 
              | Pedidos listos: {pedidos.length}
            </div>
          )}

          {/* Búsqueda */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Buscar pedido
            </label>
            <input
              type="text"
              placeholder="Número de pedido, cliente o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatCard
              title="Listos para Salir"
              value={pedidosListos.length}
              color="bg-green-100"
              icon="📦"
            />
            <StatCard
              title="En Camino"
              value={pedidosEnCamino.length}
              color="bg-orange-100"
              icon="🚚"
            />
          </div>

          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              ✅ No hay pedidos para entregar en este momento
            </div>
          ) : (
            <>
              {/* Pedidos LISTOS para salir */}
              {pedidosListos.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    📦 Listos para Salir ({pedidosListos.length})
                  </h2>
                  <div className="space-y-4">
                    {pedidosListos.map(pedido => (
                      <PedidoCard
                        key={pedido.id}
                        pedido={pedido}
                        onSalirAEntregar={handleSalirAEntregar}
                        onVerDetalle={setPedidoSeleccionado}
                        procesando={procesando}
                        formatearFecha={formatearFecha}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pedidos EN CAMINO */}
              {pedidosEnCamino.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    🚚 En Camino ({pedidosEnCamino.length})
                  </h2>
                  <div className="space-y-4">
                    {pedidosEnCamino.map(pedido => (
                      <PedidoCard
                        key={pedido.id}
                        pedido={pedido}
                        onMarcarEntregado={handleMarcarEntregado}
                        onVerDetalle={setPedidoSeleccionado}
                        procesando={procesando}
                        formatearFecha={formatearFecha}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
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

const PedidoCard = ({ pedido, onSalirAEntregar, onMarcarEntregado, onVerDetalle, procesando, formatearFecha }) => {
  const esListo = pedido.estado === 'listo';
  const esEnCamino = pedido.estado === 'en_camino';

  return (
    <div className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-shadow ${
      esListo ? 'border-green-300' : 'border-orange-300'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-primary text-lg">
            #{pedido.numeroPedido}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            👤 {pedido.usuario?.nombre}
          </p>
          <p className="text-xs text-gray-500">
            🕐 Creado: {formatearFecha(pedido.createdAt)}
          </p>
        </div>
        <div className="text-right">
          {esListo && (
            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-sm border border-green-300">
              ✅ Listo
            </span>
          )}
          {esEnCamino && (
            <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-sm border border-orange-300">
              🚚 En Camino
            </span>
          )}
        </div>
      </div>

      {/* INFO DESTACADA DE ENTREGA */}
      <div className={`border-2 rounded-lg p-4 mb-3 ${
        esListo ? 'bg-yellow-50 border-yellow-300' : 'bg-orange-50 border-orange-300'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 font-medium mb-1">📍 DIRECCIÓN</p>
            <p className="text-sm font-bold text-primary">
              {pedido.entrega?.direccion}
            </p>
            {pedido.entrega?.referencia && (
              <p className="text-xs text-gray-600 mt-1">
                ℹ️ {pedido.entrega.referencia}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-600 font-medium mb-1">📞 TELÉFONO</p>
            <p className="text-sm font-bold text-primary">
              {pedido.usuario?.telefono || 'No disponible'}
            </p>
            
            <p className="text-xs text-gray-600 font-medium mt-2">📅 FECHA DE ENTREGA</p>
            <p className="text-sm font-bold text-primary">
              {pedido.entrega?.fecha}
            </p>
            {pedido.entrega?.franjaHoraria && (
              <p className="text-xs text-gray-600">
                🕐 {pedido.entrega.franjaHoraria}
              </p>
            )}
          </div>
        </div>

        {pedido.entrega?.zonaInfo && (
          <div className={`mt-2 pt-2 border-t ${
            esListo ? 'border-yellow-300' : 'border-orange-300'
          }`}>
            <p className="text-xs">
              <span className="font-medium">Zona:</span> {pedido.entrega.zonaInfo.nombre}
            </p>
          </div>
        )}
      </div>

      {/* INFO ADICIONAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
        <div>
          <p className="text-xs text-gray-600">Viandas</p>
          <p className="font-medium">
            📦 {pedido.viandas?.reduce((sum, v) => sum + v.cantidadViandas, 0) || pedido.cantidadViandas} unidades
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total</p>
          <p className="font-medium text-primary">
            ${pedido.precios?.total?.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Pago</p>
          <p className="font-medium">
            {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '💳 MercadoPago'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Distancia</p>
          <p className="font-medium">
            {pedido.entrega?.distanciaKm ? `${pedido.entrega.distanciaKm.toFixed(1)} km` : 'N/A'}
          </p>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onVerDetalle(pedido)}
          className="text-secondary text-sm hover:underline"
        >
          📄 Ver detalle completo
        </button>

        {esListo && onSalirAEntregar && (
          <button
            onClick={() => onSalirAEntregar(pedido.id)}
            disabled={procesando}
            className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            🚚 Salir a Entregar
          </button>
        )}

        {esEnCamino && onMarcarEntregado && (
          <button
            onClick={() => onMarcarEntregado(pedido.id)}
            disabled={procesando}
            className="ml-auto bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            ✅ Marcar como Entregado
          </button>
        )}
      </div>
    </div>
  );
};

const ModalDetallePedido = ({ pedido, onCerrar }) => {
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
          {/* Estado */}
          <div>
            <h3 className="font-bold text-primary mb-2">Estado</h3>
            <span className="inline-block px-4 py-2 rounded-full font-bold bg-green-100 text-green-800">
              ✅ Listo para entregar
            </span>
          </div>

          {/* Información del cliente */}
          <div>
            <h3 className="font-bold text-primary mb-2">Cliente</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Nombre:</span> {pedido.usuario?.nombre}</p>
              <p><span className="font-medium">Email:</span> {pedido.usuario?.email}</p>
              <p><span className="font-medium">Teléfono:</span> {pedido.usuario?.telefono || 'N/A'}</p>
            </div>
          </div>

          {/* Entrega - DESTACADO */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <h3 className="font-bold text-primary mb-3 text-lg">📍 Información de Entrega</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Tipo:</span>{' '}
                {pedido.entrega?.tipo === 'retiro' ? '🏪 Retiro en local' : '🚚 Envío a domicilio'}
              </p>
              <p>
                <span className="font-medium">Dirección:</span>{' '}
                <span className="font-bold text-primary">{pedido.entrega?.direccion}</span>
              </p>
              {pedido.entrega?.referencia && (
                <p>
                  <span className="font-medium">Referencia:</span> {pedido.entrega.referencia}
                </p>
              )}
              <p>
                <span className="font-medium">Fecha:</span>{' '}
                <span className="font-bold text-primary">{pedido.entrega?.fecha}</span>
              </p>
              {pedido.entrega?.franjaHoraria && (
                <p>
                  <span className="font-medium">Horario:</span> {pedido.entrega.franjaHoraria}
                </p>
              )}
              {pedido.entrega?.zona && (
                <p>
                  <span className="font-medium">Zona:</span>{' '}
                  {pedido.entrega.zona === 'dentro' ? 'Dentro de circunvalación' : 'Fuera de circunvalación'}
                </p>
              )}
            </div>
          </div>

          {/* Viandas */}
          <div>
            <h3 className="font-bold text-primary mb-2">Detalle del Pedido</h3>
            {pedido.viandas && pedido.viandas.length > 0 ? (
              <div className="space-y-3">
                {pedido.viandas.map((vianda, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {vianda.mascotaTipo === 'perro' ? '🐕' : '🐱'}
                      </span>
                      <div>
                        <p className="font-bold">{vianda.mascotaNombre}</p>
                        <p className="text-sm text-gray-600">
                          {vianda.cantidadViandas} viandas × ${vianda.precioUnitario?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">
                  {pedido.cantidadViandas} viandas para {pedido.tipoMascota === 'perro' ? 'Perro 🐕' : 'Gato 🐱'}
                </p>
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div>
            <h3 className="font-bold text-primary mb-2">Método de Pago</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium">
                {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '💳 Naranja X'}
              </p>
              <p className="text-lg font-bold text-primary mt-2">
                Total: ${pedido.precios?.total?.toLocaleString()}
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