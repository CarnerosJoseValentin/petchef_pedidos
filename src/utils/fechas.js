// Acepta Timestamp de Firestore o el objeto plano {seconds: ...}
const toDate = (timestamp) =>
  timestamp?.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);

export const formatearFecha = (timestamp) => {
  if (!timestamp) return "Fecha no disponible";
  return toDate(timestamp).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatearFechaCorta = (timestamp) => {
  if (!timestamp) return "N/A";
  return toDate(timestamp).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
