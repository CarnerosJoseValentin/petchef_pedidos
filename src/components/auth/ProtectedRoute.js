import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si no está autenticado, redirigir al login
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Si tiene roles específicos requeridos, verificar
      if (allowedRoles.length > 0 && userData) {
        if (!allowedRoles.includes(userData.rol)) {
          // Redirigir según el rol del usuario
          if (userData.rol === 'admin') {
            router.push('/admin');
          } else {
            router.push('/seleccionar-animal');
          }
          return;
        }
      }
    }
  }, [user, userData, loading, router, allowedRoles]);

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
        <span className="ml-2 text-primary">Verificando acceso...</span>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (está redirigiendo)
  if (!user) {
    return null;
  }

  // Si tiene roles específicos y no coincide, no mostrar nada
  if (allowedRoles.length > 0 && userData && !allowedRoles.includes(userData.rol)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;