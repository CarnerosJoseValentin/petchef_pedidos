const toggleZona = (config, setConfig, zona) => (e) => {
  const zonas = e.target.checked
    ? [...config.zonasEnvioGratis, zona]
    : config.zonasEnvioGratis.filter((z) => z !== zona);
  setConfig({ ...config, zonasEnvioGratis: zonas });
};

export default function SeccionEnvios({ config, setConfig, guardando, onGuardar }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-primary mb-4">
        Configuración de Envíos
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-primary mb-2">
          Dirección del local
        </label>
        <input
          type="text"
          value={config.direccionLocal}
          onChange={(e) => setConfig({ ...config, direccionLocal: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Las distancias se calculan desde esta dirección
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Radio de circunvalación (km)
          </label>
          <input
            type="number"
            min="1"
            max="50"
            step="0.5"
            value={config.radioCircunvalacion}
            onChange={(e) =>
              setConfig({ ...config, radioCircunvalacion: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Define el límite de la Zona 1</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Distancia máxima de entrega (km)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={config.distanciaMaxima}
            onChange={(e) => setConfig({ ...config, distanciaMaxima: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pedidos fuera de este rango serán rechazados
          </p>
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="font-bold text-primary mb-4">Precios por Zona</h3>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-primary mb-2">
              Zona 1 - Dentro de circunvalación (0 - {config.radioCircunvalacion} km)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">$</span>
              <input
                type="number"
                min="0"
                value={config.precioZona1}
                onChange={(e) => setConfig({ ...config, precioZona1: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-primary mb-2">
              Zona 2 - Fuera hasta 3 km ({config.radioCircunvalacion} -{" "}
              {Number(config.radioCircunvalacion) + 3} km)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">$</span>
              <input
                type="number"
                min="0"
                value={config.precioZona2}
                onChange={(e) => setConfig({ ...config, precioZona2: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-primary mb-2">
              Zona 3 - Más de 3 km fuera (&gt; {Number(config.radioCircunvalacion) + 3} km)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Precio base</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">$</span>
                  <input
                    type="number"
                    min="0"
                    value={config.precioZona3Base}
                    onChange={(e) =>
                      setConfig({ ...config, precioZona3Base: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  + Por km adicional
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">$</span>
                  <input
                    type="number"
                    min="0"
                    value={config.precioZona3PorKm}
                    onChange={(e) =>
                      setConfig({ ...config, precioZona3PorKm: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Ejemplo: {Number(config.radioCircunvalacion) + 6} km = $
              {Number(config.precioZona3Base) + 700 * 3} (base + 3 km adicionales)
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-bold text-primary mb-4">Envío Gratis</h3>

        <div className="mb-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.envioGratisHabilitado}
              onChange={(e) =>
                setConfig({ ...config, envioGratisHabilitado: e.target.checked })
              }
              className="w-5 h-5 text-secondary"
            />
            <span className="text-sm font-medium text-primary">
              Habilitar envío gratis por monto mínimo
            </span>
          </label>
        </div>

        {config.envioGratisHabilitado && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Aplicar a estas zonas:
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.zonasEnvioGratis.includes(1)}
                    onChange={toggleZona(config, setConfig, 1)}
                    className="w-4 h-4 text-secondary"
                  />
                  <span className="text-sm text-gray-700">
                    Zona 1 - Dentro de circunvalación
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.zonasEnvioGratis.includes(2)}
                    onChange={toggleZona(config, setConfig, 2)}
                    className="w-4 h-4 text-secondary"
                  />
                  <span className="text-sm text-gray-700">
                    Zona 2 - Fuera hasta 3 km
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.zonasEnvioGratis.includes(3)}
                    onChange={toggleZona(config, setConfig, 3)}
                    className="w-4 h-4 text-secondary"
                  />
                  <span className="text-sm text-gray-700">
                    Zona 3 - Más de 3 km fuera
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                El envío será gratis solo si el monto supera $
                {config.montoEnvioGratis.toLocaleString()} Y la zona está seleccionada
              </p>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => onGuardar("envios")}
        disabled={guardando}
        className="mt-4 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar configuración de envíos"}
      </button>
    </div>
  );
}
