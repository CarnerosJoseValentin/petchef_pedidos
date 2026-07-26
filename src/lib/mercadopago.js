import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Crear preferencia de pago.
// Ojo: solo se manda pedidoId. El precio NUNCA se manda desde acá — la Cloud
// Function lo recalcula leyendo el pedido ya persistido en Firestore contra
// los precios reales de /ingredientes y /cupones, así no se puede manipular
// el total pagado modificando el estado del cliente.
export const crearPreferenciaPago = async (pedidoId) => {
  try {
    const crearPreferencia = httpsCallable(functions, 'crearPreferenciaMercadoPago');
    const result = await crearPreferencia({ pedidoId });
    return result.data;
  } catch (error) {
    console.error('Error creando preferencia:', error);
    return { success: false, error: error.message };
  }
};

// Verificar estado del pago (opcional, para polling)
export const verificarEstadoPago = async (pedidoId) => {
  try {
    const verificar = httpsCallable(functions, 'verificarEstadoPago');
    const result = await verificar({ pedidoId });
    return result.data;
  } catch (error) {
    console.error('Error verificando pago:', error);
    return { success: false, error: error.message };
  }
};