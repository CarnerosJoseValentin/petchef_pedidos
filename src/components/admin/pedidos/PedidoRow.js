import { getEstadoColor } from "../../../utils/estadoPedidoAdminConfig";
import { formatearFechaHoraCorta } from "../../../utils/fechas";

export default function PedidoRow({ pedido, onVerDetalle, onCambiarEstado }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-primary text-lg">#{pedido.numeroPedido}</h3>
          <p className="text-sm text-gray-600">
            {pedido.usuario?.nombre} - {pedido.usuario?.email}
          </p>
          <p className="text-xs text-gray-500">
            {formatearFechaHoraCorta(pedido.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary text-lg">
            ${pedido.precios?.total?.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">{pedido.cantidadViandas} viandas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-600">Pago</p>
          <p className="text-sm font-medium">
            {pedido.metodoPago === "efectivo" ? "Efectivo" : "Naranja X"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Entrega</p>
          <p className="text-sm font-medium">
            {pedido.entrega?.tipo === "retiro" ? "Retiro en local" : "Envío a domicilio"}
          </p>
          <p className="text-xs text-gray-500">{pedido.entrega?.fecha}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Estado</p>
          <select
            value={pedido.estado}
            onChange={(e) => onCambiarEstado(pedido.id, e.target.value)}
            className={`text-sm font-medium px-3 py-1 rounded border ${getEstadoColor(pedido.estado)}`}
          >
            <option value="pendiente">Pendiente</option>
            <option value="preparacion">En Preparación</option>
            <option value="listo">Listo</option>
            <option value="en_camino">🚚 En Camino</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => onVerDetalle(pedido)}
        className="text-secondary text-sm hover:underline"
      >
        Ver detalle completo
      </button>
    </div>
  );
}
