import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';

export default function AuthPage() {
  const [showRegister, setShowRegister] = useState(false);
  const { user, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && userData) {
      // Redirigir según el rol del usuario
      switch (userData.rol) {
        case 'admin':
          router.push('/admin/pedidos');
          break;
        case 'produccion':
          router.push('/produccion/pedidos');
          break;
        case 'logistica':
          router.push('/logistica/pedidos');
          break;
        case 'cliente':
        default:
          router.push('/seleccionar-animal');
          break;
      }
    }
  }, [user, userData, router]);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showRegister ? (
        <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </div>
  );
}