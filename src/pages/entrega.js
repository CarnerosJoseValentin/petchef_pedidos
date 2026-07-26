import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { useConfiguracion } from "../hooks/useConfiguracion";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";
import {
  initializeAutocomplete,
  calcularDistancia,
  calcularZona,
  calcularCostoEnvio as calcularCostoEnvioHelper,
} from "../utils/googlePlaces";

export default function Entrega() {
  // Hooks - DEBEN IR PRIMERO
  const router = useRouter();
  const { user, userData } = useAuth();
  const { configuracion, loading: configLoading } = useConfiguracion();

  // Estados
  const [pedidoData, setPedidoData] = useState(null);
  const [tipoEntrega, setTipoEntrega] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState("");
  const [fechaMinima, setFechaMinima] = useState("");
  const [franjaHoraria, setFranjaHoraria] = useState("");
  const [zonaInfo, setZonaInfo] = useState(null);
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [validandoDireccion, setValidandoDireccion] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState("");
  const [calleSinNumero, setCalleSinNumero] = useState(false);

  // Refs
  const inputRef = useRef(null);

  // Constantes
  const franjasHorarias = [
    "08:00 - 10:00",
    "10:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 16:00",
  ];

  useEffect(() => {
    const data = sessionStorage.getItem("pedidoData");
    if (!data) {
      router.push("/carrito");
      return;
    }
    setPedidoData(JSON.parse(data));
  }, [router, userData]);

  useEffect(() => {
    const calcularFechaMinima = () => {
      const hoy = new Date();
      const diasSumar = configuracion?.horarios?.diasPreparacionMin || 2;
      let diasAgregados = 0;
      let fechaCalculo = new Date(hoy);

      while (diasAgregados < diasSumar) {
        fechaCalculo.setDate(fechaCalculo.getDate() + 1);
        if (fechaCalculo.getDay() !== 0 && fechaCalculo.getDay() !== 6) {
          diasAgregados++;
        }
      }

      const fechaMin = fechaCalculo.toISOString().split("T")[0];
      setFechaMinima(fechaMin);
      setFecha(fechaMin);
    };

    if (configuracion) {
      calcularFechaMinima();
    }
  }, [configuracion]);

  useEffect(() => {
    // Solo inicializar cuando tipoEntrega es "envio" y el input existe
    if (tipoEntrega !== "envio" || !inputRef.current) {
      console.log("⏸️ Esperando selección de envío o input no disponible");
      return;
    }

    console.log('🚀 Tipo de entrega es "envio", inicializando autocomplete...');

    const setupAutocomplete = async () => {
      // Pre-cargar dirección del perfil si existe
      if (userData?.direccionEnvio && !direccion) {
        inputRef.current.value = userData.direccionEnvio;
        setDireccion(userData.direccionEnvio);
      }

      const autocomplete = await initializeAutocomplete(
        inputRef.current,
        async (result) => {
          setDireccion(result.direccion);
          const { lat, lng } = result.coordenadas;
          await validarZona(lat, lng);
        }
      );
    };

    setupAutocomplete();
  }, [tipoEntrega, userData]); 

  const validarZona = async (lat, lon) => {
    setValidandoDireccion(true);
    setErrorDireccion("");

    try {
      const localLat =
        configuracion?.envios?.coordenadasLocal?.lat || -31.4357962331744;
      const localLon =
        configuracion?.envios?.coordenadasLocal?.lng || -64.21897230399425;
      const radioCircunvalacion =
        configuracion?.envios?.radioCircunvalacion || 6;
      const distanciaMaxima = configuracion?.envios?.distanciaMaxima || 20;

      const distancia = calcularDistancia(localLat, localLon, lat, lon);
      setDistanciaKm(distancia);

      // Validar si está dentro de la zona de cobertura
      if (distancia > distanciaMaxima) {
        setErrorDireccion(
          `❌ Esta dirección está fuera de nuestra zona de cobertura (${distancia.toFixed(
            1
          )} km). Máximo: ${distanciaMaxima} km.`
        );
        setZonaInfo(null);
        return;
      }

      // Calcular zona
      const zona = calcularZona(distancia, radioCircunvalacion);
      setZonaInfo(zona);
      setErrorDireccion("");
    } catch (error) {
      console.error("Error validando zona:", error);
      setErrorDireccion("No se pudo determinar la zona automáticamente.");
      setZonaInfo(null);
    }

    setValidandoDireccion(false);
  };

    const validarDireccionConNumero = (direccionTexto) => {
    return /,\s*\d+/.test(direccionTexto);
  };

  const calcularCostoEnvio = () => {
    if (!tipoEntrega) return 0;
    if (tipoEntrega === "retiro") return 0;

    // Prioridad 1: Cupón con envío gratis
    if (pedidoData?.envioGratis) return 0;

    // Prioridad 2: Envío gratis por monto y zona
    if (configuracion?.envios?.envioGratisHabilitado && zonaInfo) {
      const montoMinimo = configuracion.cupones?.montoEnvioGratis || 220000;
      const zonasGratis = configuracion.envios?.zonasEnvioGratis || [1];

      if (
        pedidoData.totalConDescuentos >= montoMinimo &&
        zonasGratis.includes(zonaInfo.zona)
      ) {
        return 0;
      }
    }

    // Prioridad 3: Calcular costo según zona
    if (!zonaInfo) {
      return errorDireccion ? null : 0;
    }
    if (!configuracion?.envios) return 0;

    return calcularCostoEnvioHelper(zonaInfo, configuracion);
  };

  const calcularTotal = () => {
    if (!pedidoData) return 0;
    return pedidoData.totalConDescuentos + calcularCostoEnvio();
  };

  const validarFormulario = () => {
    if (!tipoEntrega) {
      alert("Por favor selecciona un tipo de entrega");
      return false;
    }

    if (tipoEntrega === "envio" && !direccion.trim()) {
      alert("Por favor ingresa una dirección de entrega");
      return false;
    }

    if (!fecha) {
      alert("Por favor selecciona una fecha");
      return false;
    }

    if (tipoEntrega === "envio" && !franjaHoraria) {
      alert("Por favor selecciona una franja horaria");
      return false;
    }
    
    // Validar que no haya error de dirección
    if (tipoEntrega === "envio" && errorDireccion) {
      alert("La dirección seleccionada no es válida. Por favor elige una dirección dentro de nuestra zona de cobertura.");
      return false;
    }
    
    // Validar que haya zona válida
    if (tipoEntrega === "envio" && !zonaInfo) {
      alert("Por favor selecciona una dirección válida");
      return false;
    }

    return true;
  };

  const handleContinuar = () => {
    if (!validarFormulario()) return;
    if (
      tipoEntrega === "envio" &&
      !validarDireccionConNumero(direccion) &&
      !calleSinNumero
    ) {
      alert(
        'Por favor ingresa el número de la calle o marca la opción "Calle sin número"'
      );
      return false;
    }

    const datosActualizados = {
      ...pedidoData,
      entrega: {
        tipo: tipoEntrega,
        direccion:
          tipoEntrega === "retiro"
            ? configuracion?.envios?.direccionLocal ||
              "CUMBRES NEGRAS 2288, Córdoba"
            : direccion,
        zonaInfo: tipoEntrega === "envio" ? zonaInfo : null, // Cambiado
        distanciaKm: tipoEntrega === "envio" ? distanciaKm : 0, // Nuevo
        referencia: tipoEntrega === "envio" ? referencia : "",
        fecha,
        franjaHoraria: tipoEntrega === "retiro" ? "A coordinar" : franjaHoraria,
      },
      costoEnvio: calcularCostoEnvio(),
      totalFinal: calcularTotal(),
    };

    sessionStorage.setItem("pedidoData", JSON.stringify(datosActualizados));
    router.push("/confirmacion");
  };

  if (!pedidoData || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-md mx-auto pt-8">
            <button
              onClick={() => router.back()}
              className="text-secondary mb-4 hover:underline"
            >
              ← Volver al pago
            </button>

            {/* Resumen de viandas - AGREGAR ESTE CARD COMPLETO */}
            <Card className="mb-4">
              <h3 className="font-bold text-primary mb-3">
                Viandas en tu pedido:
              </h3>
              <div className="space-y-2">
                {pedidoData.viandas.map((vianda, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"}{" "}
                      {vianda.mascotaNombre} ({vianda.cantidadViandas})
                    </span>
                    <span className="font-medium">
                      ${vianda.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="mb-6">
              <h2 className="text-xl font-bold text-primary mb-4">
                Tipo de Entrega
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                ¿Cómo quieres recibir tu pedido?
              </p>

              <div className="space-y-4">
                {/* Opción Retiro */}
                <div
                  onClick={() => setTipoEntrega("retiro")}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    tipoEntrega === "retiro"
                      ? "border-secondary bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={tipoEntrega === "retiro"}
                      onChange={() => setTipoEntrega("retiro")}
                      className="mr-3 w-5 h-5"
                    />
                    <span className="text-lg font-bold text-primary">
                      🏪 Retiro en Local
                    </span>
                  </div>

                  <div className="ml-8 text-sm">
                    <p className="text-gray-700">
                      📍{" "}
                      {configuracion?.envios?.direccionLocal ||
                        "CUMBRES NEGRAS 2288, Córdoba"}
                    </p>
                    <p className="text-gray-600">
                      🕐 Horario: Lunes a Viernes{" "}
                      {configuracion?.horarios?.apertura || "08:00"} -{" "}
                      {configuracion?.horarios?.cierre || "16:00"} hs
                    </p>
                    <p className="text-green-600 font-medium">
                      💰 Sin costo adicional
                    </p>
                  </div>
                </div>

                {/* Opción Envío */}
                <div
                  onClick={() => setTipoEntrega("envio")}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    tipoEntrega === "envio"
                      ? "border-secondary bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={tipoEntrega === "envio"}
                      onChange={() => setTipoEntrega("envio")}
                      className="mr-3 w-5 h-5"
                    />
                    <span className="text-lg font-bold text-primary">
                      🚚 Envío a Domicilio
                    </span>
                  </div>

                  {tipoEntrega === "envio" && (
                    <div className="ml-8 mt-4 space-y-4">
                      {/* Input con autocompletado */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-primary mb-2">
                          Dirección de entrega
                        </label>
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Buscar dirección..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                        />

                        {validandoDireccion && (
                          <p className="text-sm text-blue-600 mt-1">
                            Validando zona...
                          </p>
                        )}

                        {errorDireccion && (
                          <p className="text-sm text-orange-600 mt-1">
                            {errorDireccion}
                          </p>
                        )}

                        {!validandoDireccion &&
                          !errorDireccion &&
                          direccion &&
                          zonaInfo && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm text-green-700 font-medium">
                                ✓ {zonaInfo.nombre}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                📏 Distancia: {distanciaKm.toFixed(1)} km desde
                                nuestro local
                              </p>
                              {zonaInfo.zona === 3 && (
                                <p className="text-xs text-orange-600 mt-1">
                                  ⚠️ Zona 3: se cobran{" "}
                                  {Math.ceil(zonaInfo.kmAdicionales)} km
                                  adicionales
                                </p>
                              )}
                            </div>
                          )}
                      </div>

                      {/* Checkbox para calle sin número */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="calleSinNumero"
                          checked={calleSinNumero}
                          onChange={(e) => {
                            setCalleSinNumero(e.target.checked);
                            if (e.target.checked) {
                              setErrorDireccion(""); // Limpiar error si marca el checkbox
                            }
                          }}
                          className="w-4 h-4 text-secondary rounded focus:ring-2 focus:ring-secondary"
                        />
                        <label
                          htmlFor="calleSinNumero"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Calle sin número
                        </label>
                      </div>

                      <Input
                        label="Referencia (opcional)"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ej: Casa con portón verde"
                      />

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Franja horaria
                        </label>
                        <select
                          value={franjaHoraria}
                          onChange={(e) => setFranjaHoraria(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                        >
                          <option value="">Selecciona una franja</option>
                          {franjasHorarias.map((franja) => (
                            <option key={franja} value={franja}>
                              {franja}
                            </option>
                          ))}
                        </select>
                      </div>

                      {calcularCostoEnvio() === 0 &&
                        tipoEntrega === "envio" &&
                        !errorDireccion &&
                        zonaInfo && (
                          <div className="bg-green-50 border border-green-200 p-3 rounded">
                            <p className="text-sm text-green-700 font-medium">
                              ✅ ¡Envío GRATIS!
                            </p>
                            {pedidoData.envioGratis ? (
                              <p className="text-xs text-green-600 mt-1">
                                Por cupón aplicado
                              </p>
                            ) : (
                              <p className="text-xs text-green-600 mt-1">
                                Por monto mínimo alcanzado
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-primary mb-2">
                  Fecha de {tipoEntrega === "retiro" ? "retiro" : "entrega"}
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  min={fechaMinima}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Mínimo {configuracion?.horarios?.diasPreparacionMin || 2} días
                  hábiles, máximo{" "}
                  {configuracion?.horarios?.diasPreparacionMax || 7} días
                </p>
              </div>
            </Card>

            <Card className="mb-6 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-primary mb-4">
                Resumen Actualizado
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ${pedidoData.totalConDescuentos.toLocaleString()}
                  </span>
                </div>

                {tipoEntrega === "envio" && zonaInfo && (
                  <div className="flex justify-between text-sm">
                    <span>Envío ({zonaInfo.nombre})</span>
                    <span className="font-medium">
                      {calcularCostoEnvio() === 0
                        ? "GRATIS"
                        : `+$${calcularCostoEnvio().toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-blue-300 pt-4">
                <div className="flex justify-between font-bold text-primary text-lg">
                  <span>TOTAL FINAL</span>
                  <span>${calcularTotal().toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <div className="space-y-3 max-w-md mx-auto">
              <Button onClick={() => router.back()} variant="secondary">
                ← Volver
              </Button>
              <Button onClick={handleContinuar}>Confirmar pedido →</Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
