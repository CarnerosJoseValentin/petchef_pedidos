import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const RecuperarPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error) {
      console.error("Error al enviar email:", error);
      
      // Manejo de errores específicos
      if (error.code === "auth/user-not-found") {
        setError("No existe una cuenta con este email");
      } else if (error.code === "auth/invalid-email") {
        setError("Email inválido");
      } else {
        setError("Error al enviar el email. Intenta nuevamente");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSuccess(false);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {!success ? (
            <>
              {/* Formulario */}
              <h2 className="text-2xl font-bold text-primary mb-2">
                Recuperar Contraseña
              </h2>
              <p className="text-gray-600 mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecer tu
                contraseña.
              </p>

              <form onSubmit={handleSubmit}>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Enlace"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Mensaje de éxito */}
              <div className="text-center">
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 text-green-500 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-primary mb-2">
                  ¡Email Enviado!
                </h2>

                <p className="text-gray-600 mb-4">
                  Te enviamos un email a:
                  <br />
                  <strong className="text-primary">{email}</strong>
                </p>

                <p className="text-sm text-gray-500 mb-6">
                  Revisa tu bandeja de entrada o span si no lo encuentras y sigue las instrucciones para
                  restablecer tu contraseña.
                </p>

                <Button onClick={handleClose}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default RecuperarPasswordModal;