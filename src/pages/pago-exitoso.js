import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';

export default function PagoExitoso() {
  const router = useRouter();
  const { pedido, payment_id, status } = router.query;
  const [numeroPedido, setNumeroPedido] = useState('');

  useEffect(() => {
    const numero = sessionStorage.getItem('ultimoNumeroPedido');
    if (numero) {
      setNumeroPedido(numero);
    }

    // Limpiar sessionStorage
    sessionStorage.removeItem('viandaData');
    sessionStorage.removeItem('pedidoData');
    sessionStorage.removeItem('ultimoPedidoId');
    sessionStorage.removeItem('ultimoNumeroPedido');
  }, []);

  return (
    <ProtectedRoute allowedRoles={['cliente']}>
      <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-primary mb-4">
            ¡Pago Exitoso!
          </h1>
          <p className="text-gray-600 mb-2">
            Tu pago ha sido confirmado correctamente
          </p>
          {numeroPedido && (
            <div className="bg-blue-50 border-2 border-secondary rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Número de pedido:</p>
              <p className="text-3xl font-bold text-secondary">
                #{numeroPedido}
              </p>
            </div>
          )}
          {payment_id && (
            <p className="text-xs text-gray-500 mb-6">
              ID de pago: {payment_id}
            </p>
          )}
          <div className="text-sm text-gray-600 mb-6 space-y-2">
            <p>📱 Te enviaremos notificaciones a tu WhatsApp</p>
            <p>📧 Recibirás un email con el detalle completo</p>
            <p>🍽️ Tu pedido ya está en preparación</p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => router.push('/mis-pedidos')}>
              Ver mis pedidos
            </Button>
            <Button onClick={() => router.push('/seleccionar-animal')} variant="secondary">
              Hacer otro pedido
            </Button>
          </div>
        </Card>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}