import { useState } from "react";
import { createCupon } from "../../../lib/firestore";

export default function ModalCrearCupon({ onCerrar, onCreado }) {
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
}
