import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ROLES } from "../../utils/constants";
import Image from "next/image";

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Crear documento de usuario en Firestore con datos mínimos
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: formData.email,
        nombre: "",
        apellido: "",
        telefono: "",
        direccionEnvio: "",
        mascotas: [],
        perfilCompleto: false,
        rol: ROLES.CLIENTE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // El useAuth detectará el usuario y redirigirá a completar-perfil
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("Este email ya está registrado");
      } else if (error.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres");
      } else {
        setError("Error al crear la cuenta");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg border-2 border-primary">
      <Image
        src="/logo.png"
        alt="Pet Chef"
        width={400}
        height={40}
        className="object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling.style.display = "block";
        }}
      />
      <h2 className="text-2xl font-suez text-primary text-center mb-6">
        CREA TU CUENTA
      </h2>

      <form onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <Input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-600">
          ℹ️ Después podrás completar tu perfil y agregar tus amig@s de 4 patas
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </Button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={onSwitchToLogin}
          className="text-secondary hover:underline"
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;