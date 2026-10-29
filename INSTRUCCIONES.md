# Pollos Vidal en GitHub Pages + Supabase

GitHub Pages publica la página estática. Supabase proporciona la autenticación, la base de datos Postgres y la función que registra y valida pedidos. No se debe publicar una clave `service_role` en el repositorio.

## Lo que falta para activar la conexión

1. En `supabase-config.js` ya está puesta la clave pública `publishable` del proyecto `ajcfhezpszevdbmaluye`. Esta clave puede estar en JavaScript público porque el acceso a los datos se limita con RLS.
2. En Supabase, abre **SQL Editor** y ejecuta `supabase/schema.sql`.
3. En **Authentication**, desactiva la creación pública de cuentas y crea/invita las cuentas de las dos personas. Después agrega sus correos a `public.admin_users` con el ejemplo al final de `supabase/schema.sql`.
4. Instala Supabase CLI y, desde esta carpeta, enlaza el proyecto y publica la función:

   ```powershell
   supabase login
   supabase link --project-ref ajcfhezpszevdbmaluye
   ```

   Crea un archivo local `.env.supabase` con `ORDER_RATE_LIMIT_SALT` (un valor aleatorio privado de al menos 32 caracteres), y guárdalo como secreto de la función:

   ```powershell
   supabase secrets set --env-file .env.supabase
   supabase functions deploy create-order
   ```

   Supabase entrega a la Edge Function la clave `SUPABASE_SECRET_KEYS` desde la configuración segura del proyecto. El archivo `.env.supabase` está excluido de Git. Nunca copies claves secretas al sitio ni las compartas por chat.
5. Publica los archivos de la carpeta en GitHub Pages. El dominio de GitHub Pages ya está permitido por la función: `https://hectorpanta.github.io`.

## Qué incluye

- El menú obtiene precios y disponibilidad de Supabase.
- El pedido se valida y guarda en una operación de base de datos; el servidor recalcula el total con los precios actuales.
- El panel requiere iniciar sesión con una de las cuentas autorizadas. Las políticas RLS bloquean los pedidos para visitantes y dejan a los administradores actualizar estados, precios y disponibilidad.
- La página manda el pedido a WhatsApp después de guardarlo en Supabase. Los pagos QR aún deben verificarse manualmente.
- Los datos se guardan en `orders` y `order_items`; los productos están en `products`.

Completa también el nombre, NIT, domicilio y contacto del titular en las páginas legales antes de publicar.
