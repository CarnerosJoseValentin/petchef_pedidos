import { Card } from "../ui/Card";

export default function ResumenViandas({ viandas }) {
  return (
    <Card className="mb-4">
      <h3 className="font-bold text-primary mb-3">Viandas en tu pedido:</h3>
      <div className="space-y-2">
        {viandas.map((vianda, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>
              {vianda.mascotaTipo === "perro" ? "🐕" : "🐱"} {vianda.mascotaNombre} (
              {vianda.cantidadViandas})
            </span>
            <span className="font-medium">${vianda.subtotal.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
