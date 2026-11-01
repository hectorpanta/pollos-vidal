(() => {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const config = window.POLLOS_SUPABASE;
  const client = window.supabase && config && config.publishableKey && !config.publishableKey.startsWith('PEGA_AQUI')
    ? window.supabase.createClient(config.url, config.publishableKey) : null;
  let dashboard = null;
  const fmt = new Intl.NumberFormat('es-BO');
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusText = {nuevo:'Nuevo',confirmado:'Confirmado',preparando:'Preparando',listo:'Listo',entregado:'Entregado',cancelado:'Cancelado'};

  function boliviaMonthValue(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en', {timeZone:'America/La_Paz',year:'numeric',month:'2-digit'}).formatToParts(date);
    const year = parts.find(part => part.type === 'year').value;
    const month = parts.find(part => part.type === 'month').value;
    return `${year}-${month}`;
  }

  function showLogin() { dashboardView.hidden = true; loginView.hidden = false; }
  function showDashboard(email) {
    loginView.hidden = true; dashboardView.hidden = false;
    document.getElementById('owner-name').textContent = 'Sesión: ' + email;
    loadDashboard();
  }
  function globalError(message) { document.getElementById('global-error').textContent = message || ''; }
  function errorMessage(error) {
    if (!client) return 'Falta configurar la conexión con Supabase.';
    return error?.message || 'No se pudo completar la operación.';
  }
  async function isAdmin() {
    if (!client) return false;
    const {data:sessionData} = await client.auth.getSession();
    if (!sessionData.session) return false;
    const {data, error} = await client.rpc('is_admin');
    if (error || data !== true) return false;
    return true;
  }

  document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('login-error'); error.textContent = '';
    if (!client) { error.textContent = 'Falta configurar la conexión con Supabase.'; return; }
    const loginForm = event.currentTarget;
    const form = new FormData(loginForm);
    try {
      const {data, error:authError} = await client.auth.signInWithPassword({email:form.get('email'),password:form.get('password')});
      if (authError) throw authError;
      const {data:isAllowed, error:roleError} = await client.rpc('is_admin');
      if (roleError || isAllowed !== true) {
        throw new Error('Esta cuenta no tiene acceso administrativo.');
      }
      loginForm.reset(); showDashboard(data.user.email);
    } catch (err) { error.textContent = errorMessage(err); }
  });

  async function loadDashboard() {
    globalError('');
    try {
      if (!await isAdmin()) { showLogin(); return; }
      const {data:orders,error:ordersError} = await client.from('orders').select('id,customer_name,customer_phone,delivery,address,maps_url,payment,payment_status,total,status,created_at').order('created_at',{ascending:false}).limit(200);
      if (ordersError) throw ordersError;
      const ids = (orders || []).map(order => order.id);
      let items = [];
      if (ids.length) {
        const {data,error} = await client.from('order_items').select('id,order_id,product_id,product_name,quantity,unit_price').in('order_id',ids);
        if (error) throw error;
        items = data || [];
      }
      const {data:products,error:productsError} = await client.from('products').select('id,name,description,price,active').order('id');
      if (productsError) throw productsError;
      dashboard = {orders:(orders || []).map(order => ({...order,items:items.filter(item => item.order_id === order.id)})),products:products || []};
      renderStats(); renderOrders(); renderProducts();
      try { await loadMonthSummary(); }
      catch (err) {
        document.getElementById('stat-month-sales').textContent = 'No disponible';
        document.getElementById('stat-month-paid').textContent = 'No disponible';
        globalError(errorMessage(err));
      }
    } catch (err) { globalError(errorMessage(err)); }
  }
  async function loadMonthSummary() {
    const monthValue = document.getElementById('sales-month').value;
    if (!monthValue) {
      document.getElementById('stat-month-sales').textContent = fmt.format(0) + ' Bs';
      document.getElementById('stat-month-count').textContent = '0 pedidos incluidos';
      document.getElementById('stat-month-paid').textContent = fmt.format(0) + ' Bs';
      document.getElementById('stat-month-paid-count').textContent = '0 pagos recibidos';
      return;
    }
    const [year, month] = monthValue.split('-').map(Number);
    if (!year || month < 1 || month > 12) return;
    // Bolivia usa UTC-4; este rango incluye el mes local completo, sin depender del huso del navegador.
    const from = new Date(Date.UTC(year, month - 1, 1, 4)).toISOString();
    const until = new Date(Date.UTC(year, month, 1, 4)).toISOString();
    let offset = 0;
    let acceptedCount = 0;
    let acceptedTotal = 0;
    let paidCount = 0;
    let paidTotal = 0;
    const pageSize = 1000;
    while (true) {
      const {data, error} = await client.from('orders').select('total,status,payment_status')
        .gte('created_at', from).lt('created_at', until)
        .order('created_at', {ascending:true}).range(offset, offset + pageSize - 1);
      if (error) throw error;
      const page = data || [];
      for (const order of page) {
        if (['confirmado','preparando','listo','entregado'].includes(order.status)) {
          acceptedCount++;
          acceptedTotal += Number(order.total) || 0;
        }
        if (order.payment_status === 'recibido' && order.status !== 'cancelado') {
          paidCount++;
          paidTotal += Number(order.total) || 0;
        }
      }
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    document.getElementById('stat-month-sales').textContent = fmt.format(acceptedTotal) + ' Bs';
    document.getElementById('stat-month-count').textContent = `${fmt.format(acceptedCount)} pedidos incluidos`;
    document.getElementById('stat-month-paid').textContent = fmt.format(paidTotal) + ' Bs';
    document.getElementById('stat-month-paid-count').textContent = `${fmt.format(paidCount)} pagos recibidos`;
  }
  function renderStats() {
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const ordersToday = dashboard.orders.filter(order => new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(order.created_at)) === today);
    const sales = ordersToday.filter(order => ['confirmado','preparando','listo','entregado'].includes(order.status)).reduce((sum,order) => sum + order.total,0);
    const pending = ordersToday.filter(order => ['nuevo','confirmado','preparando'].includes(order.status)).length;
    document.getElementById('stat-orders').textContent = fmt.format(ordersToday.length);
    document.getElementById('stat-sales').textContent = fmt.format(sales) + ' Bs';
    document.getElementById('stat-pending').textContent = fmt.format(pending);
  }
  function renderOrders() {
    const container = document.getElementById('orders');
    const filter = document.getElementById('status-filter').value;
    const orders = (dashboard?.orders || []).filter(order => filter === 'todos' || order.status === filter);
    if (!orders.length) { container.innerHTML = '<p class="muted">No hay pedidos en esta vista todavía.</p>'; return; }
    container.innerHTML = orders.map(order => {
      const when = new Date(order.created_at);
      const date = Number.isNaN(when.getTime()) ? order.created_at : new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/La_Paz'}).format(when);
      const lines = order.items.map(item => `<li>${item.quantity} × ${safe(item.product_name)} — ${fmt.format(item.quantity * item.unit_price)} Bs</li>`).join('');
      const mapsHref = googleMapsHref(order.maps_url);
      const deliveryDetails = order.delivery === 'Entrega a domicilio'
        ? `<div class="order-location"><strong>Dirección:</strong> ${safe(order.address || 'No indicada')}<br>${mapsHref ? `<a class="map-link" href="${safe(mapsHref)}" target="_blank" rel="noopener noreferrer">Abrir ubicación en Google Maps ↗</a>` : '<span class="muted">No se compartió enlace de ubicación.</span>'}</div>`
        : '';
      const paymentText = order.payment_status === 'recibido' ? 'Recibido' : 'Pendiente';
      return `<article class="order"><div class="order-top"><div><h3><span class="order-id">#${order.id}</span> · ${safe(order.customer_name)}</h3><div class="order-date">${safe(date)}</div></div><span class="pill">${safe(statusText[order.status] || order.status)}</span></div><div class="order-meta"><span>☎ ${safe(order.customer_phone)}</span><span>· ${safe(order.delivery)}</span><span>· Método: ${safe(order.payment)}</span></div>${deliveryDetails}<ul class="order-lines">${lines}</ul><div class="order-bottom"><strong>${fmt.format(order.total)} Bs</strong><div class="order-actions"><label>Estado del pedido<select class="status-select" data-order-status="${order.id}">${Object.entries(statusText).map(([key,label]) => `<option value="${key}" ${key === order.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Estado del pago<select class="status-select" data-order-payment="${order.id}"><option value="pendiente" ${order.payment_status !== 'recibido' ? 'selected' : ''}>Pendiente</option><option value="recibido" ${order.payment_status === 'recibido' ? 'selected' : ''}>Recibido</option></select></label><span class="payment-current">Pago: ${safe(paymentText)}</span></div></div></article>`;
    }).join('');
  }
  function googleMapsHref(value) {
    try {
      const url = new URL(String(value || ''));
      const host = url.hostname.toLowerCase();
      const valid = url.protocol === 'https:' && (
        (host === 'www.google.com' && url.pathname.startsWith('/maps')) ||
        host === 'maps.google.com' ||
        host === 'maps.app.goo.gl' ||
        (host === 'goo.gl' && url.pathname.startsWith('/maps/'))
      );
      return valid ? url.href : '';
    } catch (_) { return ''; }
  }
  function renderProducts() {
    document.getElementById('products').innerHTML = dashboard.products.map(product => `<form class="product-row" data-product="${safe(product.id)}"><div><div class="product-name">${safe(product.name)}</div><div class="muted">Actual: ${fmt.format(product.price)} Bs</div></div><div class="product-controls"><input aria-label="Nombre del producto" type="text" name="name" value="${safe(product.name)}" maxlength="80" required><input aria-label="Precio en bolivianos" type="number" name="price" min="0" max="10000" step="1" value="${product.price}" required><label><input type="checkbox" name="active" ${product.active ? 'checked' : ''}>Disponible</label><button class="primary" type="submit">Guardar</button></div></form>`).join('');
  }
  document.getElementById('orders').addEventListener('change', async event => {
    const select = event.target.closest('[data-order-status], [data-order-payment]'); if (!select) return;
    const isPayment = select.hasAttribute('data-order-payment');
    const column = isPayment ? 'payment_status' : 'status';
    const orderId = isPayment ? select.dataset.orderPayment : select.dataset.orderStatus;
    const {error} = await client.from('orders').update({[column]:select.value}).eq('id',orderId);
    if (error) globalError(errorMessage(error));
    await loadDashboard();
  });
  document.getElementById('products').addEventListener('submit', async event => {
    const form = event.target.closest('[data-product]'); if (!form) return;
    event.preventDefault(); globalError('');
    const values = new FormData(form);
    const {error} = await client.from('products').update({name:values.get('name'),price:Number(values.get('price')),active:values.has('active')}).eq('id',form.dataset.product);
    if (error) globalError(errorMessage(error));
    await loadDashboard();
  });
  document.getElementById('status-filter').addEventListener('change', renderOrders);
  document.getElementById('sales-month').value = boliviaMonthValue();
  document.getElementById('sales-month').addEventListener('change', async () => {
    document.getElementById('stat-month-sales').textContent = 'Cargando…';
    document.getElementById('stat-month-count').textContent = '';
    document.getElementById('stat-month-paid').textContent = 'Cargando…';
    document.getElementById('stat-month-paid-count').textContent = '';
    try { await loadMonthSummary(); }
    catch (err) {
      globalError(errorMessage(err));
      document.getElementById('stat-month-sales').textContent = 'No disponible';
      document.getElementById('stat-month-paid').textContent = 'No disponible';
    }
  });
  document.getElementById('refresh').addEventListener('click', loadDashboard);
  document.getElementById('logout').addEventListener('click', async () => {
    if (client) await client.auth.signOut();
    dashboardView.hidden = true; showLogin();
  });

  (async () => {
    if (!client) { showLogin(); document.getElementById('login-error').textContent = 'Falta configurar la conexión con Supabase.'; return; }
    if (await isAdmin()) showDashboard((await client.auth.getUser()).data.user.email);
    else showLogin();
  })();
})();
