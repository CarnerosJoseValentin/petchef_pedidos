import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { estadoConfig } from "../../utils/estadoPedidoConfig";
import { formatearFecha } from "../../utils/fechas";

export default function ModalDetallePedido({ pedido, onCerrar, onRepetir }) {
  if (!pedido) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            Pedido #{pedido.numeroPedido}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Estado */}
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full font-bold ${estadoConfig[pedido.estado]?.color}`}
            >
              {estadoConfig[pedido.estado]?.icono} {estadoConfig[pedido.estado]?.label}
            </span>
            <span className="text-sm text-gray-600">
              {formatearFecha(pedido.createdAt)}
            </span>
          </div>

          {/* Viandas */}
          <div>
            <h3 className="font-bold text-primary mb-3">Detalle de Viandas</h3>
            {pedido.viandas?.map((vianda, index) => (
              <Card key={index} className="mb-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"}
                  </span>
                  <div>
                    <p className="font-bold">{vianda.mascotaNombre}</p>
                    <p className="text-sm text-gray-600">
                      {vianda.cantidadViandas} viandas × $
                      {vianda.precioUnitario?.toLocaleString()}
                    </p>
                    {vianda.tipoCoccion && (
                      <p className="text-xs text-secondary font-medium mt-1">
                        {vianda.tipoCoccion === "cruda" ? "🥩 Cruda" : "🍲 Cocida"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 ml-10">
                  <p className="mb-1">Ingredientes:</p>
                  <ul className="space-y-1">
                    {vianda.ingredientes?.map((ing, i) => (
                      <li key={i}>
                        • {ing.nombre}: {ing.gramos}g
                      </li>
                    ))}
                  </ul>
                </div>
                {vianda.notas && (
                  <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 p-3 rounded">
                    <p className="text-xs font-bold text-yellow-900 mb-1">
                      📝 Observaciones:
                    </p>
                    <p className="text-sm text-yellow-900">{vianda.notas}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Entrega */}
          <div>
            <h3 className="font-bold text-primary mb-2">Datos de Entrega</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-600">Tipo:</span>{" "}
                {pedido.entrega?.tipo === "retiro"
                  ? "🏪 Retiro en local"
                  : "🚚 Envío a domicilio"}
              </p>
              <p>
                <span className="text-gray-600">Dirección:</span>{" "}
                {pedido.entrega?.direccion}
              </p>
              <p>
                <span className="text-gray-600">Fecha:</span> {pedido.entrega?.fecha}
              </p>
              {pedido.entrega?.franjaHoraria && (
                <p>
                  <span className="text-gray-600">Horario:</span>{" "}
                  {pedido.entrega.franjaHoraria}
                </p>
              )}
            </div>
          </div>

          {/* Resumen de pago */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-primary mb-2">Resumen de Pago</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${pedido.precios?.subtotalViandas?.toLocaleString()}</span>
              </div>
              {pedido.precios?.descuentoCupones > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Cupones:</span>
                  <span>-${pedido.precios.descuentoCupones.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.descuentoEfectivo > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento efectivo:</span>
                  <span>-${pedido.precios.descuentoEfectivo.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>+${pedido.precios.costoEnvio.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>TOTAL:</span>
                <span>${pedido.precios?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="text-sm">
            <span className="text-gray-600">Método de pago:</span>{" "}
            <span className="font-medium">
              {pedido.metodoPago === "efectivo" ? "💵 Efectivo" : "💳 MercadoPago"}
            </span>
          </div>
        </div>

        <div className="border-t p-4 flex gap-3">
          <Button onClick={onCerrar} variant="secondary" className="flex-1">
            Cerrar
          </Button>
          {pedido.estado === "entregado" && (
            <Button
              onClick={() => {
                onRepetir(pedido);
                onCerrar();
              }}
              className="flex-1"
            >
              🔄 Repetir Pedido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
