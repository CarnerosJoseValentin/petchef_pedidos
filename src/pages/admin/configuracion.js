import { useState, useEffect } from "react";
import { useConfiguracion } from "../../hooks/useConfiguracion";
import { useConfiguracionForm } from "../../hooks/useConfiguracionForm";
import { getCupones } from "../../lib/firestore";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Layout from "../../components/layout/Layout";
import SeccionCuponesDescuentos from "../../components/admin/configuracion/SeccionCuponesDescuentos";
import SeccionCuponesPromocionales from "../../components/admin/configuracion/SeccionCuponesPromocionales";
import SeccionEnvios from "../../components/admin/configuracion/SeccionEnvios";
import SeccionWhatsapp from "../../components/admin/configuracion/SeccionWhatsapp";
import SeccionHorarios from "../../components/admin/configuracion/SeccionHorarios";

export default function AdminConfiguracion() {
  const { configuracion, loading } = useConfiguracion();
  const { config, setConfig, guardando, handleGuardarConfiguracion } =
    useConfiguracionForm(configuracion);
  const [cupones, setCupones] = useState([]);

  useEffect(() => {
    cargarCupones();
  }, []);

  const cargarCupones = async () => {
    const result = await getCupones(false); // Traer todos, activos e inactivos
    if (result.success) {
      setCupones(result.data);
    }
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
          <h1 className="text-3xl font-bold text-primary mb-8">Configuración</h1>

          <SeccionCuponesDescuentos
            config={config}
            setConfig={setConfig}
            guardando={guardando}
            onGuardar={handleGuardarConfiguracion}
          />

          <SeccionCuponesPromocionales
            cupones={cupones}
            onRecargar={cargarCupones}
          />

          <SeccionEnvios
            config={config}
            setConfig={setConfig}
            guardando={guardando}
            onGuardar={handleGuardarConfiguracion}
          />

          <SeccionWhatsapp
            config={config}
            setConfig={setConfig}
            guardando={guardando}
            onGuardar={handleGuardarConfiguracion}
          />

          <SeccionHorarios
            config={config}
            setConfig={setConfig}
            guardando={guardando}
            onGuardar={handleGuardarConfiguracion}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
