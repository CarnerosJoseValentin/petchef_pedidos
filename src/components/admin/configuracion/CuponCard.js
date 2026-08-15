import { useState } from "react";
import { updateCupon } from "../../../lib/firestore";

const formatearFecha = (timestamp) => {
  if (!timestamp) return "Sin vencimiento";
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return fecha.toLocaleDateString("es-AR");
};

export default function CuponCard({ cupon, onRecargar }) {
  const [actualizando, setActualizando] = useState(false);

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
}
