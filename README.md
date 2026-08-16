# PetChef Pedidos

Aplicación web para pedidos de viandas personalizadas para mascotas (perros y gatos). El cliente arma la vianda eligiendo ingredientes y gramos por mascota, paga por Mercado Pago o efectivo, y el equipo (producción/logística/admin) gestiona el pedido hasta la entrega.

## Stack

- **Frontend**: Next.js 14 (export estático) + React 18 + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Pagos**: Mercado Pago (Checkout Pro)
- **Hosting**: Firebase Hosting

## Estructura del proyecto

```
src/
  pages/           → rutas de la app (Next.js pages router)
    admin/         → panel de administración (rol admin)
    logistica/     → panel de logística (rol logistica)
    produccion/    → panel de producción (rol produccion)
  components/      → componentes de UI, organizados por sección/feature
  hooks/           → lógica de estado y llamadas a Firestore/Functions
  lib/             → clientes de Firebase, Mercado Pago y helpers de Firestore
  utils/           → funciones puras (formateo de fechas, config de estados, etc.)
functions/         → Cloud Functions (pagos, cambios de estado, stock, notificaciones)
firestore.rules    → reglas de seguridad de Firestore
```

## Roles de usuario

| Rol | Puede |
|---|---|
| `cliente` | Armar pedidos, pagar, ver sus propios pedidos |
| `produccion` | Ver pedidos y cambiar su estado (preparación → listo) |
| `logistica` | Ver pedidos y cambiar su estado (entrega/envío) |
| `admin` | Todo lo anterior + gestionar ingredientes, cupones, configuración |

El rol vive en `users/{uid}.rol` en Firestore. Los roles se asignan a mano (no hay panel para esto todavía) — ver sección de creación de admin más abajo.

## Requisitos previos

- Node 20
- Firebase CLI (`npm install -g firebase-tools`) logueado (`firebase login`) con acceso al proyecto
- Una cuenta de Mercado Pago con credenciales (sandbox para desarrollo, producción para el deploy real)

## Configuración local

1. Instalar dependencias:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```
2. Copiar las plantillas de variables de entorno y completar con los valores reales:
   ```bash
   cp .env.example .env.local
   cp functions/.env.example functions/.env
   ```
   - Los valores de Firebase salen de: Firebase Console → Configuración del proyecto → Tus apps.
   - `MP_ACCESS_TOKEN` es el access token de Mercado Pago (usar uno de sandbox en desarrollo).
3. Correr en local:
   ```bash
   npm run dev
   ```

## Crear el primer usuario admin

No hay panel para esto. Registrate normalmente en la app (queda como `cliente`) y después, a mano, en Firebase Console → Firestore → `users/{tu-uid}`, cambiá el campo `rol` a `"admin"`.

## Deploy

Orden recomendado (para poder aislar dónde falla algo si pasa):

```bash
# 1. Reglas de Firestore
firebase deploy --only firestore:rules

# 2. Cloud Functions (usa las variables de functions/.env)
firebase deploy --only functions

# 3. Build + Hosting
npm run build
firebase deploy --only hosting
```

O todo junto con `npm run deploy` (build + `firebase deploy` a todo).

## Seguridad

- Las reglas de Firestore (`firestore.rules`) son la fuente de verdad de permisos — no editar reglas solo desde la consola de Firebase sin reflejar el cambio acá también, para no perder sincronía.
- Los precios de pedidos se recalculan **server-side** en `crearPreferenciaMercadoPago` (Cloud Function) contra los precios reales de `/ingredientes`; nunca se confía en el precio que manda el cliente.
- Nunca commitear `.env.local` ni `functions/.env` (ya están en `.gitignore`).

## Colecciones de Firestore

- `users` — perfil y rol de cada usuario
- `ingredientes` — catálogo, precio por gramo y stock
- `cupones` — cupones de descuento
- `pedidos` — pedidos, con desglose de viandas, precios y estado
- `configuracion` — un documento con envíos, horarios, cupones globales y WhatsApp
