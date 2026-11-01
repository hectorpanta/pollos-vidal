# Pollos Vidal: pedidos, administración y publicación

## Qué usa cada parte

- **GitHub Pages** publica la tienda para los clientes.
- **Supabase** guarda productos, pedidos y cuentas de clientes y administración.
- La tienda pide una cuenta para entrar. El cliente se registra con correo, teléfono de contacto y contraseña; para volver a entrar usa el correo y la contraseña. El teléfono se guarda como dato de contacto, no se verifica por SMS.
- **`admin.html`** es una página aparte para Héctor y la dueña. Muestra pedidos y ventas, permite cambiar el estado y editar precio o disponibilidad. Los usuarios sin autorización no pueden entrar al panel ni consultar pedidos.
- En un pedido a domicilio, el cliente escribe la dirección y comparte un enlace de Google Maps o autoriza al navegador a crear uno con su ubicación actual. El enlace se guarda en el pedido, aparece en el panel y se incluye en el mensaje de WhatsApp.

## Activar los cambios en Supabase

1. **Actualizar la base de datos.** Abre el proyecto `ajcfhezpszevdbmaluye` → **SQL Editor** → crea una consulta nueva. Pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. El esquema actualizado añade la columna `maps_url` y actualiza la función de pedidos; se puede volver a ejecutar para actualizar la instalación anterior.
2. **Guardar el secreto de pedidos.** En **Edge Functions** → **Secrets**, debe aparecer `ORDER_RATE_LIMIT_SALT`. El valor es privado y no debe ponerse en los archivos de la página ni en GitHub.
3. **Actualizar la función.** En **Edge Functions**, abre `create-order`. Reemplaza el código por todo el contenido de `supabase/functions/create-order/index.ts`, conserva el nombre exacto `create-order` y pulsa **Deploy**.
4. **Proteger el envío de pedidos.** Mantén **Verify JWT** activado para `create-order`; los clientes deben iniciar sesión antes de usar la tienda y el cliente de Supabase envía su sesión al registrar el pedido. La función valida los datos y aplica un límite de solicitudes. No publiques claves secretas.

## Configurar el acceso de clientes

En Supabase, abre **Authentication → URL Configuration** y configura la URL de GitHub Pages de esta tienda como **Site URL** y como URL permitida de redirección: `https://hectorpanta.github.io/pollos-vidal/`. El registro envía un enlace de confirmación al correo cuando la confirmación de correo está activada. El teléfono se solicita para coordinar pedidos; el inicio de sesión se hace con correo y contraseña.

La pantalla de inicio evita que los visitantes normales usen la tienda sin iniciar sesión. GitHub Pages publica archivos estáticos, por lo que el código y los textos del sitio siguen siendo públicos; Supabase protege los pedidos y la administración mediante sesiones y permisos de base de datos.

## Dar acceso a Héctor y a la dueña

1. En **Authentication → Users**, usa la cuenta existente de Héctor (no hace falta volver a invitar un correo que ya está registrado). Crea o invita a la dueña cuando tengas su correo.
2. En **SQL Editor**, sustituye los dos valores de ejemplo por los correos exactos de esas cuentas y ejecuta:

   ```sql
   insert into public.admin_users(email, display_name) values
     ('CORREO_DE_HECTOR', 'Héctor'),
     ('CORREO_DE_LA_DUENA', 'Dueña')
   on conflict (email) do update set display_name = excluded.display_name;
   ```

3. Ambos ingresan con su propia cuenta en `admin.html`. La ruta pública será la dirección de tu sitio seguida de `/admin.html`. La dueña puede administrar pedidos y el menú desde ahí.

## Subir los cambios a GitHub

En VS Code abre **Control de código fuente** (`Ctrl + Shift + G`), agrega los archivos modificados con `+`, escribe un mensaje como `Mejorar pedidos y panel administrativo`, pulsa **Commit** y después **Sync Changes**. Al subir `main`, GitHub Pages publica los cambios del sitio. El código de la Edge Function también debe actualizarse en Supabase como se indica arriba; subirlo a GitHub no lo despliega automáticamente.

La clave `publishable` de Supabase está pensada para el código del navegador. No agregues claves `service_role`, `sb_secret`, contraseñas ni el valor de `ORDER_RATE_LIMIT_SALT` al repositorio.

## Nota sobre pagos

El sitio registra pedidos, pero no cobra en línea. Los pedidos con QR requieren que el negocio revise manualmente el comprobante recibido por WhatsApp antes de confirmar el pago.
