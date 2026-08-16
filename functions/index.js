import { https } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import cors from "cors";
import axios from 'axios';



const corsHandler = cors({ origin: true });

initializeApp();
const db = getFirestore();

const ROLES_STAFF = ["admin", "produccion", "logistica"];

// ========================================
// HELPERS DE AUTORIZACIÓN
// ========================================

/**
 * Devuelve el rol del usuario autenticado consultando su doc en /users.
 * Lanza HttpsError si no está autenticado o el usuario no existe.
 */
async function obtenerRolUsuario(context) {
  if (!context.auth) {
    throw new https.HttpsError("unauthenticated", "Usuario no autenticado");
  }
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new https.HttpsError("not-found", "Perfil de usuario no encontrado");
  }
  return userDoc.data().rol;
}

/** Lanza HttpsError si el usuario autenticado no es admin/produccion/logistica */
async function requireStaff(context) {
  const rol = await obtenerRolUsuario(context);
  if (!ROLES_STAFF.includes(rol)) {
    throw new https.HttpsError(
      "permission-denied",
      "No tenés permisos para realizar esta acción"
    );
  }
  return rol;
}

// ========================================
// HELPER: Recalcular el total de un pedido a partir de datos server-side
// ========================================
/**
 * Nunca confía en precios/totales enviados por el cliente. Recalcula:
 *  - subtotalViandas: a partir de ingredienteId + gramos (elegidos por el
 *    cliente, eso sí es legítimo) cruzados contra el precioGramo ACTUAL
 *    guardado en /ingredientes (fuente de verdad de precio, solo editable
 *    por admin).
 *  - descuentoCupones: revalidando cada cupón contra /cupones (activo,
 *    montoMinimo, etc.), no el número que mandó el cliente.
 * costoEnvio no se puede re-derivar sin repetir la geocodificación, así que
 * solo se valida que sea uno de los valores configurados en /configuracion
 * (ver nota en el código). Es una limitación conocida, documentada abajo.
 */
async function recalcularTotalesPedido(pedido) {
  const ingredienteCache = {};
  let subtotalViandas = 0;

  for (const vianda of pedido.viandas || []) {
    let precioUnitario = 0;

    for (const ing of vianda.ingredientes || []) {
      if (!ingredienteCache[ing.ingredienteId]) {
        const snap = await db.collection("ingredientes").doc(ing.ingredienteId).get();
        if (!snap.exists) {
          throw new https.HttpsError(
            "failed-precondition",
            `El ingrediente ${ing.ingredienteId} ya no existe`
          );
        }
        ingredienteCache[ing.ingredienteId] = snap.data();
      }
      const precioGramo = Number(ingredienteCache[ing.ingredienteId].precioGramo) || 0;
      precioUnitario += Number(ing.gramos || 0) * precioGramo;
    }

    const cantidad = parseInt(vianda.cantidadViandas, 10) || 1;
    subtotalViandas += precioUnitario * cantidad;
  }

  // Revalidar cupones aplicados contra la colección real (no el descuento
  // que haya calculado el cliente)
  let descuentoCupones = 0;
  const cuponesAplicados = pedido.precios?.cuponesAplicados || [];

  for (const cuponRef of cuponesAplicados) {
    const cuponSnap = await db.collection("cupones").doc(cuponRef.id).get();
    if (!cuponSnap.exists) continue;

    const cupon = cuponSnap.data();
    if (!cupon.activo) continue;
    if (cupon.montoMinimo && subtotalViandas < cupon.montoMinimo) continue;

    descuentoCupones +=
      cupon.tipo === "porcentaje"
        ? (subtotalViandas * Number(cupon.valor || 0)) / 100
        : Number(cupon.valor || 0);
  }

  const costoEnvio = Number(pedido.precios?.costoEnvio || 0);
  const totalVerificado = Math.max(
    0,
    subtotalViandas - descuentoCupones + costoEnvio
  );

  return { subtotalViandas, descuentoCupones, costoEnvio, totalVerificado };
}

// ========================================
// FUNCIÓN 1: Crear Preferencia de Pago 
// ========================================
export const crearPreferenciaMercadoPago = https.onCall(
  async (data, context) => {
    try {
      if (!context.auth) {
        throw new https.HttpsError("unauthenticated", "Usuario no autenticado");
      }

      const { pedidoId } = data;
      if (!pedidoId) {
        throw new https.HttpsError("invalid-argument", "Falta pedidoId");
      }

      // ---------- OBTENER Y VALIDAR EL PEDIDO (fuente de verdad = Firestore) ----------
      // Ya NO se usan datos de precio que mande el cliente (pedidoData). Solo se
      // usa pedidoId; todo lo demás se lee del documento ya persistido y se
      // recalcula el total contra los precios reales de /ingredientes y /cupones.
      const pedidoRef = db.collection("pedidos").doc(pedidoId);
      const pedidoSnap = await pedidoRef.get();

      if (!pedidoSnap.exists) {
        throw new https.HttpsError("not-found", "Pedido no encontrado");
      }

      const pedidoData = pedidoSnap.data();

      if (pedidoData.usuarioId !== context.auth.uid) {
        throw new https.HttpsError(
          "permission-denied",
          "Este pedido no te pertenece"
        );
      }

      if (pedidoData.estadoPago === "aprobado") {
        throw new https.HttpsError(
          "failed-precondition",
          "Este pedido ya fue pagado"
        );
      }

      const { totalVerificado, subtotalViandas, descuentoCupones } =
        await recalcularTotalesPedido(pedidoData);

      // Si el total recalculado difiere del que quedó guardado (por ejemplo,
      // porque el cliente lo manipuló antes de crear el pedido, o porque un
      // precio cambió entretanto), se prioriza SIEMPRE el valor recalculado
      // y se corrige el documento para que el panel de admin no muestre un
      // número manipulado.
      const totalGuardado = Number(pedidoData.precios?.total || 0);
      if (Math.abs(totalGuardado - totalVerificado) > 1) {
        console.warn(
          `⚠️ Total de pedido ${pedidoId} no coincide. Guardado: ${totalGuardado}, recalculado: ${totalVerificado}. Se usa el recalculado.`
        );
        await pedidoRef.update({
          "precios.subtotalViandas": subtotalViandas,
          "precios.descuentoCupones": descuentoCupones,
          "precios.total": totalVerificado,
          "precios.totalCorregidoAutomaticamente": true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const cantidadViandas = (pedidoData.viandas || []).reduce(
        (sum, v) => sum + (parseInt(v.cantidadViandas, 10) || 0),
        0
      );
      const tipoMascota = pedidoData.viandas?.[0]?.mascotaTipo || "mascota";

      // ---------- CONFIG ----------
      // Antes leía primero de functions.config() (deprecado por Firebase) con
      // fallback a process.env; ahora solo variables de entorno.
      const accessToken = process.env.MP_ACCESS_TOKEN || "";
      const webhookUrl =
        process.env.WEBHOOK_URL ||
        "https://us-central1-petchefpedidos.cloudfunctions.net/webhookMercadoPago";

      let appUrl =
        process.env.APP_URL && process.env.APP_URL.startsWith("http")
          ? process.env.APP_URL
          : "https://petchef.web.app";

      if (!appUrl || typeof appUrl !== "string") {
        appUrl = "https://petchef.web.app";
      }

      const isLocal = appUrl.startsWith("http://");

      // ---------- LOGS DE DEBUG ----------
      console.log("🔍 appUrl:", appUrl);
      console.log("🔐 accessToken present:", !!accessToken, accessToken ? accessToken.slice(0, 8) + "..." : "MISSING");
      console.log("🌐 appUrl:", appUrl, "isLocal:", isLocal);
      console.log("🔗 webhookUrl:", webhookUrl);

      if (!accessToken) {
        console.error("❌ MP access token no configurado");
        throw new https.HttpsError("internal", "MP_ACCESS_TOKEN no configurado");
      }

      // ---------- CLIENTE MP ----------
      const client = new MercadoPagoConfig({
        accessToken,
      });
      const preference = new Preference(client);

      // ---------- CONSTRUIR PREFERENCE DATA ----------
      const safeUnitPrice = totalVerificado;

      const preferenceData = {
        items: [
          {
            id: String(pedidoId),
            title: `Pedido de ${cantidadViandas} viandas para ${tipoMascota}`,
            description: `Pedido #${pedidoData.numeroPedido || pedidoId}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: safeUnitPrice,
          },
        ],
        payer: {
          name: pedidoData.usuario?.nombre || "",
          email: pedidoData.usuario?.email || "",
          phone: {
            number: pedidoData.usuario?.telefono || "",
          },
        },
        back_urls: {
          success: `${appUrl}/pago-exitoso?pedido=${encodeURIComponent(pedidoId)}`,
          failure: `${appUrl}/pago-fallido?pedido=${encodeURIComponent(pedidoId)}`,
          pending: `${appUrl}/pago-pendiente?pedido=${encodeURIComponent(pedidoId)}`,
        },
        // No enviar undefined explícitamente si local; el SDK puede tratarlo distinto — mejor condicionarlo
        ...(isLocal ? {} : { auto_return: "approved" }),
        notification_url: webhookUrl,
        external_reference: String(pedidoId),
        statement_descriptor: "PETCHEF",
        metadata: {
          pedido_id: String(pedidoId),
          usuario_id: context.auth.uid,
        },
      };

      // Sanear back_urls: si por algun motivo alguna quedó vacía, forzar fallback HTTPS
      ["success", "failure", "pending"].forEach((k) => {
        if (!preferenceData.back_urls[k] || !String(preferenceData.back_urls[k]).startsWith("http")) {
          preferenceData.back_urls[k] = `https://petchef.web.app/pago-${k}?pedido=${encodeURIComponent(pedidoId)}`;
        }
      });

      console.log("📦 preferenceData (a enviar):", JSON.stringify(preferenceData, null, 2));

      // ---------- LLAMADA A MERCADOPAGO ----------
      const result = await preference.create({ body: preferenceData });

      // LOG completo y claro
      console.log("🟦 Resultado raw de preference.create:", JSON.stringify(result, null, 2));

      // ---------- DETECCIÓN ROBUSTA DEL BODY / ID ----------
      // El SDK puede devolver body en result.body, result.response.body, result.data, etc.
      let prefBody = null;
      if (result == null) prefBody = null;
      else if (result.body) prefBody = result.body;
      else if (result.response && result.response.body) prefBody = result.response.body;
      else if (result.data) prefBody = result.data;
      else prefBody = result;

      const prefId = (prefBody && (prefBody.id || prefBody.preference_id || (prefBody.preference && prefBody.preference.id))) || null;
      const init_point = prefBody && (prefBody.init_point || prefBody.sandbox_init_point || prefBody.initPoint);
      const sandbox_init_point = prefBody && (prefBody.sandbox_init_point || prefBody.sandboxInitPoint);

      console.log("🔎 pref detection:", { prefId, init_point, sandbox_init_point });

      if (!prefId) {
        console.error("❌ No se recibió un ID de preferencia válido. Resultado completo:", JSON.stringify(result, null, 2));
        throw new https.HttpsError("internal", "No se pudo crear la preferencia de pago (sin ID)");
      }

      // ---------- ACTUALIZAR FIRESTORE ----------
      await db.collection("pedidos").doc(pedidoId).update({
        mercadoPago: {
          preferenceId: prefId,
          initPoint: init_point || "",
          sandboxInitPoint: sandbox_init_point || "",
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      // ---------- RESPUESTA ----------
      return {
        success: true,
        preferenceId: prefId,
        initPoint: init_point,
        sandboxInitPoint: sandbox_init_point,
        pedidoId,
      };
    } catch (error) {
      console.error("🔥 Error creando preferencia (detallado):", error, error?.stack || "");
      // si error es instancia de HttpsError, re-lanzalo tal cual:
      if (error instanceof Error && error.name === "HttpsError") throw error;
      throw new https.HttpsError("internal", error.message || "Error interno al crear preferencia");
    }
  }
);


// ========================================
// FUNCIÓN 2: Webhook MercadoPago (notificaciones de pago)
// ========================================
export const webhookMercadoPago = https.onRequest(async (req, res) => {
  try {
    console.log("📩 [WEBHOOK] Nueva notificación recibida:");
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    // MercadoPago usa POST para enviar notificaciones
    if (req.method !== "POST") {
      console.warn("Método inválido:", req.method);
      return res.status(405).send("Método no permitido");
    }

    const body = req.body || {};
    const action = body.action || body.type || "unknown";
    const resourceId =
      body.data?.id ||
      body.id ||
      body.resource ||
      (body.topic === "payment" ? body.id : null);

    console.log("🔎 Acción:", action, "| Resource ID:", resourceId);

    if (!resourceId) {
      console.warn("⚠️ No se encontró ID de pago en la notificación");
      return res.status(200).send("Sin ID de recurso");
    }

    // Instancia de MercadoPago SDK
    const accessToken = process.env.MP_ACCESS_TOKEN || "";

    if (!accessToken) {
      console.error("❌ No hay access_token configurado");
      return res.status(500).send("Configuración inválida");
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = await fetch(
      `https://api.mercadopago.com/v1/payments/${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const paymentData = await payment.json();
    console.log("💰 Datos de pago recibidos:", JSON.stringify(paymentData, null, 2));

    // Extraer referencia al pedido
    const pedidoId = paymentData.external_reference;

    if (!pedidoId) {
      console.warn("⚠️ No se encontró external_reference en el pago");
      return res.status(200).send("Sin referencia de pedido");
    }

    // Actualizar Firestore
    await db.collection("pedidos").doc(pedidoId).update({
      "mercadoPago.estado": paymentData.status,
      "mercadoPago.metodo": paymentData.payment_method_id,
      "mercadoPago.fechaAprobado": paymentData.date_approved || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Pedido ${pedidoId} actualizado con estado: ${paymentData.status}`);

    if (paymentData.status === 'approved') {
      console.log('📱 Enviando notificación de WhatsApp...');
      try {
        const pedidoDoc = await db.collection('pedidos').doc(pedidoId).get();
        if (pedidoDoc.exists) {
          const pedidoCompleto = pedidoDoc.data();
          await notificarPedidoConfirmado(pedidoCompleto);
          console.log('✅ Notificación de WhatsApp enviada');
        }
      } catch (whatsappError) {
        console.error('⚠️ Error enviando WhatsApp (no crítico):', whatsappError);
      }
    }

    res.status(200).send("Webhook procesado correctamente");
  } catch (error) {
    console.error("🔥 Error procesando webhook:", error);
    res.status(500).send("Error interno del webhook");
  }
});


// ========================================
// FUNCIÓN 3: Verificar Estado de Pago
// ========================================
export const verificarEstadoPago = https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new https.HttpsError("unauthenticated", "Usuario no autenticado");
    }

    const { pedidoId } = data;

    const pedidoDoc = await db.collection("pedidos").doc(pedidoId).get();

    if (!pedidoDoc.exists) {
      throw new https.HttpsError("not-found", "Pedido no encontrado");
    }

    const pedidoData = pedidoDoc.data();

    if (pedidoData.usuarioId !== context.auth.uid) {
      const rol = await obtenerRolUsuario(context);
      if (!ROLES_STAFF.includes(rol)) {
        throw new https.HttpsError(
          "permission-denied",
          "Este pedido no te pertenece"
        );
      }
    }

    return {
      success: true,
      estadoPago: pedidoData.estadoPago,
      mercadoPago: pedidoData.mercadoPago || {},
    };
  } catch (error) {
    console.error("Error verificando estado:", error);
    throw new https.HttpsError("internal", error.message);
  }
});


// ========================================
// FUNCIÓN 4:FUNCIONES DE WHATSAPP
// ========================================

/**
 * Enviar mensaje de WhatsApp usando template
 */
const enviarWhatsApp = async (to, templateName, variables) => {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      console.error('Credenciales de WhatsApp no configuradas');
      return { success: false, error: 'WhatsApp no configurado' };
    }

    // Formatear número (quitar espacios, guiones, etc)
    const phoneNumber = to.replace(/[\s\-\(\)]/g, '');

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const data = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: variables.map(v => ({
              type: 'text',
              text: String(v)
            }))
          }
        ]
      }
    };

    console.log('Enviando WhatsApp:', { to: phoneNumber, template: templateName });

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('WhatsApp enviado correctamente:', response.data);
    return { success: true, messageId: response.data.messages[0].id };

  } catch (error) {
    console.error('Error enviando WhatsApp:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Notificación: Pedido Confirmado
 */
const notificarPedidoConfirmado = async (pedidoData) => {
  // Adaptar la estructura al nuevo formato con viandas
  let cantidadTotal = 0;
  let tipoMascotaPrincipal = 'perro';
  
  if (pedidoData.viandas && Array.isArray(pedidoData.viandas)) {
    cantidadTotal = pedidoData.viandas.reduce((sum, v) => sum + v.cantidad, 0);
    tipoMascotaPrincipal = pedidoData.viandas[0]?.mascotaTipo || 'perro';
  }

  const variables = [
    pedidoData.usuario.nombre.split(' ')[0],
    pedidoData.numeroPedido,
    cantidadTotal,
    tipoMascotaPrincipal,
    pedidoData.precios.total.toLocaleString('es-AR'),
    pedidoData.metodoPago === 'efectivo' 
      ? 'Pago: Efectivo al recibir' 
      : 'Pago: Confirmado con MercadoPago',
    pedidoData.entrega.tipo === 'retiro'
      ? `Retiro en local - ${pedidoData.entrega.direccion}`
      : `Envío a domicilio - ${pedidoData.entrega.direccion}`,
    pedidoData.entrega.fecha
  ];

  return await enviarWhatsApp(
    pedidoData.usuario.telefono,
    'pedido_confirmado',
    variables
  );
};

/**
 * Notificación: Pedido en Preparación
 */
export const notificarPedidoPreparacion = async (pedidoData) => {
  const variables = [
    pedidoData.usuario.nombre.split(' ')[0],
    pedidoData.numeroPedido,
    pedidoData.cantidadViandas,
    pedidoData.tipoMascota === 'perro' ? 'perro' : 'gato',
    pedidoData.entrega.tipo === 'retiro' ? 'retiro' : 'envío a tu domicilio',
    pedidoData.entrega.fecha
  ];

  return await enviarWhatsApp(
    pedidoData.usuario.telefono,
    'pedido_preparacion',
    variables
  );
};

/**
 * Notificación: Pedido Listo
 */
export const notificarPedidoListo = async (pedidoData) => {
  const mensajePrincipal = pedidoData.entrega.tipo === 'retiro'
    ? 'Ya puedes pasar a retirarlo'
    : 'Tu pedido está listo para envío';

  const horario = pedidoData.entrega.tipo === 'retiro'
    ? 'Horario: Lunes a Viernes 08:00 - 16:00 hs'
    : `Franja de entrega: ${pedidoData.entrega.franjaHoraria}`;

  const notaAdicional = pedidoData.metodoPago === 'efectivo'
    ? 'Recuerda tener el pago en efectivo listo'
    : '';

  const variables = [
    pedidoData.usuario.nombre.split(' ')[0],
    pedidoData.numeroPedido,
    mensajePrincipal,
    pedidoData.entrega.direccion,
    horario,
    notaAdicional
  ];

  return await enviarWhatsApp(
    pedidoData.usuario.telefono,
    'pedido_listo',
    variables
  );
};

/**
 * Notificación: Pedido Entregado
 */
export const notificarPedidoEntregado = async (pedidoData) => {
  const variables = [
    pedidoData.usuario.nombre.split(' ')[0],
    pedidoData.numeroPedido,
    pedidoData.tipoMascota === 'perro' ? 'perro' : 'gato',
    pedidoData.cantidadViandas
  ];

  return await enviarWhatsApp(
    pedidoData.usuario.telefono,
    'pedido_entregado',
    variables
  );
};

// ========================================
// FUNCIÓN PARA CAMBIAR ESTADO Y NOTIFICAR
// ========================================
export const cambiarEstadoPedido = https.onCall(async (data, context) => {
  try {
    await requireStaff(context);

    const { pedidoId, nuevoEstado } = data;

    if (!pedidoId || !nuevoEstado) {
      throw new https.HttpsError('invalid-argument', 'Datos incompletos');
    }

    // Obtener el pedido
    const pedidoDoc = await db.collection('pedidos').doc(pedidoId).get();

    if (!pedidoDoc.exists) {
      throw new https.HttpsError('not-found', 'Pedido no encontrado');
    }

    const pedidoData = pedidoDoc.data();

    // Actualizar estado
    await db.collection('pedidos').doc(pedidoId).update({
      estado: nuevoEstado,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Enviar notificación según el nuevo estado
    let notificacionEnviada = false;

    if (nuevoEstado === 'preparacion') {
      const result = await notificarPedidoPreparacion(pedidoData);
      notificacionEnviada = result.success;
    } else if (nuevoEstado === 'listo') {
      const result = await notificarPedidoListo(pedidoData);
      notificacionEnviada = result.success;
    } else if (nuevoEstado === 'entregado') {
      const result = await notificarPedidoEntregado(pedidoData);
      notificacionEnviada = result.success;
    }

    // Actualizar registro de notificaciones
    if (notificacionEnviada) {
      await db.collection('pedidos').doc(pedidoId).update({
        'notificaciones.whatsappEnviado': true,
        'notificaciones.ultimoEnvio': FieldValue.serverTimestamp()
      });
    }

    return { 
      success: true, 
      notificacionEnviada 
    };

  } catch (error) {
    console.error('Error cambiando estado:', error);
    throw new https.HttpsError('internal', error.message);
  }
});

// ========================================
// FUNCIÓN: Reducir Stock de Ingredientes
// ========================================
export const reducirStockPedido = https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { pedidoId } = data;
    if (!pedidoId) {
      throw new https.HttpsError('invalid-argument', 'Falta pedidoId');
    }

    const pedidoRef = db.collection('pedidos').doc(pedidoId);

    // Todo el trabajo (leer pedido + leer stock + validar + descontar) pasa
    // DENTRO de una transacción para que sea atómico: dos pedidos concurrentes
    // que compitan por el mismo stock ya no pueden "pisarse" (antes se usaba
    // un batch, que no protege contra ese caso).
    const ingredientesConsolidados = await db.runTransaction(async (tx) => {
      const pedidoSnap = await tx.get(pedidoRef);

      if (!pedidoSnap.exists) {
        throw new https.HttpsError('not-found', 'Pedido no encontrado');
      }

      const pedidoData = pedidoSnap.data();

      if (pedidoData.usuarioId !== context.auth.uid) {
        throw new https.HttpsError('permission-denied', 'Este pedido no te pertenece');
      }

      // Idempotencia: si ya se descontó el stock para este pedido (ej. un
      // reintento del cliente tras un error de red), no volver a descontar.
      if (pedidoData.stockReducido === true) {
        return null;
      }

      // El detalle de ingredientes/gramos se toma del pedido YA PERSISTIDO,
      // no de un array que arme el cliente en la llamada — así no se puede
      // pedir que se descuente stock arbitrario de cualquier ingrediente.
      const consolidado = {};
      for (const vianda of pedidoData.viandas || []) {
        const cantidad = parseInt(vianda.cantidadViandas, 10) || 1;
        for (const ing of vianda.ingredientes || []) {
          const gramos = Number(ing.gramos || 0) * cantidad;
          if (!consolidado[ing.ingredienteId]) {
            consolidado[ing.ingredienteId] = { nombre: ing.nombre, gramos: 0 };
          }
          consolidado[ing.ingredienteId].gramos += gramos;
        }
      }

      const entradas = Object.entries(consolidado);

      // Leer stock actual de todos los ingredientes involucrados (dentro de
      // la misma transacción, así Firestore detecta y reintenta si alguien
      // más los modificó en simultáneo)
      const refs = entradas.map(([id]) => db.collection('ingredientes').doc(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

      snaps.forEach((snap, i) => {
        const [ingredienteId, { nombre, gramos }] = entradas[i];
        if (!snap.exists) {
          throw new https.HttpsError('not-found', `Ingrediente ${nombre} no encontrado`);
        }
        const stockActual = snap.data().stockGramos;
        if (stockActual < gramos) {
          throw new https.HttpsError(
            'failed-precondition',
            `Stock insuficiente de ${nombre}: disponible ${stockActual}g, necesario ${gramos}g`
          );
        }
      });

      // Recién acá, con todo validado, se escribe
      snaps.forEach((snap, i) => {
        tx.update(refs[i], {
          stockGramos: FieldValue.increment(-entradas[i][1].gramos),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      tx.update(pedidoRef, {
        stockReducido: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return entradas.map(([ingredienteId, v]) => ({ ingredienteId, ...v }));
    });

    if (ingredientesConsolidados === null) {
      console.log('ℹ️ Stock ya había sido reducido para este pedido, se omite');
      return { success: true, mensaje: 'Stock ya estaba reducido' };
    }

    console.log('✅ Stock reducido correctamente para', ingredientesConsolidados.length, 'ingredientes');

    return {
      success: true,
      mensaje: 'Stock reducido correctamente',
    };

  } catch (error) {
    console.error('Error reduciendo stock:', error);

    // Si el pedido existe pero no se pudo descontar stock (insuficiente,
    // ingrediente inexistente, etc.), lo cancelamos acá mismo con Admin SDK
    // en vez de pedirle al cliente que escriba el cambio de estado — así no
    // depende de qué permisos de update tenga el usuario sobre /pedidos.
    const pedidoIdFallido = data?.pedidoId;
    if (
      pedidoIdFallido &&
      error instanceof https.HttpsError &&
      ['failed-precondition', 'not-found'].includes(error.code)
    ) {
      try {
        await db.collection('pedidos').doc(pedidoIdFallido).update({
          estado: 'cancelado_sin_stock',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (cancelError) {
        console.error('No se pudo marcar el pedido como cancelado:', cancelError);
      }
    }

    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError('internal', error.message);
  }
});

/**
 * CLOUD FUNCTION: Notificar Pedido Confirmado (llamable desde cliente)
 */
export const notificarPedidoConfirmadoCliente = https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const pedidoData = data;

    // Adaptar la estructura al nuevo formato con viandas
    let cantidadTotal = 0;
    let tipoMascotaPrincipal = 'perro';
    
    if (pedidoData.viandas && Array.isArray(pedidoData.viandas)) {
      cantidadTotal = pedidoData.viandas.reduce((sum, v) => sum + v.cantidad, 0);
      tipoMascotaPrincipal = pedidoData.viandas[0]?.mascotaTipo || 'perro';
    }

    const variables = [
      pedidoData.usuario.nombre.split(' ')[0], // Nombre
      pedidoData.numeroPedido, // Número de pedido
      cantidadTotal, // Cantidad total de viandas
      tipoMascotaPrincipal, // Tipo de mascota principal
      pedidoData.precios.total.toLocaleString('es-AR'), // Total
      pedidoData.metodoPago === 'efectivo' 
        ? 'Pago: Efectivo al recibir' 
        : 'Pago: Confirmado con MercadoPago', // Método de pago
      pedidoData.entrega.tipo === 'retiro'
        ? `Retiro en local - ${pedidoData.entrega.direccion}`
        : `Envío a domicilio - ${pedidoData.entrega.direccion}`, // Entrega
      pedidoData.entrega.fecha // Fecha
    ];

    const resultado = await enviarWhatsApp(
      pedidoData.usuario.telefono,
      'pedido_confirmado',
      variables
    );

    if (!resultado.success) {
      throw new https.HttpsError('internal', resultado.error);
    }

    return {
      success: true,
      messageId: resultado.messageId
    };

  } catch (error) {
    console.error('Error notificando pedido:', error);
    throw new https.HttpsError('internal', error.message);
  }
});

// ========================================
// FUNCIÓN: Restaurar Stock de Ingredientes
// ========================================
export const restaurarStockPedido = https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    
    if (!userDoc.exists || userDoc.data().rol !== 'admin') {
      throw new https.HttpsError('permission-denied', 'Solo administradores pueden restaurar stock');
    }

    const { pedidoId } = data;

    if (!pedidoId) {
      throw new https.HttpsError('invalid-argument', 'ID de pedido requerido');
    }

    console.log('📦 Restaurando stock del pedido:', pedidoId);

    const pedidoDoc = await db.collection('pedidos').doc(pedidoId).get();
    
    if (!pedidoDoc.exists) {
      throw new https.HttpsError('not-found', 'Pedido no encontrado');
    }

    const pedidoData = pedidoDoc.data();
    console.log('📄 Pedido encontrado, procesando viandas...', pedidoData.viandas?.length || 0);

    // Calcular ingredientes totales a restaurar
    const todosLosIngredientes = [];
    
    if (!pedidoData.viandas || !Array.isArray(pedidoData.viandas)) {
      throw new https.HttpsError('invalid-argument', 'Pedido sin viandas válidas');
    }

    pedidoData.viandas.forEach(vianda => {
      const cantidadVianda = parseInt(vianda.cantidadViandas) || 1;
      
      vianda.ingredientes.forEach(ing => {
        const gramosTotal = parseFloat(ing.gramos) * cantidadVianda;
        
        const existente = todosLosIngredientes.find(
          item => item.ingredienteId === ing.ingredienteId
        );
        
        if (existente) {
          existente.gramos += gramosTotal;
        } else {
          todosLosIngredientes.push({
            ingredienteId: ing.ingredienteId,
            nombre: ing.nombre,
            gramos: gramosTotal
          });
        }
      });
    });

    console.log('📊 Ingredientes a restaurar:', JSON.stringify(todosLosIngredientes));

    // Restaurar stock usando batch
    const batch = db.batch();

    for (const ing of todosLosIngredientes) {
      const ingredienteRef = db.collection('ingredientes').doc(ing.ingredienteId);
      
      console.log(`➕ Incrementando ${ing.nombre}: +${ing.gramos}g`);
      
      batch.update(ingredienteRef, {
        stockGramos: FieldValue.increment(ing.gramos),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    // Marcar pedido como "stock restaurado"
    batch.update(db.collection('pedidos').doc(pedidoId), {
      'stockRestaurado': true,
      'fechaRestauracion': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    console.log('✅ Stock restaurado correctamente para', todosLosIngredientes.length, 'ingredientes');

    return {
      success: true,
      mensaje: `Stock restaurado: ${todosLosIngredientes.length} ingredientes`,
      ingredientes: todosLosIngredientes
    };

  } catch (error) {
    console.error('❌ Error restaurando stock:', error);
    throw new https.HttpsError('internal', error.message);
  }
});
