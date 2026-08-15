import { useState, useEffect } from "react";
import { updateConfiguracion } from "../lib/firestore";

const DEFAULTS = {
  descuentoEfectivo: 10,
  montoEnvioGratis: 220000,
  permitirAcumulables: true,
  precioZona1: 4800,
  precioZona2: 7500,
  precioZona3Base: 7500,
  precioZona3PorKm: 700,
  radioCircunvalacion: 6,
  distanciaMaxima: 20,
  envioGratisHabilitado: true,
  zonasEnvioGratis: [1],
  direccionLocal: "CUMBRES NEGRAS 2288, Córdoba",
  numeroWhatsApp: "",
  horaApertura: "08:00",
  horaCierre: "16:00",
  diasPrepMin: 2,
  diasPrepMax: 7,
};

/**
 * Estado y guardado del formulario de /admin/configuracion.
 * Antes vivía todo esto (y el JSX de 5 secciones) en un solo archivo de 927
 * líneas; acá solo queda la lógica, cada sección se renderiza por separado.
 */
export function useConfiguracionForm(configuracion) {
  const [config, setConfig] = useState(DEFAULTS);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!configuracion) return;
    setConfig({
      descuentoEfectivo:
        configuracion.cupones?.descuentoEfectivoPorcentaje ??
        DEFAULTS.descuentoEfectivo,
      montoEnvioGratis:
        configuracion.cupones?.montoEnvioGratis ?? DEFAULTS.montoEnvioGratis,
      permitirAcumulables:
        configuracion.cupones?.permitirAcumulables ??
        DEFAULTS.permitirAcumulables,
      precioZona1: configuracion.envios?.precioZona1 ?? DEFAULTS.precioZona1,
      precioZona2: configuracion.envios?.precioZona2 ?? DEFAULTS.precioZona2,
      precioZona3Base:
        configuracion.envios?.precioZona3Base ?? DEFAULTS.precioZona3Base,
      precioZona3PorKm:
        configuracion.envios?.precioZona3PorKm ?? DEFAULTS.precioZona3PorKm,
      radioCircunvalacion:
        configuracion.envios?.radioCircunvalacion ??
        DEFAULTS.radioCircunvalacion,
      distanciaMaxima:
        configuracion.envios?.distanciaMaxima ?? DEFAULTS.distanciaMaxima,
      envioGratisHabilitado:
        configuracion.envios?.envioGratisHabilitado ??
        DEFAULTS.envioGratisHabilitado,
      zonasEnvioGratis:
        configuracion.envios?.zonasEnvioGratis ?? DEFAULTS.zonasEnvioGratis,
      direccionLocal:
        configuracion.envios?.direccionLocal ?? DEFAULTS.direccionLocal,
      numeroWhatsApp:
        configuracion.whatsapp?.numeroNegocio ?? DEFAULTS.numeroWhatsApp,
      horaApertura:
        configuracion.horarios?.apertura ?? DEFAULTS.horaApertura,
      horaCierre: configuracion.horarios?.cierre ?? DEFAULTS.horaCierre,
      diasPrepMin:
        configuracion.horarios?.diasPreparacionMin ?? DEFAULTS.diasPrepMin,
      diasPrepMax:
        configuracion.horarios?.diasPreparacionMax ?? DEFAULTS.diasPrepMax,
    });
  }, [configuracion]);

  const handleGuardarConfiguracion = async (seccion) => {
    setGuardando(true);

    const payloadPorSeccion = {
      cupones: {
        cupones: {
          descuentoEfectivoPorcentaje: Number(config.descuentoEfectivo),
          montoEnvioGratis: Number(config.montoEnvioGratis),
          permitirAcumulables: config.permitirAcumulables,
        },
      },
      envios: {
        envios: {
          precioZona1: Number(config.precioZona1),
          precioZona2: Number(config.precioZona2),
          precioZona3Base: Number(config.precioZona3Base),
          precioZona3PorKm: Number(config.precioZona3PorKm),
          radioCircunvalacion: Number(config.radioCircunvalacion),
          distanciaMaxima: Number(config.distanciaMaxima),
          envioGratisHabilitado: config.envioGratisHabilitado,
          zonasEnvioGratis: config.zonasEnvioGratis,
          direccionLocal: config.direccionLocal,
          coordenadasLocal: configuracion?.envios?.coordenadasLocal || {
            lat: -31.4357962331744,
            lng: -64.21897230399425,
          },
        },
      },
      whatsapp: {
        whatsapp: {
          numeroNegocio: config.numeroWhatsApp,
          apiConfigurada: false,
        },
      },
      horarios: {
        horarios: {
          apertura: config.horaApertura,
          cierre: config.horaCierre,
          diasPreparacionMin: Number(config.diasPrepMin),
          diasPreparacionMax: Number(config.diasPrepMax),
        },
      },
    };

    const datosActualizar = payloadPorSeccion[seccion] || {};
    const result = await updateConfiguracion(datosActualizar);

    alert(
      result.success
        ? "Configuración actualizada correctamente"
        : "Error al actualizar la configuración"
    );

    setGuardando(false);
  };

  return { config, setConfig, guardando, handleGuardarConfiguracion };
}
