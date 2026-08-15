export const estadosFiltro = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "preparacion", label: "En Preparación" },
  { value: "listo", label: "Listo" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

export const estadoPedidoAdmin = {
  pendiente: {
    label: "Pendiente",
    colorSelect: "bg-yellow-100 text-yellow-800 border-yellow-300",
    colorBadge: "bg-yellow-100 text-yellow-800",
  },
  preparacion: {
    label: "En Preparación",
    colorSelect: "bg-blue-100 text-blue-800 border-blue-300",
    colorBadge: "bg-blue-100 text-blue-800",
  },
  listo: {
    label: "Listo",
    colorSelect: "bg-green-100 text-green-800 border-green-300",
    colorBadge: "bg-green-100 text-green-800",
  },
  en_camino: {
    label: "En Camino",
    colorSelect: "bg-orange-100 text-orange-800 border-orange-300",
    colorBadge: "bg-orange-100 text-orange-800",
  },
  entregado: {
    label: "Entregado",
    colorSelect: "bg-gray-100 text-gray-800 border-gray-300",
    colorBadge: "bg-gray-100 text-gray-800",
  },
  cancelado: {
    label: "Cancelado",
    colorSelect: "bg-red-100 text-red-800 border-red-300",
    colorBadge: "bg-red-100 text-red-800",
  },
};

const DEFAULT_ESTADO = {
  label: "",
  colorSelect: "bg-gray-100 text-gray-800 border-gray-300",
  colorBadge: "bg-gray-100 text-gray-800",
};

export const getEstadoColor = (estado) =>
  (estadoPedidoAdmin[estado] || DEFAULT_ESTADO).colorSelect;

export const getEstadoColorModal = (estado) =>
  (estadoPedidoAdmin[estado] || DEFAULT_ESTADO).colorBadge;

export const getEstadoLabel = (estado) =>
  (estadoPedidoAdmin[estado] || { label: estado }).label;
