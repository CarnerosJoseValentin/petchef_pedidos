import { Card } from "../ui/Card";

export default function SelectorCoccion({ mascotaNombre, tipoCoccion, setTipoCoccion }) {
  return (
    <Card className="mt-6 border-2 border-secondary">
      <h3 className="font-bold text-primary mb-4">
        ¿Cómo quieres la vianda para {mascotaNombre}?
      </h3>
      <div className="space-y-3">
        <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 has-[:checked]:border-secondary has-[:checked]:bg-blue-50">
          <input
            type="radio"
            name="tipoCoccion"
            value="cruda"
            checked={tipoCoccion === "cruda"}
            onChange={(e) => setTipoCoccion(e.target.value)}
            className="w-5 h-5 text-secondary"
          />
          <div className="ml-3">
            <span className="font-medium text-primary text-lg">🥩 Cruda</span>
            <p className="text-xs text-gray-600 mt-1">
              Los ingredientes se entregarán sin cocción
            </p>
          </div>
        </label>

        <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 has-[:checked]:border-secondary has-[:checked]:bg-blue-50">
          <input
            type="radio"
            name="tipoCoccion"
            value="cocida"
            checked={tipoCoccion === "cocida"}
            onChange={(e) => setTipoCoccion(e.target.value)}
            className="w-5 h-5 text-secondary"
          />
          <div className="ml-3">
            <span className="font-medium text-primary text-lg">🍲 Cocida</span>
            <p className="text-xs text-gray-600 mt-1">
              Los ingredientes se cocinarán antes de entregar
            </p>
          </div>
        </label>
      </div>
    </Card>
  );
}
