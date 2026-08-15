import { Card } from "../ui/Card";
import { estadoConfig } from "../../utils/estadoPedidoConfig";

export default function FiltroEstadoPedidos({ filtroEstado, setFiltroEstado }) {
  return (
    <Card className="mb-6">
      <h3 className="font-bold text-primary mb-3">Filtrar por estado:</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filtroEstado === null
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Todos
        </button>
        {Object.entries(estadoConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filtroEstado === key
                ? config.color
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {config.icono} {config.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
