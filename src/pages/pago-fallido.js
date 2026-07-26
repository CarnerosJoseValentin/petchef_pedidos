import { useRouter } from 'next/router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';

export default function PagoFallido() {
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={['cliente']}>
      <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Pago Rechazado
          </h1>
          <p className="text-gray-600 mb-6">
            Tu pago no pudo ser procesado. Por favor intenta nuevamente o elige otro método de pago.
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/confirmacion')}>
              Intentar nuevamente
            </Button>
            <Button onClick={() => router.push('/pago')} variant="secondary">
              Cambiar método de pago
            </Button>
          </div>
        </Card>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}