import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import Image from "next/image";
import RecuperarPasswordModal from "./RecuperarPasswordModal"; // ⬅️ NUEVO

const LoginForm = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRecuperarModal, setShowRecuperarModal] = useState(false); // ⬅️ NUEVO

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (error) {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // ✅ VERIFICAR si el documento del usuario existe
      const userDocRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userDocRef);

      // ✅ Si NO existe, crearlo
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          nombre: result.user.displayName?.split(" ")[0] || "",
          apellido:
            result.user.displayName?.split(" ").slice(1).join(" ") || "",
          telefono: "",
          direccionEnvio: "",
          mascotas: [],
          perfilCompleto: false,
          rol: "cliente",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error en Google login:", error);
      setError("Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg border-2 border-primary">
        <Image
          src="/logo.png"
          alt="Pet Chef"
          width={400}
          height={40}
          className="object-contain"
          onError={(e) => {
            // Si falla la carga del logo, mostrar emoji
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling.style.display = "block";
          }}
        />
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />

          <Input
            type="password"
            placeholder="Contraseña"
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

          <Button type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Registrarse con Google
          </Button>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setShowRecuperarModal(true)}
            className="text-secondary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onSwitchToRegister}
            className="text-secondary hover:underline"
          >
            ¿No tienes cuenta? Regístrate
          </button>
        </div>
      </div>

      <RecuperarPasswordModal
        isOpen={showRecuperarModal}
        onClose={() => setShowRecuperarModal(false)}
      />
    </>
  );
};

export default LoginForm;
