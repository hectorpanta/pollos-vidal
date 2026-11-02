# Pollos Vidal: pedidos, administración y publicación

## Qué usa cada parte

- **GitHub Pages** publica la tienda para los clientes.
- **Supabase** guarda productos y pedidos. Authentication se usa para las cuentas administrativas, no para los clientes.
- La tienda pública abre directamente. Los clientes pueden consultar el menú y pedir sin crear una cuenta ni iniciar sesión; el pedido solicita nombre y teléfono para coordinar.
- **`admin/index.html`** es una página aparte para Héctor y la dueña. Se abre con la dirección del sitio seguida de `/admin/`. Muestra pedidos y ventas, permite cambiar el estado y editar precio o disponibilidad. Los usuarios sin autorización no pueden entrar al panel ni consultar pedidos.
- En un pedido a domicilio, el cliente escribe la dirección y comparte un enlace de Google Maps o autoriza al navegador a crear uno con su ubicación actual. El enlace se guarda en el pedido, aparece en el panel y se incluye en el mensaje de WhatsApp.

## Carpetas del sitio

- La página pública permanece en la raíz. El panel está en `admin/index.html` para abrirse con la ruta limpia `/admin/`, y los documentos legales están en `legal/`.
- `assets/css/` contiene los estilos.
- `assets/js/` contiene el código JavaScript y la configuración pública de Supabase.
- `assets/images/` contiene las imágenes y el QR de pago; `assets/images/originales/` guarda las imágenes originales.
- `assets/icons/` contiene los iconos.
- `legal/` contiene la política de privacidad, términos y condiciones, cookies y reembolsos.
- `supabase/` conserva el esquema de la base de datos y la función para registrar pedidos.

## Activar los cambios en Supabase

1. **Actualizar la base de datos.** Abre el proyecto `ajcfhezpszevdbmaluye` → **SQL Editor** → crea una consulta nueva. Pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. El esquema actualizado añade las columnas `maps_url` y `payment_status`, y actualiza la función de pedidos; se puede volver a ejecutar para actualizar la instalación anterior. Los pedidos existentes empiezan como pago pendiente hasta que se revisen.
2. **Guardar el secreto de pedidos.** En **Edge Functions** → **Secrets**, debe aparecer `ORDER_RATE_LIMIT_SALT`. El valor es privado y no debe ponerse en los archivos de la página ni en GitHub.
3. **Permitir pedidos sin cuenta.** En **Edge Functions**, abre `create-order` → **Settings**, apaga **Verify JWT** y pulsa **Save changes**. El código de la función ya valida los pedidos y limita solicitudes. `supabase/config.toml` también indica `verify_jwt = false` para los próximos despliegues desde la línea de comandos.
4. La función comprueba el origen, valida los datos del pedido, aplica un límite por conexión y usa una clave secreta del servidor para guardar pedidos. No publiques claves secretas. La URL puede recibir solicitudes públicas, así que conserva esas validaciones y el límite de solicitudes.

La tienda pública no crea ni conserva sesiones de clientes. GitHub Pages publica los archivos del sitio; las políticas de Supabase restringen los pedidos y el menú. La ruta `/admin/` sigue teniendo un inicio de sesión separado para el personal autorizado.

## Dar acceso a Héctor y a la dueña

1. En **Authentication → Users**, usa la cuenta existente de Héctor (no hace falta volver a invitar un correo que ya está registrado). Crea o invita a la dueña cuando tengas su correo. Estas cuentas son solo para administración.
2. En **SQL Editor**, sustituye los dos valores de ejemplo por los correos exactos de esas cuentas y ejecuta:

   ```sql
   insert into public.admin_users(email, display_name) values
     ('CORREO_DE_HECTOR', 'Héctor'),
     ('CORREO_DE_LA_DUENA', 'Dueña')
   on conflict (email) do update set display_name = excluded.display_name;
   ```

3. Ambos ingresan con su propia cuenta en `/admin/`. La dueña puede administrar pedidos y el menú desde ahí. El acceso no depende de ocultar la dirección: la base de datos valida la sesión y compara el correo con la lista privada `admin_users`; solo los correos incluidos en esa tabla tienen permisos. Comprueba en **SQL Editor** que la lista tenga exactamente las dos cuentas autorizadas:

   ```sql
   select email, display_name from public.admin_users order by email;
   ```

   No agregues cuentas de clientes a esa tabla ni compartas las contraseñas. Las políticas de Supabase impiden que una cuenta normal consulte pedidos o modifique el menú.

4. El panel muestra pedidos recientes, estados, pagos, disponibilidad y ventas del día. Para efectivo, marca el pago como **Recibido** después de cobrar. Para QR, verifica primero que el abono aparezca en la cuenta y luego marca **Recibido**; un comprobante por WhatsApp por sí solo no confirma el pago. El resumen del mes muestra los pedidos aceptados y los pagos marcados como recibidos. Son montos de ventas y pagos registrados, no utilidad neta, porque todavía no se registran costos ni gastos.

## Subir los cambios a GitHub

En VS Code abre **Control de código fuente** (`Ctrl + Shift + G`), agrega los archivos modificados con `+`, escribe un mensaje como `Mejorar pedidos y panel administrativo`, pulsa **Commit** y después **Sync Changes**. Al subir `main`, GitHub Pages publica los cambios del sitio. El código de la Edge Function también debe actualizarse en Supabase como se indica arriba; subirlo a GitHub no lo despliega automáticamente.

La clave `publishable` de Supabase está pensada para el código del navegador. No agregues claves `service_role`, `sb_secret`, contraseñas ni el valor de `ORDER_RATE_LIMIT_SALT` al repositorio.

## Nota sobre pagos

El sitio registra pedidos, pero no cobra en línea. Los pedidos con QR requieren que el negocio revise manualmente el comprobante recibido por WhatsApp antes de confirmar el pago.
