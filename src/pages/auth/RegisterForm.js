import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isValidEmail } from '../../utils/helpers';
import { ROLES } from '../../utils/constants';

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }

    if (!isValidEmail(formData.email)) {
      setError('Email inválido');
      return false;
    }

    if (!formData.password) {
      setError('La contraseña es requerida');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // Crear documento básico del usuario (completará perfil después)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        nombre: '',
        apellido: '',
        telefono: '',
        direccionEnvio: '',
        nombreMascota: '',
        fechaNacimientoMascota: null,
        rol: ROLES.CLIENTE,
        perfilCompleto: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Redirigirá automáticamente a completar-perfil
    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado');
      } else if (error.code === 'auth/weak-password') {
        setError('La contraseña es muy débil');
      } else {
        setError('Error al crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg border-2 border-primary">
      <h2 className="text-2xl font-suez text-primary text-center mb-6">
        Crear Cuenta
      </h2>

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
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />

        <Input
          type="password"
          placeholder="Confirmar contraseña"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          required
        />

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </Button>
      </form>

      <div className="mt-4">
        <Button variant="secondary" onClick={onSwitchToLogin}>
          ← Volver al Login
        </Button>
      </div>
    </div>
  );
};

export default RegisterForm;