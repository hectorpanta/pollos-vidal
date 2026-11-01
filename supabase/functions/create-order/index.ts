const allowedOrigins = new Set([
  'https://hectorpanta.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

function json(req: Request, status: number, payload: unknown) {
  const origin = req.headers.get('origin') || '';
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  });
  if (allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json(req, 200, { ok: true });
  if (req.method !== 'POST') return json(req, 405, { error: 'Método no permitido.' });
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins.has(origin)) return json(req, 403, { error: 'Origen no permitido.' });
  const size = Number(req.headers.get('content-length') || 0);
  if (size > 16000) return json(req, 413, { error: 'El pedido es demasiado grande.' });

  try {
    const input = await req.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json(req, 400, { error: 'Datos del pedido inválidos.' });
    const items = input.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) return json(req, 400, { error: 'Agrega productos al pedido.' });
    if (input.delivery === 'Entrega a domicilio' && (typeof input.maps_url !== 'string' || input.maps_url.length > 500)) {
      return json(req, 400, { error: 'Comparte un enlace válido de Google Maps.' });
    }
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
    const salt = Deno.env.get('ORDER_RATE_LIMIT_SALT');
    if (!ip || !salt) return json(req, 503, { error: 'El servicio todavía no está configurado.' });
    const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + salt));
    const ipHash = Array.from(new Uint8Array(hashBytes), byte => byte.toString(16).padStart(2, '0')).join('');
    const url = Deno.env.get('SUPABASE_URL');
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const secretKey = secretKeys.default;
    if (!url || !secretKey) return json(req, 503, {error:'El servicio todavía no está configurado.'});
    const callRpc = async (name: string, args: Record<string, unknown>) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method:'POST',
        headers:{'apikey':secretKey,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(args)
      });
      const data = await response.json().catch(() => ({}));
      return {response,data};
    };
    const rate = await callRpc('consume_order_rate', {p_ip_hash:ipHash});
    if (!rate.response.ok) return json(req, 503, {error:'El servicio todavía no está disponible.'});
    if (rate.data !== true) return json(req, 429, {error:'Recibimos varios pedidos desde esta conexión. Espera unos minutos.'});
    const result = await callRpc('create_customer_order', {
      p_name: input.name,
      p_phone: input.phone,
      p_delivery: input.delivery,
      p_address: input.address || '',
      p_maps_url: input.maps_url || '',
      p_payment: input.payment,
      p_items: items.map((item: { id: unknown; quantity: unknown }) => ({ id: item?.id, quantity: item?.quantity }))
    });
    if (!result.response.ok) {
      const errorMessage = typeof result.data?.message === 'string' ? result.data.message : '';
      const message = /disponible|cantidad|teléfono|nombre|dirección|ubicación|google maps|entrega|pago|total|productos|demasiados/i.test(errorMessage)
        ? errorMessage : 'No se pudo registrar el pedido. Inténtalo nuevamente.';
      return json(req, 400, { error: message });
    }
    return json(req, 201, { order: result.data });
  } catch {
    return json(req, 400, { error: 'No se pudo registrar el pedido. Revisa los datos e inténtalo nuevamente.' });
  }
});
