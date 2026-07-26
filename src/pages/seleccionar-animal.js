import { useState } from "react";
import { useRouter } from "next/router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

export default function SeleccionarMascota() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [nuevaMascota, setNuevaMascota] = useState({
    id: "",
    nombre: "",
    tipo: "",
    fechaNacimiento: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSeleccionarMascota = (mascota) => {
    router.push(`/ingredientes?animalId=${mascota.id}&tipo=${mascota.tipo}`);
  };

  const abrirModalAgregar = () => {
    setNuevaMascota({
      id: Date.now().toString(),
      nombre: "",
      tipo: "",
      fechaNacimiento: "",
    });
    setShowModal(true);
  };

  const handleAgregarMascota = async () => {
    if (!nuevaMascota.nombre.trim() || !nuevaMascota.tipo) {
      alert("Nombre y tipo son requeridos");
      return;
    }

    setSaving(true);

    try {
      const mascotasActualizadas = [...(userData.mascotas || []), nuevaMascota];

      await updateDoc(doc(db, "users", user.uid), {
        mascotas: mascotasActualizadas,
        updatedAt: new Date(),
      });

      setShowModal(false);
      // El useAuth se actualizará automáticamente
    } catch (error) {
      console.error("Error al agregar mascota:", error);
      alert("Error al agregar mascota");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarMascota = async (mascotaId) => {
    if (userData.mascotas.length === 1) {
      alert("Debes tener al menos un amig@ de 4 patas registrado");
      return;
    }

    if (!confirm("¿Estás seguro de eliminar este amig@?")) {
      return;
    }

    try {
      const mascotasActualizadas = userData.mascotas.filter(
        (m) => m.id !== mascotaId
      );

      await updateDoc(doc(db, "users", user.uid), {
        mascotas: mascotasActualizadas,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error al eliminar mascota:", error);
      alert("Error al eliminar mascota");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  if (!userData?.mascotas || userData.mascotas.length === 0) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md bg-white rounded-lg border-2 border-primary p-8 text-center">
              <div className="text-6xl mb-4">🐕</div>
              <h2 className="text-2xl font-suez text-primary mb-4">
                No tienes amig@s registrados
              </h2>
              <p className="text-gray-600 mb-6">
                Para hacer un pedido, primero debes completar tu perfil.
              </p>
              <Button onClick={() => router.push("/completar-perfil")}>
                Completar Perfil
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto pt-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-suez text-primary mb-4">
                ¿Para quién es la vianda,{" "}
                <span className="capitalize">
                  {userData.nombre || userData.displayName || "amig@"}
                </span>
                ?
              </h1>
              <p className="text-gray-600">
                Selecciona para quien quieres armar sus viandas
              </p>
            </div>

            {/* Grid centrado */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {userData.mascotas.map((mascota) => {
                const iconoMascota = mascota.tipo === "perro" ? "🐕" : "🐱";

                return (
                  <Card
                    key={mascota.id}
                    className="relative w-64 text-center border-2 border-gray-200 hover:border-secondary hover:shadow-lg cursor-pointer transition-all duration-200"
                    onClick={() => handleSeleccionarMascota(mascota)}
                  >
                    {/* Botón eliminar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarMascota(mascota.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-sm"
                      title="Eliminar"
                    >
                      ✕
                    </button>

                    <div className="text-6xl mb-4">{iconoMascota}</div>
                    <h3 className="text-2xl font-bold text-primary mb-2">
                      {mascota.nombre}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {mascota.tipo}
                    </p>
                  </Card>
                );
              })}
            </div>
            {/* Botón para agregar - CORREGIDO */}
            <div className="flex justify-center mt-6">
              <Button
                variant="secondary"
                onClick={abrirModalAgregar}
                className="!w-auto px-6 py-2"
              >
                Agregar amig@
              </Button>
            </div>
          </div>
        </div>

        {/* Modal para agregar mascota */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-primary mb-6">
                Agregar Amig@ de 4 Patas
              </h3>

              <Input
                label="Nombre *"
                value={nuevaMascota.nombre}
                onChange={(e) =>
                  setNuevaMascota({ ...nuevaMascota, nombre: e.target.value })
                }
                placeholder="Ej: Max"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-2">
                  Tipo *
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                  value={nuevaMascota.tipo}
                  onChange={(e) =>
                    setNuevaMascota({ ...nuevaMascota, tipo: e.target.value })
                  }
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="perro">🐕 Perro</option>
                  <option value="gato">🐱 Gato</option>
                </select>
              </div>

              <Input
                label="Fecha de nacimiento (opcional)"
                type="date"
                value={nuevaMascota.fechaNacimiento}
                onChange={(e) =>
                  setNuevaMascota({
                    ...nuevaMascota,
                    fechaNacimiento: e.target.value,
                  })
                }
              />

              <div className="flex gap-4 mt-6">
                <Button
                  onClick={handleAgregarMascota}
                  disabled={
                    saving || !nuevaMascota.nombre.trim() || !nuevaMascota.tipo
                  }
                  className="flex-1"
                >
                  {saving ? "Guardando..." : "Agregar"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}