const CONFIG = {
    telefono: "59164800385",
    telefonoVisible: "+591 64800385",
    direccion: "Avenida Río Paraguay, Cochabamba",
    coordenadas: "-17.464823,-66.128996",
    enlaceMapa: "https://maps.app.goo.gl/6kdsTAnHDXnfAr1j9",
    mensajeBase: "Hola Pollos Vidal, quiero hacer un pedido.",
    zonaHoraria: "America/La_Paz",

    // Formato 24 h "HH:MM". Posición 0 = Domingo, 1 = Lunes ... 6 = Sábado.
    // Usa null en un día para mostrarlo como "Cerrado".
    horarios: [
        ["12:00", "20:00"],   // Domingo
        ["12:00", "20:00"],   // Lunes
        ["12:00", "20:00"],   // Martes
        ["12:00", "20:00"],   // Miércoles
        ["12:00", "20:00"],   // Viernes
        ["12:00", "20:00"]    // Sábado
    ]
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
            const e = esc(n);
            return '<div class="carrito-item">' +
                '<span class="nombre">' + e + '</span>' +
                '<button type="button" data-accion="menos" data-nombre="' + e + '" aria-label="Quitar una unidad de ' + e + '">−</button>' +
                '<span aria-label="Cantidad">' + item.cantidad + '</span>' +
                '<button type="button" data-accion="mas" data-nombre="' + e + '" aria-label="Agregar una unidad de ' + e + '">+</button>' +
                '<span>' + (item.precio * item.cantidad) + ' Bs</span>' +
                '</div>';
        }).join("");
    }

    document.getElementById("carrito-total").textContent = calcularTotal() + " Bs";
    document.getElementById("carrito-cantidad").textContent = cantidadTotal;
}

document.querySelectorAll(".btn-agregar").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const nombre = btn.dataset.nombre;
        const precio = parseFloat(btn.dataset.precio);
        if (carrito[nombre]) {
            carrito[nombre].cantidad++;
        } else {
            carrito[nombre] = { precio: precio, cantidad: 1 };
        }
        dibujarCarrito();
        abrirCarrito();
        anunciar(nombre + " agregado al pedido. Total: " + calcularTotal() + " bolivianos.");
    });
});

lista.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const nombre = btn.dataset.nombre;
    if (!carrito[nombre]) return;
    if (btn.dataset.accion === "mas") {
        carrito[nombre].cantidad++;
    } else {
        carrito[nombre].cantidad--;
        if (carrito[nombre].cantidad <= 0) delete carrito[nombre];
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
function construirMensaje(pago) {
    let mensaje = "Hola Pollos Vidal, quiero hacer este pedido:\n\n";
    Object.keys(carrito).forEach(function (n) {
        const item = carrito[n];
        mensaje += "• " + item.cantidad + " x " + n + " = " + (item.precio * item.cantidad) + " Bs\n";
    });
    mensaje += "\nTotal (sin envío): " + calcularTotal() + " Bs";
    if (pago === "QR") {
        mensaje += "\nMétodo de pago: QR (ya realicé el pago, te envío el comprobante)";
    } else {
        mensaje += "\nMétodo de pago: Efectivo";
    }
    return mensaje;
}

function enviarPedido(pago) {
    window.open(enlaceWhatsApp(construirMensaje(pago)), "_blank", "noopener");
}

document.getElementById("enviar-pedido").addEventListener("click", function () {
    aviso.textContent = "";
    if (Object.keys(carrito).length === 0) {
        aviso.textContent = "Agrega al menos un producto a tu pedido.";
        return;
    }
    if (!casillaAcepto.checked) {
        aviso.textContent = "Marca la casilla para aceptar la política de privacidad y los términos.";
        casillaAcepto.focus();
        return;
    }
    if (metodoPago() === "QR") {
        abrirQR();
    } else {
        enviarPedido("Efectivo");
    }
});

document.getElementById("pagado-qr").addEventListener("click", function () {
    enviarPedido("QR");
    cerrarQR();
});

dibujarCarrito();
actualizarBotonEnviar();