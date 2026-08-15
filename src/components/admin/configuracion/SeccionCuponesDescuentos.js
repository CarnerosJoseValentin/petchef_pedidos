export default function SeccionCuponesDescuentos({
  config,
  setConfig,
  guardando,
  onGuardar,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-primary mb-4">
        Cupones y Descuentos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Descuento por pago en efectivo (%)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              min="0"
              max="100"
              value={config.descuentoEfectivo}
              onChange={(e) =>
                setConfig({ ...config, descuentoEfectivo: e.target.value })
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
            <button
              onClick={() => onGuardar("cupones")}
              disabled={guardando}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Monto para envío gratis ($)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              min="0"
              value={config.montoEnvioGratis}
              onChange={(e) =>
                setConfig({ ...config, montoEnvioGratis: e.target.value })
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />
            <button
              onClick={() => onGuardar("cupones")}
              disabled={guardando}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.permitirAcumulables}
            onChange={() =>
              setConfig({
                ...config,
                permitirAcumulables: !config.permitirAcumulables,
              })
            }
            className="w-5 h-5 text-secondary"
          />
          <span className="text-sm font-medium text-primary">
            Permitir cupones acumulables
          </span>
        </label>
      </div>

      <button
        onClick={() => onGuardar("cupones")}
        disabled={guardando}
        className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar configuración de cupones"}
      </button>
    </div>
  );
}
