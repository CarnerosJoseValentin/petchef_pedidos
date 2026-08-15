export default function SeccionHorarios({ config, setConfig, guardando, onGuardar }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-primary mb-4">
        Horarios y Producción
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Hora de apertura
          </label>
          <input
            type="time"
            value={config.horaApertura}
            onChange={(e) => setConfig({ ...config, horaApertura: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Hora de cierre
          </label>
          <input
            type="time"
            value={config.horaCierre}
            onChange={(e) => setConfig({ ...config, horaCierre: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Días de preparación mínimo
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.diasPrepMin}
            onChange={(e) => setConfig({ ...config, diasPrepMin: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Días de preparación máximo
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.diasPrepMax}
            onChange={(e) => setConfig({ ...config, diasPrepMax: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
          />
        </div>
      </div>

      <button
        onClick={() => onGuardar("horarios")}
        disabled={guardando}
        className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar configuración de horarios"}
      </button>
    </div>
  );
}
