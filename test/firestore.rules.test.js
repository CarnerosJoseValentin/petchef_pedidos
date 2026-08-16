const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } = require("firebase/firestore");

let testEnv;

const CLIENTE_A = "cliente-a";
const CLIENTE_B = "cliente-b";
const ADMIN_UID = "admin-uid";
const PRODUCCION_UID = "produccion-uid";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "petchef-rules-test",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Sembrar usuarios base (bypassea reglas, como haría un admin desde la consola)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", CLIENTE_A), { rol: "cliente" });
    await setDoc(doc(db, "users", CLIENTE_B), { rol: "cliente" });
    await setDoc(doc(db, "users", ADMIN_UID), { rol: "admin" });
    await setDoc(doc(db, "users", PRODUCCION_UID), { rol: "produccion" });
  });
});

const dbAs = (uid) => testEnv.authenticatedContext(uid).firestore();
const dbAnon = () => testEnv.unauthenticatedContext().firestore();

describe("users", () => {
  test("un usuario nuevo puede crearse a sí mismo como cliente", async () => {
    const db = dbAs("nuevo-uid");
    await assertSucceeds(setDoc(doc(db, "users", "nuevo-uid"), { rol: "cliente" }));
  });

  test("NO puede crearse a sí mismo como admin (escalación en el alta)", async () => {
    const db = dbAs("nuevo-uid");
    await assertFails(setDoc(doc(db, "users", "nuevo-uid"), { rol: "admin" }));
  });

  test("un cliente NO puede cambiar su propio rol a admin", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(updateDoc(doc(db, "users", CLIENTE_A), { rol: "admin" }));
  });

  test("un cliente SÍ puede actualizar otros campos propios sin tocar el rol", async () => {
    const db = dbAs(CLIENTE_A);
    await assertSucceeds(
      updateDoc(doc(db, "users", CLIENTE_A), { rol: "cliente", telefono: "123456" })
    );
  });

  test("un cliente NO puede leer el perfil de otro usuario", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(getDoc(doc(db, "users", CLIENTE_B)));
  });

  test("un admin SÍ puede leer y cambiar el rol de otro usuario", async () => {
    const db = dbAs(ADMIN_UID);
    await assertSucceeds(getDoc(doc(db, "users", CLIENTE_A)));
    await assertSucceeds(updateDoc(doc(db, "users", CLIENTE_A), { rol: "produccion" }));
  });
});

describe("ingredientes", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "ingredientes", "ing-1"), {
        nombre: "Pollo",
        precioGramo: 2,
        stockGramos: 1000,
      });
    });
  });

  test("cualquier autenticado puede leer", async () => {
    const db = dbAs(CLIENTE_A);
    await assertSucceeds(getDoc(doc(db, "ingredientes", "ing-1")));
  });

  test("un no autenticado NO puede leer", async () => {
    await assertFails(getDoc(doc(dbAnon(), "ingredientes", "ing-1")));
  });

  test("un cliente NO puede modificar ingredientes", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(updateDoc(doc(db, "ingredientes", "ing-1"), { precioGramo: 0.01 }));
  });

  test("un admin SÍ puede modificar ingredientes", async () => {
    const db = dbAs(ADMIN_UID);
    await assertSucceeds(updateDoc(doc(db, "ingredientes", "ing-1"), { precioGramo: 3 }));
  });
});

describe("cupones", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "cupones", "cup-1"), {
        codigo: "TEST10",
        activo: true,
        valor: 10,
        usoActual: 0,
      });
    });
  });

  test("un cliente NO puede crear cupones", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(
      setDoc(doc(db, "cupones", "cup-nuevo"), { codigo: "X", activo: true, usoActual: 0 })
    );
  });

  test("un cliente SÍ puede incrementar usoActual en 1 (uso normal del cupón)", async () => {
    const db = dbAs(CLIENTE_A);
    await assertSucceeds(
      updateDoc(doc(db, "cupones", "cup-1"), { usoActual: 1, updatedAt: new Date() })
    );
  });

  test("un cliente NO puede incrementar usoActual en más de 1", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(updateDoc(doc(db, "cupones", "cup-1"), { usoActual: 5 }));
  });

  test("un cliente NO puede cambiar otros campos aprovechando el update de uso (el agujero que arreglamos)", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(
      updateDoc(doc(db, "cupones", "cup-1"), { usoActual: 1, valor: 100, activo: true })
    );
  });

  test("un admin SÍ puede modificar cualquier campo del cupón", async () => {
    const db = dbAs(ADMIN_UID);
    await assertSucceeds(updateDoc(doc(db, "cupones", "cup-1"), { valor: 50, activo: false }));
  });
});

describe("pedidos", () => {
  test("un cliente puede crear su propio pedido en estado pendiente", async () => {
    const db = dbAs(CLIENTE_A);
    await assertSucceeds(
      setDoc(doc(db, "pedidos", "ped-1"), { usuarioId: CLIENTE_A, estado: "pendiente" })
    );
  });

  test("un cliente NO puede crear un pedido a nombre de otro usuario", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(
      setDoc(doc(db, "pedidos", "ped-2"), { usuarioId: CLIENTE_B, estado: "pendiente" })
    );
  });

  test("un cliente NO puede crear un pedido que ya nazca 'entregado' (bypass de pago)", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(
      setDoc(doc(db, "pedidos", "ped-3"), { usuarioId: CLIENTE_A, estado: "entregado" })
    );
  });

  describe("con un pedido ya existente", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "pedidos", "ped-1"), {
          usuarioId: CLIENTE_A,
          estado: "pendiente",
          precios: { total: 1000 },
        });
      });
    });

    test("el dueño puede leer su propio pedido", async () => {
      const db = dbAs(CLIENTE_A);
      await assertSucceeds(getDoc(doc(db, "pedidos", "ped-1")));
    });

    test("otro cliente NO puede leer el pedido ajeno", async () => {
      const db = dbAs(CLIENTE_B);
      await assertFails(getDoc(doc(db, "pedidos", "ped-1")));
    });

    test("staff (producción) SÍ puede leer cualquier pedido", async () => {
      const db = dbAs(PRODUCCION_UID);
      await assertSucceeds(getDoc(doc(db, "pedidos", "ped-1")));
    });

    test("staff puede cambiar el estado del pedido", async () => {
      const db = dbAs(PRODUCCION_UID);
      await assertSucceeds(
        updateDoc(doc(db, "pedidos", "ped-1"), {
          usuarioId: CLIENTE_A,
          estado: "preparacion",
          precios: { total: 1000 },
        })
      );
    });

    test("staff NO puede modificar el precio del pedido", async () => {
      const db = dbAs(PRODUCCION_UID);
      await assertFails(
        updateDoc(doc(db, "pedidos", "ped-1"), {
          usuarioId: CLIENTE_A,
          estado: "preparacion",
          precios: { total: 1 },
        })
      );
    });

    test("staff NO puede reasignar el pedido a otro usuario", async () => {
      const db = dbAs(PRODUCCION_UID);
      await assertFails(
        updateDoc(doc(db, "pedidos", "ped-1"), {
          usuarioId: CLIENTE_B,
          estado: "preparacion",
          precios: { total: 1000 },
        })
      );
    });

    test("el cliente dueño NO puede cambiar el estado de su propio pedido directamente", async () => {
      const db = dbAs(CLIENTE_A);
      await assertFails(
        updateDoc(doc(db, "pedidos", "ped-1"), {
          usuarioId: CLIENTE_A,
          estado: "entregado",
          precios: { total: 1000 },
        })
      );
    });
  });
});

describe("configuracion", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "configuracion", "general"), { horarios: {} });
    });
  });

  test("cualquier autenticado puede leer la configuración", async () => {
    const db = dbAs(CLIENTE_A);
    await assertSucceeds(getDoc(doc(db, "configuracion", "general")));
  });

  test("un cliente NO puede modificar la configuración", async () => {
    const db = dbAs(CLIENTE_A);
    await assertFails(updateDoc(doc(db, "configuracion", "general"), { horarios: {} }));
  });

  test("un admin SÍ puede modificar la configuración", async () => {
    const db = dbAs(ADMIN_UID);
    await assertSucceeds(
      updateDoc(doc(db, "configuracion", "general"), { horarios: { apertura: "09:00" } })
    );
  });
});
