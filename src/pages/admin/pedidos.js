import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePedidos } from '../../hooks/usePedidos';
import { updateEstadoPedido } from '../../lib/firestore';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Layout from "../../components/layout/Layout";

export default function AdminPedidos() {
  const { userData } = useAuth();
  const { pedidos, loading, ultimaActualizacion } = usePedidos(null, false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const estados = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'preparacion', label: 'En Preparación' },
    { value: 'listo', label: 'Listo' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const pedidosFiltrados = pedidos.filter(pedido => {
    const cumpleFiltroEstado = filtroEstado === 'todos' || pedido.estado === filtroEstado;
    const cumpleBusqueda = 
      pedido.numeroPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.usuario?.email?.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleFiltroEstado && cumpleBusqueda;
  });

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
  
      // Si se cancela el pedido, restaurar stock automáticamente
      if (nuevoEstado === 'cancelado') {
        const pedido = pedidos.find(p => p.id === pedidoId);
        
        if (!pedido) {
          alert('Error: Pedido no encontrado');
          return;
        }
  
        // Verificar si ya tiene stock restaurado
        if (pedido.stockRestaurado) {
          alert('Este pedido ya tiene el stock restaurado.\nSolo se actualizará el estado.');
          await actualizarEstadoSinStock(pedidoId, nuevoEstado);
          return;
        }
  
        console.log('🔄 Iniciando restauración automática de stock...');
  
        // Restaurar stock automáticamente usando Cloud Function
        try {
          const functions = getFunctions();
          const restaurarStock = httpsCallable(functions, 'restaurarStockPedido');
          
          console.log('📞 Llamando a restaurarStockPedido...');
          const resultado = await restaurarStock({ pedidoId });
          
          console.log('📦 Respuesta de restaurarStock:', resultado.data);
          
          if (resultado.data.success) {
            console.log('✅ Stock restaurado:', resultado.data.ingredientes);
            
            // Cambiar el estado después de restaurar
            await actualizarEstadoSinStock(pedidoId, nuevoEstado);
            
            alert(
              `✅ Pedido cancelado y stock restaurado\n\n` +
              `${resultado.data.ingredientes.length} ingredientes devueltos al inventario`
            );
          } else {
            throw new Error(resultado.data.mensaje || 'Error desconocido');
          }
        } catch (error) {
          console.error('❌ Error restaurando stock:', error);
          
          // Preguntar si quiere cancelar de todas formas
          const confirmarSinStock = window.confirm(
            `⚠️ Error al restaurar stock:\n${error.message}\n\n` +
            `¿Deseas cancelar el pedido de todas formas SIN restaurar el stock?`
          );
          
          if (confirmarSinStock) {
            await actualizarEstadoSinStock(pedidoId, nuevoEstado);
            alert('⚠️ Pedido cancelado pero el stock NO fue restaurado');
          }
        }
      } else {
        // Para otros estados, cambiar normalmente
        await actualizarEstadoSinStock(pedidoId, nuevoEstado);
      }
    } catch (error) {
      console.error('Error en handleCambiarEstado:', error);
      alert('Error al cambiar estado del pedido: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };
  
  // Función auxiliar para actualizar estado sin tocar stock
  const actualizarEstadoSinStock = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
      
      const functions = getFunctions();
      const cambiarEstado = httpsCallable(functions, 'cambiarEstadoPedido');
      
      const resultado = await cambiarEstado({ pedidoId, nuevoEstado });
      
      if (resultado.data.success) {
        alert('✅ Estado actualizado correctamente');
        // Recargar pedidos
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

  const getEstadoColor = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
      listo: 'bg-green-100 text-green-800 border-green-300',
      entregado: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelado: 'bg-red-100 text-red-800 border-red-300'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <StatCard
              title="Todos"
              value={pedidos.length}
              color="bg-gray-100"
            />
            <StatCard
              title="Pendientes"
              value={pedidos.filter(p => p.estado === 'pendiente').length}
              color="bg-yellow-100"
            />
            <StatCard
              title="En Preparación"
              value={pedidos.filter(p => p.estado === 'preparacion').length}
              color="bg-blue-100"
            />
            <StatCard
              title="Listos"
              value={pedidos.filter(p => p.estado === 'listo').length}
              color="bg-green-100"
            />
            <StatCard
              title="En Camino"
              value={pedidos.filter(p => p.estado === 'en_camino').length}
              color="bg-orange-100"
            />
            <StatCard
              title="Entregados"
              value={pedidos.filter(p => p.estado === 'entregado').length}
              color="bg-gray-100"
            />
          </div>

          {/* Lista de pedidos */}
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No hay pedidos que mostrar
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map(pedido => (
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
                        {pedido.usuario?.nombre} - {pedido.usuario?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatearFecha(pedido.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">
                        ${pedido.precios?.total?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pedido.cantidadViandas} viandas
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Pago</p>
                      <p className="text-sm font-medium">
                        {pedido.metodoPago === 'efectivo' ? 'Efectivo' : 'Naranja X'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Entrega</p>
                      <p className="text-sm font-medium">
                        {pedido.entrega?.tipo === 'retiro' ? 'Retiro en local' : 'Envío a domicilio'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pedido.entrega?.fecha}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Estado</p>
                      <select
                        value={pedido.estado}
                        onChange={(e) => handleCambiarEstado(pedido.id, e.target.value)}
                        className={`text-sm font-medium px-3 py-1 rounded border ${getEstadoColor(pedido.estado)}`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="preparacion">En Preparación</option>
                        <option value="listo">Listo</option>
                        <option value="en_camino">🚚 En Camino</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setPedidoSeleccionado(pedido)}
                    className="text-secondary text-sm hover:underline"
                  >
                    Ver detalle completo
                  </button>
                </div>
              ))}
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

const StatCard = ({ title, value, color }) => (
  <div className={`${color} rounded-lg p-4 border border-gray-200`}>
    <p className="text-sm text-gray-600">{title}</p>
    <p className="text-2xl font-bold text-primary">{value}</p>
  </div>
);

const ModalDetallePedido = ({ pedido, onCerrar }) => {
  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: 'Pendiente',
      preparacion: 'En Preparación',
      listo: 'Listo',
      en_camino: 'En Camino',
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
      en_camino: 'bg-orange-100 text-orange-800',
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
          {/* Estado del pedido - SECCIÓN ACTUALIZADA */}
          <div>
            <h3 className="font-bold text-primary mb-2">Estado</h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-block px-4 py-2 rounded-full font-bold ${getEstadoColorModal(pedido.estado)}`}>
                {getEstadoLabel(pedido.estado)}
              </span>
              
              {/* ⬇️ INDICADOR DE STOCK RESTAURADO ⬇️ */}
              {pedido.stockRestaurado && (
                <span className="inline-block px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-300">
                  ✅ Stock restaurado
                </span>
              )}
              {/* ⬆️ FIN INDICADOR ⬆️ */}
            </div>
            {pedido.stockRestaurado && pedido.fechaRestauracion && (
              <p className="text-xs text-gray-600 mt-2">
                Fecha de restauración: {new Date(pedido.fechaRestauracion.seconds * 1000).toLocaleString('es-AR')}
              </p>
            )}
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

          {/* Viandas */}
          <div>
            <h3 className="font-bold text-primary mb-2">Detalle de Viandas</h3>
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
                    <div className="text-xs text-gray-600 ml-10">
                      <p className="mb-1 font-medium">Ingredientes por vianda:</p>
                      <ul className="space-y-1">
                        {vianda.ingredientes?.map((ing, i) => (
                          <li key={i}>• {ing.nombre}: {ing.gramos}g</li>
                        ))}
                      </ul>
                      </div>
                    <div className="ml-10 mt-2 text-sm font-medium text-primary">
                      Subtotal: ${vianda.subtotal?.toLocaleString()}
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
              <p><span className="font-medium">Dirección:</span> {pedido.entrega?.direccion}</p>
              {pedido.entrega?.referencia && (
                <p><span className="font-medium">Referencia:</span> {pedido.entrega.referencia}</p>
              )}
              <p><span className="font-medium">Fecha:</span> {pedido.entrega?.fecha}</p>
              {pedido.entrega?.franjaHoraria && (
                <p><span className="font-medium">Horario:</span> {pedido.entrega.franjaHoraria}</p>
              )}
              {pedido.entrega?.zona && (
                <p><span className="font-medium">Zona:</span> {pedido.entrega.zona === 'dentro' ? 'Dentro de circunvalación' : 'Fuera de circunvalación'}</p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <h3 className="font-bold text-primary mb-2">Desglose de Precios</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal viandas</span>
                <span className="font-medium">${pedido.precios?.subtotalViandas?.toLocaleString()}</span>
              </div>
              {pedido.precios?.descuentoCupones > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento cupones</span>
                  <span className="font-medium">-${pedido.precios.descuentoCupones.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.descuentoEfectivo > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento efectivo</span>
                  <span className="font-medium">-${pedido.precios.descuentoEfectivo.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-medium">+${pedido.precios.costoEnvio.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-primary text-lg">
                <span>TOTAL</span>
                <span>${pedido.precios?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <h3 className="font-bold text-primary mb-2">Método de Pago</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium">
                {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '💳 MercadoPago'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Estado de pago: <span className="capitalize">{pedido.estadoPago}</span>
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