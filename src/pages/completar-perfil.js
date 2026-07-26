import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import AddressAutocomplete from "../components/ui/AddressAutocomplete";
import {
  isValidArgentinePhone,
  formatArgentinePhone,
  isValidPetBirthDate,
  getPetAge,
} from "../utils/helpers";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";

export default function CompletarPerfil() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    direccionEnvio: "",
  });

  // Array de mascotas - mínimo 1
  const [mascotas, setMascotas] = useState([
    {
      id: Date.now().toString(),
      nombre: "",
      tipo: "",
      fechaNacimiento: "",
    },
  ]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Si ya completó el perfil, redirigir
      if (userData?.perfilCompleto) {
        if (userData.rol === "admin") {
          router.push("/admin");
        } else {
          router.push("/seleccionar-animal");
        }
        return;
      }

      // Pre-cargar datos existentes
      if (userData) {
        setFormData({
          nombre: userData.nombre || "",
          apellido: userData.apellido || "",
          telefono: userData.telefono || "",
          direccionEnvio: userData.direccionEnvio || "",
        });

        // Si ya tiene mascotas guardadas, cargarlas
        if (userData.mascotas && userData.mascotas.length > 0) {
          setMascotas(userData.mascotas);
        }
      }
    }
  }, [user, userData, loading, router]);

  // Verificar si el formulario está completo
  const isFormComplete = () => {
    // 1. Validar que TODOS los datos personales estén completos
    const datosPersonalesCompletos =
      formData.nombre.trim() !== "" &&
      formData.apellido.trim() !== "" &&
      formData.telefono.trim() !== "" &&
      formData.direccionEnvio.trim() !== "" &&
      isValidArgentinePhone(formData.telefono); // ⬅️ AGREGADO: validar formato del teléfono

    // 2. Validar que haya al menos una mascota con nombre Y tipo
    const alMenosUnaMascotaCompleta = mascotas.some(
      (m) => m.nombre.trim() !== "" && m.tipo !== ""
    );

    // 3. Validar que las mascotas que tienen datos estén completas
    const todasLasMascotasValidasOVacias = mascotas.every((m) => {
      const tieneDatos = m.nombre.trim() || m.tipo || m.fechaNacimiento;

      // Si tiene algún dato, debe tener nombre Y tipo
      if (tieneDatos) {
        return m.nombre.trim() !== "" && m.tipo !== "";
      }

      // Si no tiene datos, está ok (se puede dejar vacía)
      return true;
    });

    // 4. Validar fechas de nacimiento si están presentes
    const todasLasFechasValidas = mascotas.every((m) => {
      if (m.fechaNacimiento) {
        return isValidPetBirthDate(m.fechaNacimiento).valid;
      }
      return true;
    });

    return (
      datosPersonalesCompletos &&
      alMenosUnaMascotaCompleta &&
      todasLasMascotasValidasOVacias &&
      todasLasFechasValidas
    );
  };

  const agregarMascota = () => {
    setMascotas([
      ...mascotas,
      {
        id: Date.now().toString(),
        nombre: "",
        tipo: "",
        fechaNacimiento: "",
      },
    ]);
  };

  const eliminarMascota = (id) => {
    // No permitir eliminar si solo hay 1 mascota
    if (mascotas.length === 1) {
      alert("Debes tener al menos una mascota registrada");
      return;
    }
    setMascotas(mascotas.filter((m) => m.id !== id));
  };

  const actualizarMascota = (id, campo, valor) => {
    setMascotas(
      mascotas.map((m) => (m.id === id ? { ...m, [campo]: valor } : m))
    );
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar datos personales
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es requerido";
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es requerido";
    } else if (!isValidArgentinePhone(formData.telefono)) {
      newErrors.telefono = "Formato inválido. Ej: 351 5123456 o 11 12345678";
    }

    if (!formData.direccionEnvio.trim()) {
      newErrors.direccionEnvio = "La dirección es requerida";
    }

    // Validar mascotas
    let hayAlMenosUnaMascotaCompleta = false;
    mascotas.forEach((mascota, index) => {
      // Si la mascota tiene algún dato, validar que tenga nombre y tipo
      const tieneDatos =
        mascota.nombre.trim() || mascota.tipo || mascota.fechaNacimiento;

      if (tieneDatos) {
        if (!mascota.nombre.trim()) {
          newErrors[`mascota_${mascota.id}_nombre`] = "Nombre requerido";
        }
        if (!mascota.tipo) {
          newErrors[`mascota_${mascota.id}_tipo`] = "Tipo requerido";
        }

        // Si está completa (nombre + tipo), marcar que hay al menos una
        if (mascota.nombre.trim() && mascota.tipo) {
          hayAlMenosUnaMascotaCompleta = true;
        }
      }

      // Validar fecha si se ingresó
      if (mascota.fechaNacimiento) {
        const validacion = isValidPetBirthDate(mascota.fechaNacimiento);
        if (!validacion.valid) {
          newErrors[`mascota_${mascota.id}_fecha`] = validacion.error;
        }
      }
    });

    if (!hayAlMenosUnaMascotaCompleta) {
      newErrors.mascotas_general =
        "Debes agregar al menos un amig@ de 4 patas (nombre y tipo)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      // Filtrar solo mascotas con datos completos
      const mascotasCompletas = mascotas.filter(
        (m) => m.nombre.trim() && m.tipo
      );

      const dataToUpdate = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        telefono: formatArgentinePhone(formData.telefono),
        direccionEnvio: formData.direccionEnvio.trim(),
        mascotas: mascotasCompletas,
        perfilCompleto: true,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "users", user.uid), dataToUpdate);

      // Redirigir según rol
      if (userData?.rol === "admin") {
        router.push("/admin");
      } else {
        router.push("/seleccionar-animal");
      }
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Error al guardar los datos. Por favor intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border-2 border-primary p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-suez text-primary mb-2">
                  ¡Bienvenido!
                </h1>
                <p className="text-gray-600">
                  Completá tu perfil para empezar a realizar pedidos
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* DATOS PERSONALES */}
                <h3 className="text-lg font-bold text-primary mb-4">
                  Tus datos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre *"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    error={errors.nombre}
                    required
                  />

                  <Input
                    label="Apellido *"
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                    error={errors.apellido}
                    required
                  />
                </div>

                <Input
                  label="Teléfono *"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  error={errors.telefono}
                  placeholder="Ej: 351 5123456"
                  required
                />

                <AddressAutocomplete
                  value={formData.direccionEnvio}
                  onChange={(direccion) =>
                    setFormData({ ...formData, direccionEnvio: direccion })
                  }
                  error={errors.direccionEnvio}
                  required
                />

                {/* MASCOTAS */}
                <hr className="my-6 border-gray-300" />

                <h3 className="text-lg font-bold text-primary mb-4">
                  Tus amig@s de 4 patas
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={agregarMascota}
                  className="text-sm mb-4"
                >
                  + Agregar amig@
                </Button>

                {errors.mascotas_general && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {errors.mascotas_general}
                  </div>
                )}

                {mascotas.map((mascota, index) => (
                  <div
                    key={mascota.id}
                    className="mb-6 p-4 border-2 border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-primary">
                        Amig@ #{index + 1}
                      </h4>
                      {mascotas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarMascota(mascota.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕ Eliminar
                        </button>
                      )}
                    </div>

                    <Input
                      label="Nombre *"
                      value={mascota.nombre}
                      onChange={(e) =>
                        actualizarMascota(mascota.id, "nombre", e.target.value)
                      }
                      error={errors[`mascota_${mascota.id}_nombre`]}
                      placeholder="Ej: Max"
                    />

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-primary mb-2">
                        Tipo *
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                        value={mascota.tipo}
                        onChange={(e) =>
                          actualizarMascota(mascota.id, "tipo", e.target.value)
                        }
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="perro">🐕 Perro</option>
                        <option value="gato">🐱 Gato</option>
                      </select>
                      {errors[`mascota_${mascota.id}_tipo`] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[`mascota_${mascota.id}_tipo`]}
                        </p>
                      )}
                    </div>

                    <Input
                      label="Fecha de nacimiento (opcional)"
                      type="date"
                      value={mascota.fechaNacimiento}
                      onChange={(e) =>
                        actualizarMascota(
                          mascota.id,
                          "fechaNacimiento",
                          e.target.value
                        )
                      }
                      error={errors[`mascota_${mascota.id}_fecha`]}
                    />

                    {mascota.fechaNacimiento &&
                      !errors[`mascota_${mascota.id}_fecha`] &&
                      mascota.nombre && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-primary">
                          <strong>{mascota.nombre}</strong> tiene{" "}
                          {(() => {
                            const edad = getPetAge(mascota.fechaNacimiento);
                            if (!edad) return "";
                            if (edad.years === 0) {
                              return `${edad.months} ${
                                edad.months === 1 ? "mes" : "meses"
                              }`;
                            }
                            return `${edad.years} ${
                              edad.years === 1 ? "año" : "años"
                            }${
                              edad.months > 0
                                ? ` y ${edad.months} ${
                                    edad.months === 1 ? "mes" : "meses"
                                  }`
                                : ""
                            }`;
                          })()}
                        </div>
                      )}
                  </div>
                ))}

                <Button
                  type="submit"
                  disabled={saving || !isFormComplete()}
                  className="w-full mt-6"
                >
                  {saving ? "Guardando..." : "Completar Perfil"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
