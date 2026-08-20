// El stock se guarda y se calcula internamente en gramos (stockGramos) en
// toda la app — Cloud Functions, validación de pedidos, etc. dependen de esa
// unidad y no se tocan. Estas funciones son solo para MOSTRAR el stock de
// forma más simple en las pantallas de administración (kg en vez de gramos
// con muchos ceros).

/** 45000 -> "45", 1500 -> "1,5", 250 -> "0,25" */
export const gramosAKgTexto = (gramos) =>
  (Number(gramos) / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 });

/** Para inputs de formulario: mismo número pero sin separador de miles */
export const gramosAKgInput = (gramos) => {
  const kg = Number(gramos) / 1000;
  return Number.isFinite(kg) ? String(Math.round(kg * 100) / 100) : "";
};

/** "45" (kg, como lo tipea el admin) -> 45000 (gramos, para guardar) */
export const kgInputAGramos = (kgTexto) => {
  const kg = parseFloat(String(kgTexto).replace(",", "."));
  return Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
};
