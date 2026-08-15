export default function SelectorFecha({ tipoEntrega, fecha, setFecha, fechaMinima, configuracion }) {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-primary mb-2">
        Fecha de {tipoEntrega === "retiro" ? "retiro" : "entrega"}
      </label>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        min={fechaMinima}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
      />
      <p className="text-xs text-gray-600 mt-1">
        Mínimo {configuracion?.horarios?.diasPreparacionMin || 2} días hábiles, máximo{" "}
        {configuracion?.horarios?.diasPreparacionMax || 7} días
      </p>
    </div>
  );
}
