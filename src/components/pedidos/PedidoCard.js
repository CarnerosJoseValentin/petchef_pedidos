import { Card } from "../ui/Card";
import { estadoConfig } from "../../utils/estadoPedidoConfig";
import { formatearFechaCorta } from "../../utils/fechas";

export default function PedidoCard({ pedido, onVerDetalle, onRepetir }) {
  const config = estadoConfig[pedido.estado] || estadoConfig.pendiente;
  const totalViandas =
    pedido.viandas?.reduce((sum, v) => sum + v.cantidadViandas, 0) || 0;

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.color}`}>
              {config.icono} {config.label}
            </span>
            <span className="text-lg font-bold text-secondary">
              #{pedido.numeroPedido}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>📅 {formatearFechaCorta(pedido.createdAt)}</p>
            <p>
              🐾 {totalViandas} viandas para {pedido.viandas?.length || 0} mascota(s)
            </p>
            <p>
              {pedido.entrega?.tipo === "retiro" ? "🏪 Retiro" : "🚚 Envío"} - Fecha:{" "}
              {pedido.entrega?.fecha}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-primary">
              ${pedido.precios?.total?.toLocaleString() || "0"}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onVerDetalle(pedido)}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors text-sm"
            >
              Ver detalle
            </button>
            {pedido.estado === "entregado" && (
              <button
                onClick={() => onRepetir(pedido)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                title="Repetir este pedido"
              >
                🔄 Repetir
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
