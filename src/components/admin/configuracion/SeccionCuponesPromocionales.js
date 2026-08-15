import { useState } from "react";
import CuponCard from "./CuponCard";
import ModalCrearCupon from "./ModalCrearCupon";

export default function SeccionCuponesPromocionales({ cupones, onRecargar }) {
  const [mostrarFormCupon, setMostrarFormCupon] = useState(false);

  return (
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
        <p className="text-gray-500 text-center py-4">No hay cupones creados</p>
      ) : (
        <div className="space-y-3">
          {cupones.map((cupon) => (
            <CuponCard key={cupon.id} cupon={cupon} onRecargar={onRecargar} />
          ))}
        </div>
      )}

      {mostrarFormCupon && (
        <ModalCrearCupon
          onCerrar={() => setMostrarFormCupon(false)}
          onCreado={onRecargar}
        />
      )}
    </div>
  );
}
