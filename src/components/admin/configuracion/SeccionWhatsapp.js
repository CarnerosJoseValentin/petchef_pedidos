export default function SeccionWhatsapp({ config, setConfig, guardando, onGuardar }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-primary mb-4">
        Notificaciones WhatsApp
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-primary mb-2">
          Número WhatsApp Business
        </label>
        <input
          type="text"
          placeholder="+54 9 XXX XXXX XXXX"
          value={config.numeroWhatsApp}
          onChange={(e) => setConfig({ ...config, numeroWhatsApp: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
        />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Estado:</strong> API no configurada
        </p>
        <p className="text-xs text-yellow-700 mt-2">
          La integración con WhatsApp Business API requiere configuración adicional
        </p>
      </div>

      <button
        onClick={() => onGuardar("whatsapp")}
        disabled={guardando}
        className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar número de WhatsApp"}
      </button>
    </div>
  );
}
