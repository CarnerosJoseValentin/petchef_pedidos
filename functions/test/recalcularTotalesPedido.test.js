import { jest } from "@jest/globals";
import { recalcularTotalesPedido } from "../index.js";
import { getFirestore } from "firebase-admin/firestore";

jest.setTimeout(20000);

const db = getFirestore();

// Crea un ingrediente con ID único (auto-generado) y devuelve su id, para
// no necesitar limpiar Firestore entre tests.
async function seedIngrediente({ precioGramo }) {
  const ref = db.collection("ingredientes").doc();
  await ref.set({ nombre: "Test", precioGramo, stockGramos: 99999 });
  return ref.id;
}

async function seedCupon(data) {
  const ref = db.collection("cupones").doc();
  await ref.set(data);
  return ref.id;
}

const pedidoConUnaVianda = (ingredienteId, gramos, cantidadViandas = 1) => ({
  viandas: [
    {
      cantidadViandas,
      ingredientes: [{ ingredienteId, gramos }],
    },
  ],
  precios: {},
});

describe("recalcularTotalesPedido", () => {
  test("calcula el subtotal a partir del precio ACTUAL del ingrediente, no de uno inventado", async () => {
    const ingId = await seedIngrediente({ precioGramo: 2 });
    const pedido = pedidoConUnaVianda(ingId, 500); // 500g * $2 = $1000

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.subtotalViandas).toBe(1000);
    expect(resultado.totalVerificado).toBe(1000);
  });

  test("multiplica por la cantidad de viandas", async () => {
    const ingId = await seedIngrediente({ precioGramo: 2 });
    const pedido = pedidoConUnaVianda(ingId, 500, 3); // $1000 * 3

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.subtotalViandas).toBe(3000);
  });

  test("suma varios ingredientes dentro de la misma vianda", async () => {
    const ing1 = await seedIngrediente({ precioGramo: 2 });
    const ing2 = await seedIngrediente({ precioGramo: 5 });
    const pedido = {
      viandas: [
        {
          cantidadViandas: 1,
          ingredientes: [
            { ingredienteId: ing1, gramos: 100 }, // 200
            { ingredienteId: ing2, gramos: 50 }, // 250
          ],
        },
      ],
      precios: {},
    };

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.subtotalViandas).toBe(450);
  });

  test("ignora el precio que venga en el pedido: SIEMPRE usa el de /ingredientes", async () => {
    const ingId = await seedIngrediente({ precioGramo: 2 });
    const pedido = pedidoConUnaVianda(ingId, 500);
    // Un pedido "manipulado" que trae un precioGramo propio, distinto al real
    pedido.viandas[0].ingredientes[0].precioGramo = 0.01;

    const resultado = await recalcularTotalesPedido(pedido);

    // Se ignora el 0.01 manipulado, se usa el $2 real de la colección
    expect(resultado.subtotalViandas).toBe(1000);
  });

  test("aplica un cupón de porcentaje activo", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const cuponId = await seedCupon({ activo: true, tipo: "porcentaje", valor: 10 });
    const pedido = pedidoConUnaVianda(ingId, 100); // subtotal $1000
    pedido.precios.cuponesAplicados = [{ id: cuponId }];

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.descuentoCupones).toBe(100); // 10% de 1000
    expect(resultado.totalVerificado).toBe(900);
  });

  test("aplica un cupón de monto fijo", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const cuponId = await seedCupon({ activo: true, tipo: "montoFijo", valor: 150 });
    const pedido = pedidoConUnaVianda(ingId, 100); // subtotal $1000
    pedido.precios.cuponesAplicados = [{ id: cuponId }];

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.descuentoCupones).toBe(150);
    expect(resultado.totalVerificado).toBe(850);
  });

  test("NO aplica un cupón inactivo (aunque el pedido diga que está aplicado)", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const cuponId = await seedCupon({ activo: false, tipo: "porcentaje", valor: 50 });
    const pedido = pedidoConUnaVianda(ingId, 100);
    pedido.precios.cuponesAplicados = [{ id: cuponId }];

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.descuentoCupones).toBe(0);
    expect(resultado.totalVerificado).toBe(1000);
  });

  test("NO aplica un cupón si no se alcanza el monto mínimo", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const cuponId = await seedCupon({
      activo: true,
      tipo: "porcentaje",
      valor: 50,
      montoMinimo: 5000,
    });
    const pedido = pedidoConUnaVianda(ingId, 100); // subtotal $1000, no llega a 5000

    pedido.precios.cuponesAplicados = [{ id: cuponId }];

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.descuentoCupones).toBe(0);
  });

  test("suma el costo de envío al total", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const pedido = pedidoConUnaVianda(ingId, 100); // subtotal $1000
    pedido.precios.costoEnvio = 200;

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.totalVerificado).toBe(1200);
  });

  test("el total nunca baja de 0, aunque el descuento sea mayor al subtotal", async () => {
    const ingId = await seedIngrediente({ precioGramo: 10 });
    const cuponId = await seedCupon({ activo: true, tipo: "montoFijo", valor: 999999 });
    const pedido = pedidoConUnaVianda(ingId, 100); // subtotal $1000
    pedido.precios.cuponesAplicados = [{ id: cuponId }];

    const resultado = await recalcularTotalesPedido(pedido);

    expect(resultado.totalVerificado).toBe(0);
  });

  test("rechaza el pedido si un ingrediente ya no existe", async () => {
    const pedido = pedidoConUnaVianda("id-que-no-existe", 100);

    await expect(recalcularTotalesPedido(pedido)).rejects.toThrow(/ya no existe/i);
  });
});
