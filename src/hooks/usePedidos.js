import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getPedidos } from '../lib/firestore';

export const usePedidos = (filtroEstado = null, soloDelUsuario = true) => {
  const { user, userData } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setPedidos([]);
      return;
    }

    const cargarPedidos = async () => {
      try {
        // Solo mostrar "Cargando..." en la primera carga
        if (!ultimaActualizacion) {
          setLoading(true);
        }
        
        setError(null);
        
        const filtros = {};

        // Si soloDelUsuario es true Y no es admin, filtrar por usuario
        // Si es admin y soloDelUsuario es false, traer TODOS los pedidos
        if (soloDelUsuario && userData?.rol !== 'admin') {
          filtros.usuarioId = user.uid;
        }

        if (filtroEstado && filtroEstado !== 'todos') {
          filtros.estado = filtroEstado;
        }

        console.log('🔄 Actualizando pedidos...');

        const resultado = await getPedidos(filtros);
        
        if (!resultado || typeof resultado !== 'object') {
          throw new Error('Respuesta inválida del servidor');
        }

        if (resultado.success && Array.isArray(resultado.pedidos)) {
          const pedidosOrdenados = resultado.pedidos.sort((a, b) => {
            const fechaA = a.createdAt?.seconds || 0;
            const fechaB = b.createdAt?.seconds || 0;
            return fechaB - fechaA;
          });
          
          console.log(`✅ ${pedidosOrdenados.length} pedidos cargados`);
          setPedidos(pedidosOrdenados);
          setUltimaActualizacion(new Date());
        } else {
          const errorMsg = resultado.error || 'Error desconocido al cargar pedidos';
          setError(errorMsg);
          setPedidos([]);
        }
      } catch (err) {
        console.error('Error en usePedidos:', err);
        setError(err.message || 'Error al cargar pedidos');
        setPedidos([]);
      } finally {
        setLoading(false);
      }
    };

    // Carga inicial
    cargarPedidos();

    // Polling cada 60 segundos (60000 ms)
    const intervalo = setInterval(() => {
      console.log('⏰ Auto-actualización de pedidos (cada 60s)');
      cargarPedidos();
    }, 60000);

    // Limpiar intervalo al desmontar
    return () => {
      console.log('🛑 Deteniendo auto-actualización de pedidos');
      clearInterval(intervalo);
    };
  }, [user, userData, filtroEstado, soloDelUsuario]);

  return { pedidos, loading, error, ultimaActualizacion };
};