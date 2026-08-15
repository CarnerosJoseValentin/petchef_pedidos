import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  initializeAutocomplete,
  calcularDistancia,
  calcularZona,
  calcularCostoEnvio as calcularCostoEnvioHelper,
} from "../utils/googlePlaces";

const FRANJAS_HORARIAS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
];

const validarDireccionConNumero = (direccionTexto) => /,\s*\d+/.test(direccionTexto);

/**
 * Extraído de entrega.js sin cambios de comportamiento.
 */
export function useEntregaForm({ userData, configuracion }) {
  const router = useRouter();
  const inputRef = useRef(null);

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
    if (tipoEntrega !== "envio" || !inputRef.current) return;

    const setupAutocomplete = async () => {
      if (userData?.direccionEnvio && !direccion) {
        inputRef.current.value = userData.direccionEnvio;
        setDireccion(userData.direccionEnvio);
      }

      await initializeAutocomplete(inputRef.current, async (result) => {
        setDireccion(result.direccion);
        const { lat, lng } = result.coordenadas;
        await validarZona(lat, lng);
      });
    };

    setupAutocomplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoEntrega, userData]);

  const validarZona = async (lat, lon) => {
    setValidandoDireccion(true);
    setErrorDireccion("");

    try {
      const localLat = configuracion?.envios?.coordenadasLocal?.lat || -31.4357962331744;
      const localLon = configuracion?.envios?.coordenadasLocal?.lng || -64.21897230399425;
      const radioCircunvalacion = configuracion?.envios?.radioCircunvalacion || 6;
      const distanciaMaxima = configuracion?.envios?.distanciaMaxima || 20;

      const distancia = calcularDistancia(localLat, localLon, lat, lon);
      setDistanciaKm(distancia);

      if (distancia > distanciaMaxima) {
        setErrorDireccion(
          `❌ Esta dirección está fuera de nuestra zona de cobertura (${distancia.toFixed(
            1
          )} km). Máximo: ${distanciaMaxima} km.`
        );
        setZonaInfo(null);
        return;
      }

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

  const calcularCostoEnvio = () => {
    if (!tipoEntrega) return 0;
    if (tipoEntrega === "retiro") return 0;

    if (pedidoData?.envioGratis) return 0;

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
    if (tipoEntrega === "envio" && errorDireccion) {
      alert(
        "La dirección seleccionada no es válida. Por favor elige una dirección dentro de nuestra zona de cobertura."
      );
      return false;
    }
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
      return;
    }

    const datosActualizados = {
      ...pedidoData,
      entrega: {
        tipo: tipoEntrega,
        direccion:
          tipoEntrega === "retiro"
            ? configuracion?.envios?.direccionLocal || "CUMBRES NEGRAS 2288, Córdoba"
            : direccion,
        zonaInfo: tipoEntrega === "envio" ? zonaInfo : null,
        distanciaKm: tipoEntrega === "envio" ? distanciaKm : 0,
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

  return {
    inputRef,
    pedidoData,
    tipoEntrega,
    setTipoEntrega,
    direccion,
    referencia,
    setReferencia,
    fecha,
    setFecha,
    fechaMinima,
    franjaHoraria,
    setFranjaHoraria,
    zonaInfo,
    distanciaKm,
    validandoDireccion,
    errorDireccion,
    setErrorDireccion,
    calleSinNumero,
    setCalleSinNumero,
    franjasHorarias: FRANJAS_HORARIAS,
    calcularCostoEnvio,
    calcularTotal,
    handleContinuar,
  };
}
