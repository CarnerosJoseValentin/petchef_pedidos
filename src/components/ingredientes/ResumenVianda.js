export default function ResumenVianda({ mascotaNombre, total, pesoTotal }) {
  return (
    <div className="mt-6 bg-green-50 p-6 rounded-lg border-2 border-green-200">
      <div className="text-center">
        <div className="text-lg font-bold text-primary mb-2">
          Resumen de la vianda para {mascotaNombre}
        </div>
        <div className="text-3xl font-bold text-primary mb-1">
          ${total.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600">
          Peso total:{" "}
          {pesoTotal.toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          g
        </div>
        <div className="text-xs text-gray-500 mt-2">Precio por vianda individual</div>
      </div>
    </div>
  );
}
