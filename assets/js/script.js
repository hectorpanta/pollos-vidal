const CONFIG = {
    telefono: "59167451677",
    telefonoVisible: "+591 67451677",
    direccion: "Avenida Río Paraguay, Cochabamba",
    coordenadas: "-17.464823,-66.128996",
    enlaceMapa: "https://maps.app.goo.gl/6kdsTAnHDXnfAr1j9",
    mensajeBase: "Hola Pollos Vidal, quiero hacer un pedido.",
    zonaHoraria: "America/La_Paz",

    // Formato 24 h "HH:MM". Posición 0 = Domingo, 1 = Lunes ... 6 = Sábado.
    // Usa null en un día para mostrarlo como "Cerrado".
    horarios: [
        ["11:30", "21:30"], // Domingo
        ["11:30", "21:30"], // Lunes
        ["11:30", "21:30"], // Martes
        ["11:30", "21:30"], // Miércoles
        null,                 // Jueves: cerrado
        ["11:30", "21:30"], // Viernes
        ["11:30", "21:30"]  // Sábado
    ]
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const authFlowType = new URLSearchParams(window.location.hash.slice(1)).get("type");
const isPasswordSetupFlow = authFlowType === "invite" || authFlowType === "recovery";

const supabaseClient = (function () {
    const config = window.POLLOS_SUPABASE;
    if (!window.supabase || !config || !config.url || !config.publishableKey || config.publishableKey.startsWith("PEGA_AQUI")) return null;
    return window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: isPasswordSetupFlow }
    });
})();

const authSetup = document.getElementById("auth-setup");
if (isPasswordSetupFlow && authSetup) {
    authSetup.hidden = false;
    const authSetupMessage = document.getElementById("auth-setup-message");
    const authSetupForm = document.getElementById("auth-setup-form");
    if (!supabaseClient) {
        authSetupMessage.textContent = "No se pudo conectar. Vuelve a solicitar el correo de acceso.";
        authSetupForm.querySelector("button").disabled = true;
    } else {
        supabaseClient.auth.getSession().then(({data, error}) => {
            if (error || !data.session) {
                authSetupMessage.textContent = "Este enlace ya venció o fue usado. Solicita un nuevo correo de recuperación desde /admin/.";
                authSetupForm.querySelector("button").disabled = true;
            }
        });
        authSetupForm.addEventListener("submit", async event => {
            event.preventDefault();
            authSetupMessage.textContent = "";
            const password = document.getElementById("auth-new-password").value;
            const repeatedPassword = document.getElementById("auth-repeat-password").value;
            const button = authSetupForm.querySelector("button");
            if (password !== repeatedPassword) {
                authSetupMessage.textContent = "Las contraseñas no coinciden.";
                return;
            }
            button.disabled = true;
            button.textContent = "Guardando…";
            const {error} = await supabaseClient.auth.updateUser({password});
            if (error) {
                authSetupMessage.textContent = error.message || "No se pudo guardar la contraseña. Solicita otro correo.";
                button.disabled = false;
                button.textContent = "Guardar contraseña";
                return;
            }
            authSetupForm.hidden = true;
            document.getElementById("auth-setup-title").textContent = "Contraseña creada";
            document.querySelector(".auth-setup-copy").textContent = "Ya puedes entrar al panel con tu correo y la nueva contraseña.";
        });
    }
}

// Los precios y la disponibilidad vienen de Supabase.
if (supabaseClient) {
    supabaseClient.from("products").select("id,name,description,price,active").order("id")
        .then(function (result) {
            if (result.error) throw result.error;
            result.data.forEach(function (producto) {
            const boton = document.querySelector('.btn-agregar[data-id="' + producto.id + '"]');
            if (!boton) return;
            const tarjeta = boton.closest(".card");
            boton.dataset.nombre = producto.name;
            boton.dataset.precio = String(producto.price);
            boton.setAttribute("aria-label", "Agregar " + producto.name + " al pedido, " + producto.price + " bolivianos");
            const opcion = boton.closest("[data-opcion-producto]");
            if (opcion) {
                opcion.querySelector(".nombre-opcion").textContent = producto.name;
                opcion.querySelector(".precio").textContent = producto.price + " Bs";
                opcion.querySelector("p").textContent = producto.description;
                opcion.hidden = !producto.active;
                const opciones = tarjeta.querySelectorAll("[data-opcion-producto]");
                tarjeta.hidden = !Array.from(opciones).some(function (elemento) { return !elemento.hidden; });
                return;
            }
            tarjeta.querySelector("h3").textContent = producto.name;
            tarjeta.querySelector(".precio").textContent = producto.price + " Bs";
            tarjeta.querySelector("p").textContent = producto.description;
            tarjeta.hidden = !producto.active;
            });
        }).catch(function () { /* Se conservan los datos visibles si la conexión no está configurada. */ });
}

function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function enlaceWhatsApp(mensaje) {
    return "https://wa.me/" + CONFIG.telefono + "?text=" + encodeURIComponent(mensaje);
}

document.querySelectorAll(".js-whatsapp").forEach(function (a) {
    a.href = enlaceWhatsApp(CONFIG.mensajeBase);
    a.target = "_blank";
    a.rel = "noopener";
});

const enlaceTel = document.getElementById("enlace-telefono");
enlaceTel.textContent = CONFIG.telefonoVisible;
enlaceTel.href = "tel:+" + CONFIG.telefono;

const enlaceDireccion = document.getElementById("direccion-texto");
enlaceDireccion.textContent = CONFIG.direccion;
enlaceDireccion.href = CONFIG.enlaceMapa;
document.getElementById("abrir-mapa").href = CONFIG.enlaceMapa;

/* ---------- Mapa: se carga solo si la persona lo pide ---------- */
document.getElementById("cargar-mapa").addEventListener("click", function () {
    const iframe = document.createElement("iframe");
    iframe.title = "Mapa de Pollos Vidal en Google Maps";
    iframe.src = "https://www.google.com/maps?q=" + CONFIG.coordenadas + "&z=17&output=embed";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    document.getElementById("mapa-contenedor").replaceChildren(iframe);
});

/* ---------- Horarios y estado Abierto/Cerrado (hora de Bolivia) ---------- */
function ahoraBolivia() {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.zonaHoraria,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());
    const v = {};
    partes.forEach(function (p) { v[p.type] = p.value; });
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
        dia: dias[v.weekday],
        minutos: parseInt(v.hour, 10) * 60 + parseInt(v.minute, 10)
    };
}

function aMinutos(hora) {
    const p = hora.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function dibujarHorarios() {
    const tabla = document.getElementById("tabla-horarios");
    const hoy = ahoraBolivia().dia;
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const filas = orden.map(function (d) {
        const h = CONFIG.horarios[d];
        const texto = h ? h[0] + " - " + h[1] : "Cerrado";
        const clase = d === hoy ? ' class="hoy"' : "";
        return "<tr" + clase + "><td>" + DIAS[d] + "</td><td>" + texto + "</td></tr>";
    }).join("");
    tabla.insertAdjacentHTML("beforeend", filas);
}

function actualizarEstado() {
    const ahora = ahoraBolivia();
    const h = CONFIG.horarios[ahora.dia];
    const estado = document.getElementById("estado");
    const abierto = h && ahora.minutos >= aMinutos(h[0]) && ahora.minutos < aMinutos(h[1]);

    const texto = abierto ? "● Abierto ahora · hasta las " + h[1] : "● Cerrado ahora";
    if (estado.textContent !== texto) {
        estado.textContent = texto;
        estado.className = "estado " + (abierto ? "abierto" : "cerrado");
    }
}

dibujarHorarios();
actualizarEstado();
setInterval(actualizarEstado, 60000);

/* ---------- Menú hamburguesa ---------- */
const btnMenu = document.getElementById("btn-menu");
const nav = document.getElementById("nav");

btnMenu.addEventListener("click", function () {
    const abierto = nav.classList.toggle("abierto");
    btnMenu.setAttribute("aria-expanded", String(abierto));
});

nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
        nav.classList.remove("abierto");
        btnMenu.setAttribute("aria-expanded", "false");
    });
});

/* ---------- Animación al hacer scroll ---------- */
const reveals = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
            if (e.isIntersecting) {
                e.target.classList.add("visible");
                observador.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { observador.observe(el); });
} else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
}

/* ---------- Carrito de pedido (solo en memoria: no se guarda nada) ---------- */
let carrito = {};   // { "Nombre": { precio: 17, cantidad: 2 } }
let focoPrevioCarrito = null;
let focoPrevioQR = null;

const panel = document.getElementById("panel-carrito");
const lista = document.getElementById("carrito-lista");
const aviso = document.getElementById("carrito-aviso");
const anuncio = document.getElementById("anuncio");
const casillaAcepto = document.getElementById("acepto");

function anunciar(texto) {
    anuncio.textContent = "";
    setTimeout(function () { anuncio.textContent = texto; }, 50);
}

function abrirCarrito() {
    focoPrevioCarrito = document.activeElement;
    panel.inert = false;
    panel.classList.add("abierto");
    panel.setAttribute("aria-hidden", "false");
    document.getElementById("cerrar-carrito").focus();
}

function cerrarCarrito() {
    panel.classList.remove("abierto");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;
    aviso.textContent = "";
    if (focoPrevioCarrito) focoPrevioCarrito.focus();
}

function calcularTotal() {
    return Object.keys(carrito).reduce(function (suma, n) {
        return suma + carrito[n].precio * carrito[n].cantidad;
    }, 0);
}

function dibujarCarrito() {
    const nombres = Object.keys(carrito);
    const cantidadTotal = nombres.reduce(function (s, n) { return s + carrito[n].cantidad; }, 0);

    if (nombres.length === 0) {
        lista.innerHTML = '<p class="carrito-vacio">Aún no agregaste nada.</p>';
    } else {
        lista.innerHTML = nombres.map(function (n) {
            const item = carrito[n];
            return '<div class="carrito-item">' +
                '<span class="nombre">' + esc(item.nombre) + '</span>' +
                '<button type="button" data-accion="menos" data-nombre="' + esc(n) + '" aria-label="Quitar una unidad de ' + esc(item.nombre) + '">−</button>' +
                '<span aria-label="Cantidad">' + item.cantidad + '</span>' +
                '<button type="button" data-accion="mas" data-nombre="' + esc(n) + '" aria-label="Agregar una unidad de ' + esc(item.nombre) + '">+</button>' +
                '<span>' + (item.precio * item.cantidad) + ' Bs</span>' +
                '</div>';
        }).join("");
    }

    document.getElementById("carrito-total").textContent = calcularTotal() + " Bs";
    document.getElementById("carrito-cantidad").textContent = cantidadTotal;
}

document.querySelectorAll(".btn-agregar").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const id = btn.dataset.id;
        const nombre = btn.dataset.nombre;
        const precio = parseFloat(btn.dataset.precio);
        if (carrito[id]) {
            carrito[id].cantidad++;
        } else {
            carrito[id] = { id: id, nombre: nombre, precio: precio, cantidad: 1 };
        }
        dibujarCarrito();
        abrirCarrito();
        anunciar(nombre + " agregado al pedido. Total: " + calcularTotal() + " bolivianos.");
    });
});

lista.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.nombre;
    if (!carrito[id]) return;
    if (btn.dataset.accion === "mas") {
        carrito[id].cantidad++;
    } else {
        carrito[id].cantidad--;
        if (carrito[id].cantidad <= 0) delete carrito[id];
    }
    dibujarCarrito();
    anunciar("Total: " + calcularTotal() + " bolivianos.");
});

document.getElementById("btn-carrito").addEventListener("click", abrirCarrito);
document.getElementById("cerrar-carrito").addEventListener("click", cerrarCarrito);

document.getElementById("vaciar-carrito").addEventListener("click", function () {
    carrito = {};
    dibujarCarrito();
    anunciar("Pedido vaciado.");
});

/* ---------- Método de pago y QR ---------- */
const modalQR = document.getElementById("modal-qr");
const textoEnviar = document.getElementById("texto-enviar");

function metodoPago() {
    return document.querySelector('input[name="pago"]:checked').value;
}

function actualizarBotonEnviar() {
    textoEnviar.textContent = metodoPago() === "QR"
        ? "Ver QR y pagar"
        : "Enviar pedido por WhatsApp";
}

document.querySelectorAll('input[name="pago"]').forEach(function (r) {
    r.addEventListener("change", actualizarBotonEnviar);
});

function abrirQR() {
    focoPrevioQR = document.activeElement;
    document.getElementById("qr-total").textContent = calcularTotal() + " Bs";
    panel.inert = true;
    modalQR.classList.add("abierto");
    modalQR.setAttribute("aria-hidden", "false");
    document.getElementById("cerrar-qr").focus();
}

function cerrarQR() {
    modalQR.classList.remove("abierto");
    modalQR.setAttribute("aria-hidden", "true");
    panel.inert = !panel.classList.contains("abierto");
    if (focoPrevioQR) focoPrevioQR.focus();
}

// Si la imagen del QR no existe, avisar en vez de mostrar una imagen rota
document.getElementById("qr-imagen").addEventListener("error", function () {
    this.hidden = true;
    document.getElementById("qr-error").hidden = false;
});

document.getElementById("cerrar-qr").addEventListener("click", cerrarQR);

modalQR.addEventListener("click", function (e) {
    if (e.target === modalQR) cerrarQR();
});

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (modalQR.classList.contains("abierto")) {
        cerrarQR();
    } else if (panel.classList.contains("abierto")) {
        cerrarCarrito();
    }
});

/* ---------- Enviar pedido ---------- */
const campoDireccion = document.getElementById("campo-direccion");
const entradaDireccion = document.getElementById("cliente-direccion");
const entradaMaps = document.getElementById("cliente-maps");
const estadoUbicacion = document.getElementById("estado-ubicacion");
const botonUbicacion = document.getElementById("usar-ubicacion");

document.querySelectorAll('input[name="entrega"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
        const esDomicilio = document.querySelector('input[name="entrega"]:checked').value === "Entrega a domicilio";
        campoDireccion.hidden = !esDomicilio;
        entradaDireccion.required = esDomicilio;
        entradaMaps.required = esDomicilio;
        if (!esDomicilio) {
            entradaDireccion.value = "";
            entradaMaps.value = "";
            estadoUbicacion.textContent = "";
        }
    });
});

function esEnlaceGoogleMaps(valor) {
    try {
        const url = new URL(valor);
        const host = url.hostname.toLowerCase();
        return url.protocol === "https:" && (
            (host === "www.google.com" && url.pathname.startsWith("/maps")) ||
            host === "maps.google.com" ||
            host === "maps.app.goo.gl" ||
            (host === "goo.gl" && url.pathname.startsWith("/maps/"))
        );
    } catch (_) {
        return false;
    }
}

botonUbicacion.addEventListener("click", function () {
    estadoUbicacion.textContent = "";
    if (!navigator.geolocation) {
        estadoUbicacion.textContent = "Este navegador no permite compartir la ubicación. Pega un enlace de Google Maps.";
        return;
    }
    botonUbicacion.disabled = true;
    estadoUbicacion.textContent = "Solicitando permiso para obtener tu ubicación…";
    navigator.geolocation.getCurrentPosition(function (posicion) {
        const lat = posicion.coords.latitude.toFixed(6);
        const lon = posicion.coords.longitude.toFixed(6);
        entradaMaps.value = "https://www.google.com/maps?q=" + lat + "," + lon;
        estadoUbicacion.textContent = "Ubicación lista. Se enviará al negocio junto con tu pedido.";
        botonUbicacion.disabled = false;
    }, function (error) {
        const mensajes = {
            1: "No se dio permiso para la ubicación. Puedes pegar manualmente un enlace de Google Maps.",
            2: "No se pudo obtener la ubicación. Intenta otra vez o pega el enlace de Google Maps.",
            3: "La ubicación tardó demasiado. Intenta otra vez o pega el enlace de Google Maps."
        };
        estadoUbicacion.textContent = mensajes[error.code] || "No se pudo obtener la ubicación. Pega un enlace de Google Maps.";
        botonUbicacion.disabled = false;
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
});

function validarDatosPedido() {
    const nombre = document.getElementById("cliente-nombre");
    const telefono = document.getElementById("cliente-telefono");
    const entrega = document.querySelector('input[name="entrega"]:checked').value;

    if (!nombre.value.trim()) {
        aviso.textContent = "Escribe tu nombre para identificar el pedido.";
        nombre.focus();
        return false;
    }
    if (!telefono.value.trim()) {
        aviso.textContent = "Escribe un número de teléfono de contacto.";
        telefono.focus();
        return false;
    }
    if (entrega === "Entrega a domicilio" && !entradaDireccion.value.trim()) {
        aviso.textContent = "Escribe tu dirección y zona para coordinar la entrega.";
        entradaDireccion.focus();
        return false;
    }
    if (entrega === "Entrega a domicilio" && !esEnlaceGoogleMaps(entradaMaps.value.trim())) {
        aviso.textContent = "Pega un enlace válido de Google Maps o usa el botón para compartir tu ubicación.";
        entradaMaps.focus();
        return false;
    }
    return true;
}

function construirMensaje(pago, pedido) {
    let mensaje = "Hola Pollos Vidal, quiero hacer este pedido:\n\n";
    mensaje += "Pedido #" + pedido.id + "\n";
    mensaje += "Nombre: " + pedido.customer_name + "\nTeléfono de contacto: " + pedido.customer_phone + "\n";
    mensaje += "Entrega: " + pedido.delivery + "\n";
    if (pedido.delivery === "Entrega a domicilio") {
        mensaje += "Dirección y zona: " + pedido.address + "\n";
        if (pedido.maps_url) mensaje += "Ubicación en Google Maps: " + pedido.maps_url + "\n";
    }
    pedido.items.forEach(function (item) {
        mensaje += "• " + item.quantity + " x " + item.name + " = " + (item.price * item.quantity) + " Bs\n";
    });
    mensaje += "\nTotal de productos (sin envío): " + pedido.total + " Bs";
    if (pago === "QR") {
        mensaje += "\nMétodo de pago: QR. Enviaré el comprobante por WhatsApp; pago pendiente de verificación.";
    } else {
        mensaje += "\nMétodo de pago: Efectivo";
    }
    return mensaje;
}

let pedidoGuardado = null;
let enviando = false;

async function guardarPedido(pago) {
    if (!supabaseClient) throw new Error("La conexión de pedidos todavía no está configurada. Contacta al negocio por WhatsApp.");
    const entrega = document.querySelector('input[name="entrega"]:checked').value;
    const datos = {
        name: document.getElementById("cliente-nombre").value.trim(),
        phone: document.getElementById("cliente-telefono").value.trim(),
        delivery: entrega,
        address: entrega === "Entrega a domicilio" ? entradaDireccion.value.trim() : "",
        maps_url: entrega === "Entrega a domicilio" ? entradaMaps.value.trim() : "",
        payment: pago,
        items: Object.keys(carrito).map(function (id) { return { id: carrito[id].id, quantity: carrito[id].cantidad }; })
    };
    const respuesta = await supabaseClient.functions.invoke("create-order", { body: datos });
    const resultado = respuesta.data || {};
    if (respuesta.error || !resultado.order) throw new Error(resultado.error?.message || resultado.error || "No se pudo registrar el pedido. Inténtalo de nuevo.");
    pedidoGuardado = resultado.order;
    return pedidoGuardado;
}

function abrirWhatsApp(pedido, ventana) {
    const url = enlaceWhatsApp(construirMensaje(pedido.payment, pedido));
    if (ventana && !ventana.closed) {
        ventana.opener = null;
        ventana.location.href = url;
    } else {
        window.location.href = url;
    }
}

document.getElementById("enviar-pedido").addEventListener("click", function () {
    aviso.textContent = "";
    if (Object.keys(carrito).length === 0) {
        aviso.textContent = "Agrega al menos un producto a tu pedido.";
        return;
    }
    if (!validarDatosPedido()) return;
    if (!casillaAcepto.checked) {
        aviso.textContent = "Marca la casilla para aceptar la política de privacidad y los términos.";
        casillaAcepto.focus();
        return;
    }
    if (enviando) return;
    enviando = true;
    const botonEnvio = document.getElementById("enviar-pedido");
    botonEnvio.disabled = true;
    const pago = metodoPago();
    const ventana = pago === "QR" ? null : window.open("about:blank", "_blank");
    aviso.textContent = "Registrando tu pedido…";
    guardarPedido(pago).then(function (pedido) {
        aviso.textContent = "Pedido #" + pedido.id + " registrado. " + (pago === "QR" ? "Completa el pago y continúa por WhatsApp." : "Abriendo WhatsApp…");
        if (pago === "QR") abrirQR();
        else abrirWhatsApp(pedido, ventana);
    }).catch(function (error) {
        if (ventana && !ventana.closed) ventana.close();
        aviso.textContent = error.message;
    }).finally(function () {
        enviando = false;
        botonEnvio.disabled = false;
    });
});

document.getElementById("pagado-qr").addEventListener("click", function () {
    if (pedidoGuardado) {
        abrirWhatsApp(pedidoGuardado, window.open("about:blank", "_blank"));
        aviso.textContent = "Pedido #" + pedidoGuardado.id + " enviado por WhatsApp. El negocio verificará el pago.";
    }
    cerrarQR();
});

dibujarCarrito();
actualizarBotonEnviar();
