import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Crear preferencia de pago
export const crearPreferenciaPago = async (pedidoId, pedidoData) => {
  try {
    const crearPreferencia = httpsCallable(functions, 'crearPreferenciaMercadoPago');
    const result = await crearPreferencia({ pedidoId, pedidoData });
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