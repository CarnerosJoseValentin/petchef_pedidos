import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useRouter } from 'next/router';

const LoginForm = ({ onSwitchToRegister }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (error) {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Verificar si el documento del usuario existe
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // Si NO existe, crearlo
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          nombre: result.user.displayName?.split(' ')[0] || '',
          apellido: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          telefono: '',
          direccionEnvio: '',
          nombreMascota: '',
          fechaNacimiento: '',
          fechaNacimientoMascota: null,
          rol: 'cliente',
          perfilCompleto: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error en Google login:', error);
      setError('Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-lg border-2 border-primary">
      <div className="text-center mb-8 flex justify-center">
        <Image 
          src="/img/logo.png" 
          alt="Viandas Naturales" 
          width={200}
          height={80}
          priority
        />
      </div>

      <form onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        
        <Input
          type="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </form>

      <div className="mt-4">
        <Button variant="secondary" onClick={handleGoogleLogin} disabled={loading}>
          Continuar con Google
        </Button>
      </div>

      <div className="text-center mt-6 space-y-3">
        <div>
          <button 
            onClick={() => router.push('/auth/recuperar-password')}
            className="text-secondary hover:underline text-sm"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        
        <div>
          <button 
            onClick={onSwitchToRegister}
            className="text-secondary hover:underline"
          >
            ¿No tienes cuenta? Regístrate
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;