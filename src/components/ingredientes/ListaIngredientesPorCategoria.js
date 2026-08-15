import { useState } from "react";
import { Card } from "../ui/Card";
import TooltipEquivalencias from "./TooltipEquivalencias";

const CATEGORIAS_CONFIG = [
  { key: "carnes", label: "CARNES" },
  { key: "vegetales", label: "VEGETALES" },
  { key: "suplementos", label: "SUPLEMENTOS" },
  { key: "otros", label: "OTROS" },
];

// Prevenir cambio de valor con scroll del mouse en inputs number enfocados
const handleWheel = (e) => {
  if (e.target.type === "number" && document.activeElement === e.target) {
    e.preventDefault();
  }
};

export default function ListaIngredientesPorCategoria({
  ingredientes,
  tipo,
  cantidades,
  stockUsadoEnCarrito,
  getStockDisponible,
  onCantidadChange,
}) {
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  const toggleCategoria = (categoria) => {
    setCategoriasAbiertas((prev) => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  if (ingredientes.length === 0) {
    return (
      <Card className="text-center p-8">
        <p className="text-gray-600">
          No hay ingredientes disponibles para {tipo}s en este momento.
        </p>
      </Card>
    );
  }

  const ingredientesPorCategoria = CATEGORIAS_CONFIG.map((cat) => ({
    ...cat,
    ingredientes: ingredientes.filter((ing) => ing.categoria === cat.key),
  })).filter((cat) => cat.ingredientes.length > 0);

  return (
    <div className="space-y-6">
      {ingredientesPorCategoria.map((categoria) => (
        <div
          key={categoria.key}
          className="border-2 border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggleCategoria(categoria.key)}
            className="w-full bg-gray-100 hover:bg-gray-200 transition-colors p-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-primary">{categoria.label}</h3>
              <span className="text-sm text-gray-600">
                ({categoria.ingredientes.length}{" "}
                {categoria.ingredientes.length === 1 ? "ingrediente" : "ingredientes"})
              </span>
            </div>
            <span className="text-2xl text-gray-600">
              {categoriasAbiertas[categoria.key] ? "▼" : "▶"}
            </span>
          </button>

          {categoriasAbiertas[categoria.key] && (
            <div className="p-4 space-y-4 bg-white">
              {categoria.ingredientes.map((ingrediente) => {
                const stockReal = getStockDisponible(
                  ingrediente.id,
                  ingrediente.stockGramos
                );

                return (
                  <Card key={ingrediente.id} className="border">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-primary">{ingrediente.nombre}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={stockReal}
                          step="0.01"
                          placeholder="0"
                          className="w-24 p-2 border rounded text-center"
                          value={cantidades[ingrediente.id] || ""}
                          onChange={(e) =>
                            onCantidadChange(ingrediente.id, e.target.value, ingrediente)
                          }
                          onWheel={handleWheel}
                          disabled={stockReal === 0}
                        />
                        <span className="text-sm text-gray-500">gramos</span>
                        <TooltipEquivalencias />
                      </div>
                    </div>
                    {stockReal === 0 && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        ⚠️ Sin stock disponible (todo en tu carrito)
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
