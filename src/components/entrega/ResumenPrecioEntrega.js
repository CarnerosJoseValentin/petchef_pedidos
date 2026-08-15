import { Card } from "../ui/Card";

export default function ResumenPrecioEntrega({
  subtotal,
  tipoEntrega,
  zonaInfo,
  costoEnvio,
  total,
}) {
  return (
    <Card className="mb-6 bg-blue-50 border-blue-200">
      <h3 className="font-bold text-primary mb-4">Resumen Actualizado</h3>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-medium">${subtotal.toLocaleString()}</span>
        </div>

        {tipoEntrega === "envio" && zonaInfo && (
          <div className="flex justify-between text-sm">
            <span>Envío ({zonaInfo.nombre})</span>
            <span className="font-medium">
              {costoEnvio === 0 ? "GRATIS" : `+$${costoEnvio.toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-blue-300 pt-4">
        <div className="flex justify-between font-bold text-primary text-lg">
          <span>TOTAL FINAL</span>
          <span>${total.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
}
