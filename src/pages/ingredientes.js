import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../hooks/useAuth";
import { useIngredientes } from "../hooks/useIngredientes";
import { useSeleccionIngredientes } from "../hooks/useSeleccionIngredientes";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Layout from "../components/layout/Layout";
import ListaIngredientesPorCategoria from "../components/ingredientes/ListaIngredientesPorCategoria";
import SelectorCoccion from "../components/ingredientes/SelectorCoccion";
import CampoNotas from "../components/ingredientes/CampoNotas";
import ResumenVianda from "../components/ingredientes/ResumenVianda";

export default function Ingredientes() {
  const router = useRouter();
  const { animalId, tipo } = router.query;
  const { userData, loading: userLoading } = useAuth();
  const { ingredientes, loading: ingredientesLoading } = useIngredientes(tipo, true);
  const [tipoCoccion, setTipoCoccion] = useState("");
  const [notas, setNotas] = useState("");
  const [mascota, setMascota] = useState(null);

  useEffect(() => {
    if (userData && animalId) {
      const mascotaEncontrada = userData.mascotas?.find((m) => m.id === animalId);
      setMascota(mascotaEncontrada);
    }
  }, [userData, animalId]);

  const {
    cantidades,
    stockUsadoEnCarrito,
    getStockDisponible,
    handleCantidadChange,
    calcularTotal,
    calcularPesoTotal,
    hayCarrito,
    continuar,
  } = useSeleccionIngredientes({
    ingredientes,
    animalId,
    mascotaNombre: mascota?.nombre,
    tipo,
    tipoCoccion,
    notas,
  });

  if (userLoading || ingredientesLoading) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-primary text-xl">Cargando ingredientes...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!animalId || !tipo) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-gray-600 mb-4">Error: No se seleccionó ningún animal</p>
              <Button onClick={() => router.push("/seleccionar-animal")}>
                Volver a Seleccionar Animal
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!mascota) {
    return (
      <ProtectedRoute allowedRoles={["cliente"]}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-gray-600 mb-4">Error: Animal no encontrado</p>
              <Button onClick={() => router.push("/seleccionar-animal")}>
                Volver a Seleccionar Animal
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const total = calcularTotal();

  return (
    <ProtectedRoute allowedRoles={["cliente"]}>
      <Layout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto pt-8">
            <div className="bg-blue-50 p-6 rounded-lg mb-6 border-2 border-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{tipo === "perro" ? "🐕" : "🐱"}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      Armando vianda para {mascota.nombre}
                    </h2>
                    <p className="text-sm text-gray-600 capitalize">{tipo}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/seleccionar-animal")}
                  className="text-secondary hover:underline text-sm"
                >
                  ← Cambiar animal
                </button>
              </div>
            </div>

            {Object.keys(stockUsadoEnCarrito).length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ℹ️ Ya tienes ingredientes en tu carrito. El stock mostrado es el
                  disponible para esta nueva vianda.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-primary mb-4">
                Selecciona los ingredientes
              </h3>

              <ListaIngredientesPorCategoria
                ingredientes={ingredientes}
                tipo={tipo}
                cantidades={cantidades}
                stockUsadoEnCarrito={stockUsadoEnCarrito}
                getStockDisponible={getStockDisponible}
                onCantidadChange={handleCantidadChange}
              />
            </div>

            {total > 0 && (
              <SelectorCoccion
                mascotaNombre={mascota.nombre}
                tipoCoccion={tipoCoccion}
                setTipoCoccion={setTipoCoccion}
              />
            )}

            {total > 0 && <CampoNotas notas={notas} setNotas={setNotas} />}

            {total > 0 && (
              <ResumenVianda
                mascotaNombre={mascota.nombre}
                total={total}
                pesoTotal={calcularPesoTotal()}
              />
            )}

            <div className="mt-8 space-y-3 max-w-md mx-auto">
              <Button onClick={continuar} disabled={total === 0} className="w-full">
                Continuar con esta Vianda
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push(hayCarrito() ? "/carrito" : "/seleccionar-animal")}
                className="w-full"
              >
                {hayCarrito() ? "← Volver al Carrito" : "← Volver a Mis Amig@s"}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
