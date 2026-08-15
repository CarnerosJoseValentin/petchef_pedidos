export default function OpcionRetiro({ seleccionado, onSeleccionar, configuracion }) {
  return (
    <div
      onClick={onSeleccionar}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        seleccionado ? "border-secondary bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <div className="flex items-center mb-2">
        <input
          type="radio"
          checked={seleccionado}
          onChange={onSeleccionar}
          className="mr-3 w-5 h-5"
        />
        <span className="text-lg font-bold text-primary">🏪 Retiro en Local</span>
      </div>

      <div className="ml-8 text-sm">
        <p className="text-gray-700">
          📍 {configuracion?.envios?.direccionLocal || "CUMBRES NEGRAS 2288, Córdoba"}
        </p>
        <p className="text-gray-600">
          🕐 Horario: Lunes a Viernes {configuracion?.horarios?.apertura || "08:00"} -{" "}
          {configuracion?.horarios?.cierre || "16:00"} hs
        </p>
        <p className="text-green-600 font-medium">💰 Sin costo adicional</p>
      </div>
    </div>
  );
}
