import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import {
  updateConfiguracion,
  createCupon,
  updateCupon,
  getCupones,
} from "../../lib/firestore";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Layout from "../../components/layout/Layout";

export default function AdminConfiguracion() {
  const { userData } = useAuth();
  const { configuracion, loading } = useConfiguracion();
  const [guardando, setGuardando] = useState(false);
  const [cupones, setCupones] = useState([]);
  const [mostrarFormCupon, setMostrarFormCupon] = useState(false);

  // Estados para configuraciones
  const [config, setConfig] = useState({
    descuentoEfectivo: 10,
    montoEnvioGratis: 220000,
    permitirAcumulables: true,
    // Precios de zonas
    precioZona1: 4800,
    precioZona2: 7500,
    precioZona3Base: 7500,
    precioZona3PorKm: 700,
    // Parámetros de distancia
    radioCircunvalacion: 6,
    distanciaMaxima: 20,
    // Envío gratis por zonas
    envioGratisHabilitado: true,
    zonasEnvioGratis: [1], // Por defecto solo Zona 1
    direccionLocal: "CUMBRES NEGRAS 2288, Córdoba",
    numeroWhatsApp: "",
    horaApertura: "08:00",
    horaCierre: "16:00",
    diasPrepMin: 2,
    diasPrepMax: 7,
  });

  useEffect(() => {
    if (configuracion) {
      setConfig({
        descuentoEfectivo:
          configuracion.cupones?.descuentoEfectivoPorcentaje || 10,
        montoEnvioGratis: configuracion.cupones?.montoEnvioGratis || 220000,
        permitirAcumulables: configuracion.cupones?.permitirAcumulables ?? true,
        // Precios de zonas
        precioZona1: configuracion.envios?.precioZona1 || 4800,
        precioZona2: configuracion.envios?.precioZona2 || 7500,
        precioZona3Base: configuracion.envios?.precioZona3Base || 7500,
        precioZona3PorKm: configuracion.envios?.precioZona3PorKm || 700,
        // Parámetros de distancia
        radioCircunvalacion: configuracion.envios?.radioCircunvalacion || 6,
        distanciaMaxima: configuracion.envios?.distanciaMaxima || 20,
        // Envío gratis
        envioGratisHabilitado:
          configuracion.envios?.envioGratisHabilitado ?? true,
        zonasEnvioGratis: configuracion.envios?.zonasEnvioGratis || [1],
        direccionLocal:
          configuracion.envios?.direccionLocal ||
          "CUMBRES NEGRAS 2288, Córdoba",
        numeroWhatsApp: configuracion.whatsapp?.numeroNegocio || "",
        horaApertura: configuracion.horarios?.apertura || "08:00",
        horaCierre: configuracion.horarios?.cierre || "16:00",
        diasPrepMin: configuracion.horarios?.diasPreparacionMin || 2,
        diasPrepMax: configuracion.horarios?.diasPreparacionMax || 7,
      });
    }
  }, [configuracion]);

  useEffect(() => {
    cargarCupones();
  }, []);

  const cargarCupones = async () => {
    const result = await getCupones(false); // Traer todos, activos e inactivos
    if (result.success) {
      setCupones(result.data);
    }
  };

  const handleGuardarConfiguracion = async (seccion) => {
    setGuardando(true);

    let datosActualizar = {};

    if (seccion === "cupones") {
      datosActualizar = {
        cupones: {
          descuentoEfectivoPorcentaje: Number(config.descuentoEfectivo),
          montoEnvioGratis: Number(config.montoEnvioGratis),
          permitirAcumulables: config.permitirAcumulables,
        },
      };
    } else if (seccion === "envios") {
      datosActualizar = {
        envios: {
          // Precios de zonas
          precioZona1: Number(config.precioZona1),
          precioZona2: Number(config.precioZona2),
          precioZona3Base: Number(config.precioZona3Base),
          precioZona3PorKm: Number(config.precioZona3PorKm),
          // Parámetros de distancia
          radioCircunvalacion: Number(config.radioCircunvalacion),
          distanciaMaxima: Number(config.distanciaMaxima),
          // Envío gratis
          envioGratisHabilitado: config.envioGratisHabilitado,
          zonasEnvioGratis: config.zonasEnvioGratis,
          // Datos existentes
          direccionLocal: config.direccionLocal,
          coordenadasLocal: configuracion?.envios?.coordenadasLocal || {
            lat: -31.4357962331744,
            lng: -64.21897230399425,
          },
        },
      };
    } else if (seccion === "whatsapp") {
      datosActualizar = {
        whatsapp: {
          numeroNegocio: config.numeroWhatsApp,
          apiConfigurada: false,
        },
      };
    } else if (seccion === "horarios") {
      datosActualizar = {
        horarios: {
          apertura: config.horaApertura,
          cierre: config.horaCierre,
          diasPreparacionMin: Number(config.diasPrepMin),
          diasPreparacionMax: Number(config.diasPrepMax),
        },
      };
    }

    const result = await updateConfiguracion(datosActualizar);

    if (result.success) {
      alert("Configuración actualizada correctamente");
    } else {
      alert("Error al actualizar la configuración");
    }

    setGuardando(false);
  };

  const handleToggleAcumulables = async () => {
    setConfig({ ...config, permitirAcumulables: !config.permitirAcumulables });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <Layout>
          <div className="text-center py-8">Cargando configuración...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>
        <div>
          <h1 className="text-3xl font-bold text-primary mb-8">
            Configuración
          </h1>

          {/* Cupones y Descuentos */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              Cupones y Descuentos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Descuento por pago en efectivo (%)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.descuentoEfectivo}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        descuentoEfectivo: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                  <button
                    onClick={() => handleGuardarConfiguracion("cupones")}
                    disabled={guardando}
                    className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                  >
                    Actualizar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Monto para envío gratis ($)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={config.montoEnvioGratis}
                    onChange={(e) =>
                      setConfig({ ...config, montoEnvioGratis: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                  <button
                    onClick={() => handleGuardarConfiguracion("cupones")}
                    disabled={guardando}
                    className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                  >
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.permitirAcumulables}
                  onChange={handleToggleAcumulables}
                  className="w-5 h-5 text-secondary"
                />
                <span className="text-sm font-medium text-primary">
                  Permitir cupones acumulables
                </span>
              </label>
            </div>

            <button
              onClick={() => handleGuardarConfiguracion("cupones")}
              disabled={guardando}
              className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar configuración de cupones"}
            </button>
          </div>

          {/* Cupones Promocionales */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary">
                Cupones Promocionales
              </h2>
              <button
                onClick={() => setMostrarFormCupon(true)}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors"
              >
                + Crear cupón
              </button>
            </div>

            {cupones.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay cupones creados
              </p>
            ) : (
              <div className="space-y-3">
                {cupones.map((cupon) => (
                  <CuponCard
                    key={cupon.id}
                    cupon={cupon}
                    onRecargar={cargarCupones}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Envíos y Zonas */}
          {/* Configuración de Envíos */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              Configuración de Envíos
            </h2>

            {/* Dirección del local */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary mb-2">
                Dirección del local
              </label>
              <input
                type="text"
                value={config.direccionLocal}
                onChange={(e) =>
                  setConfig({ ...config, direccionLocal: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Las distancias se calculan desde esta dirección
              </p>
            </div>

            {/* Parámetros de distancia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Radio de circunvalación (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={config.radioCircunvalacion}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      radioCircunvalacion: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define el límite de la Zona 1
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Distancia máxima de entrega (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.distanciaMaxima}
                  onChange={(e) =>
                    setConfig({ ...config, distanciaMaxima: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pedidos fuera de este rango serán rechazados
                </p>
              </div>
            </div>

            {/* Precios por zona */}
            <div className="border-t pt-6 mb-6">
              <h3 className="font-bold text-primary mb-4">Precios por Zona</h3>

              <div className="space-y-4">
                {/* Zona 1 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Zona 1 - Dentro de circunvalación (0 -{" "}
                    {config.radioCircunvalacion} km)
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">$</span>
                    <input
                      type="number"
                      min="0"
                      value={config.precioZona1}
                      onChange={(e) =>
                        setConfig({ ...config, precioZona1: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Zona 2 */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Zona 2 - Fuera hasta 3 km ({config.radioCircunvalacion} -{" "}
                    {Number(config.radioCircunvalacion) + 3} km)
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">$</span>
                    <input
                      type="number"
                      min="0"
                      value={config.precioZona2}
                      onChange={(e) =>
                        setConfig({ ...config, precioZona2: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Zona 3 */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Zona 3 - Más de 3 km fuera (&gt;{" "}
                    {Number(config.radioCircunvalacion) + 3} km)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Precio base
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">$</span>
                        <input
                          type="number"
                          min="0"
                          value={config.precioZona3Base}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              precioZona3Base: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        + Por km adicional
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">$</span>
                        <input
                          type="number"
                          min="0"
                          value={config.precioZona3PorKm}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              precioZona3PorKm: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Ejemplo: {Number(config.radioCircunvalacion) + 6} km = $
                    {Number(config.precioZona3Base) + 700 * 3} (base + 3 km
                    adicionales)
                  </p>
                </div>
              </div>
            </div>

            {/* Envío gratis por zonas */}
            <div className="border-t pt-6">
              <h3 className="font-bold text-primary mb-4">Envío Gratis</h3>

              <div className="mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.envioGratisHabilitado}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        envioGratisHabilitado: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-secondary"
                  />
                  <span className="text-sm font-medium text-primary">
                    Habilitar envío gratis por monto mínimo
                  </span>
                </label>
              </div>

              {config.envioGratisHabilitado && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-primary mb-2">
                      Aplicar a estas zonas:
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.zonasEnvioGratis.includes(1)}
                          onChange={(e) => {
                            const zonas = e.target.checked
                              ? [...config.zonasEnvioGratis, 1]
                              : config.zonasEnvioGratis.filter((z) => z !== 1);
                            setConfig({ ...config, zonasEnvioGratis: zonas });
                          }}
                          className="w-4 h-4 text-secondary"
                        />
                        <span className="text-sm text-gray-700">
                          Zona 1 - Dentro de circunvalación
                        </span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.zonasEnvioGratis.includes(2)}
                          onChange={(e) => {
                            const zonas = e.target.checked
                              ? [...config.zonasEnvioGratis, 2]
                              : config.zonasEnvioGratis.filter((z) => z !== 2);
                            setConfig({ ...config, zonasEnvioGratis: zonas });
                          }}
                          className="w-4 h-4 text-secondary"
                        />
                        <span className="text-sm text-gray-700">
                          Zona 2 - Fuera hasta 3 km
                        </span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.zonasEnvioGratis.includes(3)}
                          onChange={(e) => {
                            const zonas = e.target.checked
                              ? [...config.zonasEnvioGratis, 3]
                              : config.zonasEnvioGratis.filter((z) => z !== 3);
                            setConfig({ ...config, zonasEnvioGratis: zonas });
                          }}
                          className="w-4 h-4 text-secondary"
                        />
                        <span className="text-sm text-gray-700">
                          Zona 3 - Más de 3 km fuera
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      El envío será gratis solo si el monto supera $
                      {config.montoEnvioGratis.toLocaleString()} Y la zona está
                      seleccionada
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => handleGuardarConfiguracion("envios")}
              disabled={guardando}
              className="mt-4 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar configuración de envíos"}
            </button>
          </div>
          {/* Notificaciones WhatsApp */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              Notificaciones WhatsApp
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Número WhatsApp Business
              </label>
              <input
                type="text"
                placeholder="+54 9 XXX XXXX XXXX"
                value={config.numeroWhatsApp}
                onChange={(e) =>
                  setConfig({ ...config, numeroWhatsApp: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Estado:</strong> API no configurada
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                La integración con WhatsApp Business API requiere configuración
                adicional
              </p>
            </div>

            <button
              onClick={() => handleGuardarConfiguracion("whatsapp")}
              disabled={guardando}
              className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar número de WhatsApp"}
            </button>
          </div>

          {/* Horarios y Producción */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              Horarios y Producción
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Hora de apertura
                </label>
                <input
                  type="time"
                  value={config.horaApertura}
                  onChange={(e) =>
                    setConfig({ ...config, horaApertura: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Hora de cierre
                </label>
                <input
                  type="time"
                  value={config.horaCierre}
                  onChange={(e) =>
                    setConfig({ ...config, horaCierre: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Días de preparación mínimo
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.diasPrepMin}
                  onChange={(e) =>
                    setConfig({ ...config, diasPrepMin: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Días de preparación máximo
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.diasPrepMax}
                  onChange={(e) =>
                    setConfig({ ...config, diasPrepMax: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => handleGuardarConfiguracion("horarios")}
              disabled={guardando}
              className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar configuración de horarios"}
            </button>
          </div>

          {/* Modal Crear Cupón */}
          {mostrarFormCupon && (
            <ModalCrearCupon
              onCerrar={() => setMostrarFormCupon(false)}
              onCreado={cargarCupones}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

const CuponCard = ({ cupon, onRecargar }) => {
  const [actualizando, setActualizando] = useState(false);

  const formatearFecha = (timestamp) => {
    if (!timestamp) return "Sin vencimiento";
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString("es-AR");
  };

  const handleToggleActivo = async () => {
    setActualizando(true);
    const result = await updateCupon(cupon.id, { activo: !cupon.activo });
    if (result.success) {
      onRecargar();
    }
    setActualizando(false);
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        cupon.activo
          ? "border-green-300 bg-green-50"
          : "border-gray-300 bg-gray-50"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-primary text-lg">{cupon.codigo}</h3>
          <p className="text-sm text-gray-600">
            {cupon.tipo === "porcentaje" && `${cupon.valor}% de descuento`}
            {cupon.tipo === "montoFijo" &&
              `$${cupon.valor.toLocaleString()} de descuento`}
            {cupon.tipo === "envioGratis" && "Envío gratis"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Vence: {formatearFecha(cupon.fechaVencimiento)} | Usos:{" "}
            {cupon.usoActual}/{cupon.usoMaximo || "∞"}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleToggleActivo}
            disabled={actualizando}
            className={`px-3 py-1 rounded text-sm ${
              cupon.activo
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {cupon.activo ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalCrearCupon = ({ onCerrar, onCreado }) => {
  const [formData, setFormData] = useState({
    codigo: "",
    tipo: "porcentaje",
    valor: 0,
    montoMinimo: 0,
    fechaVencimiento: "",
    usoMaximo: "",
  });
  const [creando, setCreando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.codigo.trim()) {
      alert("El código del cupón es obligatorio");
      return;
    }

    setCreando(true);

    const cuponData = {
      codigo: formData.codigo.toUpperCase(),
      tipo: formData.tipo,
      valor: Number(formData.valor),
      montoMinimo: Number(formData.montoMinimo) || 0,
      fechaVencimiento: formData.fechaVencimiento
        ? new Date(formData.fechaVencimiento)
        : null,
      usoMaximo: formData.usoMaximo ? Number(formData.usoMaximo) : null,
      activo: true,
    };

    const result = await createCupon(cuponData);

    if (result.success) {
      alert("Cupón creado correctamente");
      onCreado();
      onCerrar();
    } else {
      alert("Error al crear el cupón: " + result.error);
    }

    setCreando(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">Nuevo Cupón</h2>
          <button
            onClick={onCerrar}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Código del cupón
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  codigo: e.target.value.toUpperCase(),
                })
              }
              placeholder="PRIMERACOMPRA"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Tipo de descuento
            </label>
            <select
              value={formData.tipo}
              onChange={(e) =>
                setFormData({ ...formData, tipo: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="montoFijo">Monto fijo ($)</option>
              <option value="envioGratis">Envío gratis</option>
            </select>
          </div>

          {formData.tipo !== "envioGratis" && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Valor del descuento{" "}
                {formData.tipo === "porcentaje" ? "(%)" : "($)"}
              </label>
              <input
                type="number"
                min="0"
                value={formData.valor}
                onChange={(e) =>
                  setFormData({ ...formData, valor: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Monto mínimo de compra ($) (opcional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.montoMinimo}
              onChange={(e) =>
                setFormData({ ...formData, montoMinimo: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Fecha de vencimiento (opcional)
            </label>
            <input
              type="date"
              value={formData.fechaVencimiento}
              onChange={(e) =>
                setFormData({ ...formData, fechaVencimiento: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Límite de usos (opcional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.usoMaximo}
              onChange={(e) =>
                setFormData({ ...formData, usoMaximo: e.target.value })
              }
              placeholder="Dejar vacío para ilimitado"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creando}
              className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {creando ? "Creando..." : "Crear cupón"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
