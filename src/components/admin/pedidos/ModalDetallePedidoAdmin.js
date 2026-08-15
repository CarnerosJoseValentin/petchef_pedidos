import { getEstadoLabel, getEstadoColorModal } from "../../../utils/estadoPedidoAdminConfig";

export default function ModalDetallePedidoAdmin({ pedido, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">
            Detalle del Pedido #{pedido.numeroPedido}
          </h2>
          <button onClick={onCerrar} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Estado del pedido */}
          <div>
            <h3 className="font-bold text-primary mb-2">Estado</h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-block px-4 py-2 rounded-full font-bold ${getEstadoColorModal(pedido.estado)}`}>
                {getEstadoLabel(pedido.estado)}
              </span>

              {pedido.stockRestaurado && (
                <span className="inline-block px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-300">
                  ✅ Stock restaurado
                </span>
              )}
            </div>
            {pedido.stockRestaurado && pedido.fechaRestauracion && (
              <p className="text-xs text-gray-600 mt-2">
                Fecha de restauración:{" "}
                {new Date(pedido.fechaRestauracion.seconds * 1000).toLocaleString("es-AR")}
              </p>
            )}
          </div>

          {/* Información del cliente */}
          <div>
            <h3 className="font-bold text-primary mb-2">Cliente</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Nombre:</span> {pedido.usuario?.nombre}</p>
              <p><span className="font-medium">Email:</span> {pedido.usuario?.email}</p>
              <p><span className="font-medium">Teléfono:</span> {pedido.usuario?.telefono || "N/A"}</p>
            </div>
          </div>

          {/* Viandas */}
          <div>
            <h3 className="font-bold text-primary mb-2">Detalle de Viandas</h3>
            {pedido.viandas && pedido.viandas.length > 0 ? (
              <div className="space-y-3">
                {pedido.viandas.map((vianda, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-primary">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">
                        {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{vianda.mascotaNombre}</p>
                        <p className="text-sm text-gray-600">
                          📦 {vianda.cantidadViandas} viandas
                        </p>
                        {vianda.tipoCoccion && (
                          <div className="mt-1">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                vianda.tipoCoccion === "cruda"
                                  ? "bg-red-100 text-red-800 border-2 border-red-400"
                                  : "bg-orange-100 text-orange-800 border-2 border-orange-400"
                              }`}
                            >
                              {vianda.tipoCoccion === "cruda" ? "🥩 CRUDA" : "🍲 COCIDA"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 ml-10">
                      <p className="mb-1 font-medium">Ingredientes por vianda:</p>
                      <ul className="space-y-1">
                        {vianda.ingredientes?.map((ing, i) => (
                          <li key={i}>• {ing.nombre}: {ing.gramos}g</li>
                        ))}
                      </ul>
                    </div>
                    <div className="ml-10 mt-2 text-sm font-medium text-primary">
                      Subtotal: ${vianda.subtotal?.toLocaleString()}
                    </div>

                    {vianda.notas && (
                      <div className="mt-3 bg-yellow-100 border-4 border-yellow-400 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">⚠️</span>
                          <div className="flex-1">
                            <p className="font-bold text-yellow-900 text-sm mb-1">
                              📝 OBSERVACIONES DEL CLIENTE:
                            </p>
                            <p className="text-sm text-yellow-900 font-medium">{vianda.notas}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Tipo: {pedido.tipoMascota === "perro" ? "Perro 🐕" : "Gato 🐱"}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Cantidad: {pedido.cantidadViandas} viandas
                </p>
                <div className="space-y-2">
                  {pedido.ingredientes?.map((ing, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{ing.nombre}: {ing.gramos}g por vianda</span>
                      <span className="font-medium">
                        Total: {ing.gramos * pedido.cantidadViandas}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Entrega */}
          <div>
            <h3 className="font-bold text-primary mb-2">Entrega</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Tipo:</span> {pedido.entrega?.tipo === "retiro" ? "🏪 Retiro en local" : "🚚 Envío a domicilio"}</p>
              <p><span className="font-medium">Dirección:</span> {pedido.entrega?.direccion}</p>
              {pedido.entrega?.referencia && (
                <p><span className="font-medium">Referencia:</span> {pedido.entrega.referencia}</p>
              )}
              <p><span className="font-medium">Fecha:</span> {pedido.entrega?.fecha}</p>
              {pedido.entrega?.franjaHoraria && (
                <p><span className="font-medium">Horario:</span> {pedido.entrega.franjaHoraria}</p>
              )}
              {pedido.entrega?.zona && (
                <p><span className="font-medium">Zona:</span> {pedido.entrega.zona === "dentro" ? "Dentro de circunvalación" : "Fuera de circunvalación"}</p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <h3 className="font-bold text-primary mb-2">Desglose de Precios</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal viandas</span>
                <span className="font-medium">${pedido.precios?.subtotalViandas?.toLocaleString()}</span>
              </div>
              {pedido.precios?.descuentoCupones > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento cupones</span>
                  <span className="font-medium">-${pedido.precios.descuentoCupones.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.descuentoEfectivo > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento efectivo</span>
                  <span className="font-medium">-${pedido.precios.descuentoEfectivo.toLocaleString()}</span>
                </div>
              )}
              {pedido.precios?.costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-medium">+${pedido.precios.costoEnvio.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-primary text-lg">
                <span>TOTAL</span>
                <span>${pedido.precios?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <h3 className="font-bold text-primary mb-2">Método de Pago</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium">
                {pedido.metodoPago === "efectivo" ? "💵 Efectivo" : "💳 MercadoPago"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Estado de pago: <span className="capitalize">{pedido.estadoPago}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <button
            onClick={onCerrar}
            className="w-full bg-secondary text-white px-6 py-3 rounded-lg hover:bg-primary transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
