import { useState } from 'react';
import { useRouter } from 'next/router';
import { resetPassword } from '../../lib/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isValidEmail } from '../../utils/helpers';

export default function RecuperarPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Email inválido');
      return;
    }

    setLoading(true);

    const result = await resetPassword(email);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg border-2 border-primary text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-suez text-primary mb-4">
            Email Enviado
          </h2>
          <p className="text-gray-600 mb-6">
            Revisa tu correo <strong>{email}</strong>. Te enviamos un link para restablecer tu contraseña.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Si no ves el email, revisa tu carpeta de spam.
          </p>
          <Button onClick={() => router.push('/auth/login')}>
            Volver al Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg border-2 border-primary">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-suez text-primary mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-600">
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={() => router.push('/auth/login')}
            className="text-secondary hover:underline"
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}