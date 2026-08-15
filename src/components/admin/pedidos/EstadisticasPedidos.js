const StatCard = ({ title, value, color }) => (
  <div className={`${color} rounded-lg p-4 border border-gray-200`}>
    <p className="text-sm text-gray-600">{title}</p>
    <p className="text-2xl font-bold text-primary">{value}</p>
  </div>
);

export default function EstadisticasPedidos({ pedidos }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <StatCard title="Todos" value={pedidos.length} color="bg-gray-100" />
      <StatCard
        title="Pendientes"
        value={pedidos.filter((p) => p.estado === "pendiente").length}
        color="bg-yellow-100"
      />
      <StatCard
        title="En Preparación"
        value={pedidos.filter((p) => p.estado === "preparacion").length}
        color="bg-blue-100"
      />
      <StatCard
        title="Listos"
        value={pedidos.filter((p) => p.estado === "listo").length}
        color="bg-green-100"
      />
      <StatCard
        title="En Camino"
        value={pedidos.filter((p) => p.estado === "en_camino").length}
        color="bg-orange-100"
      />
      <StatCard
        title="Entregados"
        value={pedidos.filter((p) => p.estado === "entregado").length}
        color="bg-gray-100"
      />
    </div>
  );
}
