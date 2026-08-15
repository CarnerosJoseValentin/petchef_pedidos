import { Input } from "../ui/Input";

export default function OpcionEnvio({
  seleccionado,
  onSeleccionar,
  inputRef,
  validandoDireccion,
  errorDireccion,
  direccion,
  zonaInfo,
  distanciaKm,
  calleSinNumero,
  setCalleSinNumero,
  setErrorDireccion,
  referencia,
  setReferencia,
  franjaHoraria,
  setFranjaHoraria,
  franjasHorarias,
  costoEnvio,
  envioGratisPorCupon,
}) {
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
        <span className="text-lg font-bold text-primary">🚚 Envío a Domicilio</span>
      </div>

      {seleccionado && (
        <div className="ml-8 mt-4 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-primary mb-2">
              Dirección de entrega
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar dirección..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            />

            {validandoDireccion && (
              <p className="text-sm text-blue-600 mt-1">Validando zona...</p>
            )}

            {errorDireccion && (
              <p className="text-sm text-orange-600 mt-1">{errorDireccion}</p>
            )}

            {!validandoDireccion && !errorDireccion && direccion && zonaInfo && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-700 font-medium">✓ {zonaInfo.nombre}</p>
                <p className="text-xs text-green-600 mt-1">
                  📏 Distancia: {distanciaKm.toFixed(1)} km desde nuestro local
                </p>
                {zonaInfo.zona === 3 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Zona 3: se cobran {Math.ceil(zonaInfo.kmAdicionales)} km adicionales
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="calleSinNumero"
              checked={calleSinNumero}
              onChange={(e) => {
                setCalleSinNumero(e.target.checked);
                if (e.target.checked) setErrorDireccion("");
              }}
              className="w-4 h-4 text-secondary rounded focus:ring-2 focus:ring-secondary"
            />
            <label htmlFor="calleSinNumero" className="text-sm text-gray-700 cursor-pointer">
              Calle sin número
            </label>
          </div>

          <Input
            label="Referencia (opcional)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ej: Casa con portón verde"
          />

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Franja horaria
            </label>
            <select
              value={franjaHoraria}
              onChange={(e) => setFranjaHoraria(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
            >
              <option value="">Selecciona una franja</option>
              {franjasHorarias.map((franja) => (
                <option key={franja} value={franja}>
                  {franja}
                </option>
              ))}
            </select>
          </div>

          {costoEnvio === 0 && !errorDireccion && zonaInfo && (
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <p className="text-sm text-green-700 font-medium">✅ ¡Envío GRATIS!</p>
              {envioGratisPorCupon ? (
                <p className="text-xs text-green-600 mt-1">Por cupón aplicado</p>
              ) : (
                <p className="text-xs text-green-600 mt-1">Por monto mínimo alcanzado</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
