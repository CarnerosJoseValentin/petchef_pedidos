import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useAuth } from "../../hooks/useAuth";
import { useIngredientes } from "../../hooks/useIngredientes";
import Layout from "../../components/layout/Layout";

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { ingredientes, loading } = useIngredientes(null, false);

  // Esperar a que carguen los datos
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <Layout> 
          <div className="text-center py-8">Cargando estadísticas...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const ingredientesBajoStock = ingredientes.filter(
    (ing) => ing.stockGramos <= ing.stockMinimo
  );

  const stats = {
    totalIngredientes: ingredientes.length,
    ingredientesActivos: ingredientes.filter((ing) => ing.activo).length,
    ingredientesInactivos: ingredientes.filter((ing) => !ing.activo).length,
    ingredientesBajoStock: ingredientesBajoStock.length,
    valorTotalStock: ingredientes.reduce(
      (total, ing) => total + ing.stockGramos * ing.precioGramo,
      0
    ),
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>  
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-primary mb-8">Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
            <StatCard
              title="Total Ingredientes"
              value={stats.totalIngredientes}
              icon="📦"
            />
            <StatCard
              title="Ingredientes Activos"
              value={stats.ingredientesActivos}
              icon="✅"
            />
            <StatCard
              title="Ingredientes Inactivos"
              value={stats.ingredientesInactivos}
              icon="❌"
            />
            <StatCard
              title="Bajo Stock"
              value={stats.ingredientesBajoStock}
              icon="⚠️"
              alert={stats.ingredientesBajoStock > 0}
            />
            <StatCard
              title="Valor Stock Total"
              value={`$${stats.valorTotalStock.toLocaleString()}`}
              icon="💰"
            />
          </div>

          {ingredientesBajoStock.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold text-orange-800 mb-4">
                ⚠️ Ingredientes con Stock Bajo
              </h3>
              <div className="space-y-2">
                {ingredientesBajoStock.map((ing) => (
                  <div key={ing.id} className="flex justify-between text-sm">
                    <span className="font-medium">{ing.nombre}</span>
                    <span className="text-orange-600">
                      {ing.stockGramos}g (mín: {ing.stockMinimo}g)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

const StatCard = ({ title, value, icon, alert }) => (
  <div
    className={`bg-white rounded-lg p-4 lg:p-6 border ${
      alert ? "border-orange-300" : "border-gray-200"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p
          className={`text-2xl font-bold ${
            alert ? "text-orange-600" : "text-primary"
          }`}
        >
          {value}
        </p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);
