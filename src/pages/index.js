import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Verificar si completó el perfil
      if (!userData?.perfilCompleto) {
        router.replace('/completar-perfil');
        return;
      }

      // Redirigir según rol
      if (userData.rol === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/seleccionar-animal');
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-spinner"></div>
    </div>
  );
}