import { useRouter } from 'next/router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';

export default function PagoPendiente() {
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={['cliente']}>
      <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">
            Pago Pendiente
          </h1>
          <p className="text-gray-600 mb-6">
            Tu pago está siendo procesado. Te notificaremos cuando se confirme.
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/mis-pedidos')}>
              Ver mis pedidos
            </Button>
            <Button onClick={() => router.push('/seleccionar-animal')} variant="secondary">
              Volver al inicio
            </Button>
          </div>
        </Card>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}