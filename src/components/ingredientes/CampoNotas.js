import { Card } from "../ui/Card";

export default function CampoNotas({ notas, setNotas }) {
  return (
    <Card className="mt-6 border-2 border-gray-200">
      <h3 className="font-bold text-primary mb-2">
        Observaciones o aclaraciones (opcional)
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        Ejemplo: "Alérgico a las uvas", "Sin zanahoria", "Trozos pequeños", etc.
      </p>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        maxLength={500}
        placeholder="Escribe aquí cualquier observación especial sobre esta vianda..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
        rows={4}
      />
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-500">
          💡 Esta mensaje será visible para el personal de producción
        </p>
        <p
          className={`text-xs font-medium ${
            notas.length > 450 ? "text-orange-600" : "text-gray-500"
          }`}
        >
          {notas.length}/500
        </p>
      </div>
    </Card>
  );
}
