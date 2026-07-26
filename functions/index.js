import { https, config } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import cors from "cors";
import axios from 'axios';



const corsHandler = cors({ origin: true });

initializeApp();
const db = getFirestore();

// ========================================
// FUNCIÓN 1: Crear Preferencia de Pago 
// ========================================
export const crearPreferenciaMercadoPago = https.onCall(
  async (data, context) => {
    try {
      if (!context.auth) {
        throw new https.HttpsError("unauthenticated", "Usuario no autenticado");
      }

      const { pedidoId, pedidoData } = data;
      if (!pedidoId || !pedidoData) {
        throw new https.HttpsError("invalid-argument", "Datos incompletos");
      }

      // ---------- CONFIG ----------
      const mpConfig = config().mercadopago || {};
      const appConfig = config().app || {};

      const accessToken =
        mpConfig.access_token || process.env.MP_ACCESS_TOKEN || "";
      const webhookUrl =
        mpConfig.webhook_url ||
        process.env.WEBHOOK_URL ||
        "https://us-central1-petchefpedidos.cloudfunctions.net/webhookMercadoPago";

      // App URL: preferir config(), fallback process.env y por último el dominio por defecto
      let appUrl =
        appConfig.url && typeof appConfig.url === "string" && appConfig.url.startsWith("http")
          ? appConfig.url
          : process.env.APP_URL && process.env.APP_URL.startsWith("http")
          ? process.env.APP_URL
          : "https://petchef.web.app";

      // Si por alguna razón appUrl quedó vacío forzamos fallback
      if (!appUrl || typeof appUrl !== "string") {
        appUrl = "https://petchef.web.app";
      }

      const isLocal = appUrl.startsWith("http://");

      // ---------- LOGS DE DEBUG ----------
      console.log("🔍 MP config:", JSON.stringify(mpConfig));
      console.log("🔍 appConfig:", JSON.stringify(appConfig));
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
      const safeUnitPrice = Number(pedidoData.totalFinal || 0);

      const preferenceData = {
        items: [
          {
            id: String(pedidoId),
            title: `Pedido de ${pedidoData.cantidadViandas} viandas para ${pedidoData.tipoMascota}`,
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
    const mpConfig = config().mercadopago || {};
    const accessToken =
      mpConfig.access_token || process.env.MP_ACCESS_TOKEN || "";

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
    const accessToken = config().whatsapp?.access_token;
    const phoneNumberId = config().whatsapp?.phone_number_id;

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
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

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

    const { ingredientes } = data;

    if (!ingredientes || !Array.isArray(ingredientes)) {
      throw new https.HttpsError('invalid-argument', 'Ingredientes inválidos');
    }

    console.log('📦 Reduciendo stock para', ingredientes.length, 'ingredientes');

    const batch = db.batch();

    // Verificar stock disponible primero
    for (const ing of ingredientes) {
      const ingredienteRef = db.collection('ingredientes').doc(ing.ingredienteId);
      const ingredienteDoc = await ingredienteRef.get();
      
      if (!ingredienteDoc.exists) {
        throw new https.HttpsError('not-found', `Ingrediente ${ing.nombre} no encontrado`);
      }

      const ingredienteData = ingredienteDoc.data();
      
      if (ingredienteData.stockGramos < ing.gramos) {
        throw new https.HttpsError(
          'failed-precondition', 
          `Stock insuficiente de ${ing.nombre}: disponible ${ingredienteData.stockGramos}g, necesario ${ing.gramos}g`
        );
      }

      // Reducir stock
      batch.update(ingredienteRef, {
        stockGramos: FieldValue.increment(-ing.gramos),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    // Ejecutar batch
    await batch.commit();

    console.log('✅ Stock reducido correctamente');

    return {
      success: true,
      mensaje: 'Stock reducido correctamente'
    };

  } catch (error) {
    console.error('Error reduciendo stock:', error);
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
