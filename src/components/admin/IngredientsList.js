import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useIngredientes } from "../../hooks/useIngredientes";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const IngredientsList = ({ onEditIngredient, onNewIngredient }) => {
  const { ingredientes, loading } = useIngredientes(null, false); // false = traer todos
  const [filter, setFilter] = useState("todos");

  const handleDelete = async (ingredienteId) => {
    if (confirm("¿Estás seguro de eliminar este ingrediente?")) {
      await deleteDoc(doc(db, "ingredientes", ingredienteId));
    }
  };

  const handleToggleActive = async (ingrediente) => {
    await updateDoc(doc(db, "ingredientes", ingrediente.id), {
      activo: !ingrediente.activo,
      updatedAt: new Date(),
    });
  };

  const filteredIngredientes = ingredientes.filter((ing) => {
    if (filter === "todos") return true;
    if (filter === "activos") return ing.activo;
    if (filter === "inactivos") return !ing.activo;
    if (filter === "bajo_stock") return ing.stockGramos <= ing.stockMinimo;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8">Cargando ingredientes...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">
          Gestión de Ingredientes
        </h2>
        <Button onClick={onNewIngredient} className="!w-auto mx-2 my-2 px-4 py-2 text-sm">
          + Nuevo Ingrediente
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex space-x-4">
        <FilterButton
          active={filter === "todos"}
          onClick={() => setFilter("todos")}
        >
          Todos ({ingredientes.length})
        </FilterButton>
        <FilterButton
          active={filter === "activos"}
          onClick={() => setFilter("activos")}
        >
          Activos ({ingredientes.filter((i) => i.activo).length})
        </FilterButton>
        <FilterButton
          active={filter === "bajo_stock"}
          onClick={() => setFilter("bajo_stock")}
        >
          Bajo Stock (
          {ingredientes.filter((i) => i.stockGramos <= i.stockMinimo).length})
        </FilterButton>
      </div>

      {/* Lista de ingredientes */}
      <div className="space-y-4">
        {filteredIngredientes.map((ingrediente) => (
          <Card key={ingrediente.id} className="border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-primary">
                    {ingrediente.nombre}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ingrediente.activo
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ingrediente.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <strong>Categoría:</strong> {ingrediente.categoria}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {ingrediente.tipoMascota}
                  </div>
                  <div>
                    <strong>Precio:</strong> ${ingrediente.precioGramo}/gramo
                  </div>
                  <div>
                    <strong>Stock:</strong>
                    <span
                      className={
                        ingrediente.stockGramos <= ingrediente.stockMinimo
                          ? "text-orange-600 font-bold ml-1"
                          : "ml-1"
                      }
                    >
                      {ingrediente.stockGramos.toLocaleString("es-AR")}g
                    </span>
                    {ingrediente.stockGramos <= ingrediente.stockMinimo && (
                      <span className="text-orange-600"> ⚠️ Bajo</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEditIngredient(ingrediente)}
                  className="p-2 text-secondary hover:bg-blue-50 rounded"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleToggleActive(ingrediente)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                  title={ingrediente.activo ? "Desactivar" : "Activar"}
                >
                  {ingrediente.activo ? "🟢" : "🔴"}
                </button>
                <button
                  onClick={() => handleDelete(ingrediente.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredIngredientes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay ingredientes con este filtro
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      active
        ? "bg-secondary text-white"
        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

export default IngredientsList;
