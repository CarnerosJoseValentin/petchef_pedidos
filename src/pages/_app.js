import '../styles/globals.css';
import { useAuth } from '../hooks/useAuth';

function MyApp({ Component, pageProps }) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-primary text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Component 
      {...pageProps} 
      user={user} 
      userData={userData} 
    />
  );
}

export default MyApp;