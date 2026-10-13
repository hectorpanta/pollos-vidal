const CONFIG = {
    telefono: "59164800385",              
    telefonoVisible: "+591 64800385",
    direccion: "Ver ubicación en Google Maps",   
    coordenadas: "-17.464823,-66.128996",       
    enlaceMapa: "https://maps.app.goo.gl/6kdsTAnHDXnfAr1j9",
    mensajeBase: "Hola Pollos Vidal, quiero hacer un pedido.",

    horarios: [
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"],   
        ["12:00 am", "20:00 pm"]    
    ]
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
document.getElementById("mapa").src =
    "https://www.google.com/maps?q=" + CONFIG.coordenadas + "&z=17&output=embed";

/* ---------- Horarios y estado Abierto/Cerrado ---------- */
function aMinutos(hora) {
    const partes = hora.split(":");
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
}

function dibujarHorarios() {
    const tabla = document.getElementById("tabla-horarios");
    const hoy = new Date().getDay();
    // Mostrar de Lunes a Domingo
    const orden = [1, 2, 3, 4, 5, 6, 0];
    tabla.innerHTML = orden.map(function (d) {
        const h = CONFIG.horarios[d];
        const texto = h ? h[0] + " - " + h[1] : "Cerrado";
        const clase = d === hoy ? ' class="hoy"' : "";
        return "<tr" + clase + "><td>" + DIAS[d] + "</td><td>" + texto + "</td></tr>";
    }).join("");
}

function actualizarEstado() {
    const ahora = new Date();
    const h = CONFIG.horarios[ahora.getDay()];
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const estado = document.getElementById("estado");
    const abierto = h && minutos >= aMinutos(h[0]) && minutos < aMinutos(h[1]);

    if (abierto) {
        estado.textContent = "● Abierto ahora · hasta las " + h[1];
        estado.className = "estado abierto";
    } else {
        estado.textContent = "● Cerrado ahora";
        estado.className = "estado cerrado";
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
    btnMenu.setAttribute("aria-expanded", abierto);
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

/* ---------- Carrito de pedido ---------- */
let carrito = {};   // { "Nombre": { precio: 17, cantidad: 2 } }

const panel = document.getElementById("panel-carrito");
const lista = document.getElementById("carrito-lista");

function abrirCarrito() {
    panel.classList.add("abierto");
    panel.setAttribute("aria-hidden", "false");
}

function cerrarCarrito() {
    panel.classList.remove("abierto");
    panel.setAttribute("aria-hidden", "true");
}

function calcularTotal() {
    return Object.keys(carrito).reduce(function (suma, n) {
        return suma + carrito[n].precio * carrito[n].cantidad;
    }, 0);
}

function dibujarCarrito() {
    const nombres = Object.keys(carrito);
    let cantidadTotal = 0;

    if (nombres.length === 0) {
        lista.innerHTML = '<p class="carrito-vacio">Aún no agregaste nada.</p>';
    } else {
        lista.innerHTML = nombres.map(function (n) {
            const item = carrito[n];
            cantidadTotal += item.cantidad;
            return '<div class="carrito-item">' +
                '<span class="nombre">' + n + '</span>' +
                '<button data-accion="menos" data-nombre="' + n + '">−</button>' +
                '<span>' + item.cantidad + '</span>' +
                '<button data-accion="mas" data-nombre="' + n + '">+</button>' +
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
    });
});

lista.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const nombre = btn.dataset.nombre;
    if (btn.dataset.accion === "mas") {
        carrito[nombre].cantidad++;
    } else {
        carrito[nombre].cantidad--;
        if (carrito[nombre].cantidad <= 0) delete carrito[nombre];
    }
    dibujarCarrito();
});

document.getElementById("btn-carrito").addEventListener("click", abrirCarrito);
document.getElementById("cerrar-carrito").addEventListener("click", cerrarCarrito);

document.getElementById("vaciar-carrito").addEventListener("click", function () {
    carrito = {};
    dibujarCarrito();
});

/* ---------- Método de pago y QR ---------- */
const modalQR = document.getElementById("modal-qr");
const textoEnviar = document.getElementById("texto-enviar");

function metodoPago() {
    return document.querySelector('input[name="pago"]:checked').value;
}

function actualizarBotonEnviar() {
    textoEnviar.textContent = metodoPago() === "QR"
        ? "Pagar con QR"
        : "Enviar pedido por WhatsApp";
}

document.querySelectorAll('input[name="pago"]').forEach(function (r) {
    r.addEventListener("change", actualizarBotonEnviar);
});

function abrirQR() {
    document.getElementById("qr-total").textContent = calcularTotal() + " Bs";
    modalQR.classList.add("abierto");
    modalQR.setAttribute("aria-hidden", "false");
}

function cerrarQR() {
    modalQR.classList.remove("abierto");
    modalQR.setAttribute("aria-hidden", "true");
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
    if (e.key === "Escape") cerrarQR();
});

/* ---------- Enviar pedido ---------- */
function construirMensaje(pago) {
    let mensaje = "Hola Pollos Vidal, quiero hacer este pedido:\n\n";
    Object.keys(carrito).forEach(function (n) {
        const item = carrito[n];
        mensaje += "• " + item.cantidad + " x " + n + " = " + (item.precio * item.cantidad) + " Bs\n";
    });
    mensaje += "\nTotal: " + calcularTotal() + " Bs";
    if (pago === "QR") {
        mensaje += "\nMétodo de pago: QR (ya realicé el pago, te envío el comprobante)";
    } else {
        mensaje += "\nMétodo de pago: Efectivo";
    }
    return mensaje;
}

function enviarPedido(pago) {
    window.open(enlaceWhatsApp(construirMensaje(pago)), "_blank");
}

document.getElementById("enviar-pedido").addEventListener("click", function () {
    if (Object.keys(carrito).length === 0) {
        alert("Agrega al menos un producto a tu pedido.");
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