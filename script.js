/* =====================================================
   CONFIGURACIÓN - CAMBIA ESTOS DATOS POR LOS REALES
   ===================================================== */
const CONFIG = {
    telefono: "59170000000",              // Número con código de país, sin + ni espacios
    telefonoVisible: "+591 70000000",     // Cómo se muestra en la página
    direccion: "Ver ubicación en Google Maps",   // Texto del enlace (puedes escribir tu dirección: "Av. ... #...")
    coordenadas: "-17.464823,-66.128996",       // Ubicación exacta del local
    enlaceMapa: "https://maps.app.goo.gl/6kdsTAnHDXnfAr1j9",
    mensajeBase: "Hola Pollos Vidal, quiero hacer un pedido.",
    // Horarios por día: [apertura, cierre] en formato 24h, o null si cierra
    // Orden: Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado
    horarios: [
        ["11:00", "21:00"],   // Domingo
        ["11:00", "21:00"],   // Lunes
        ["11:00", "21:00"],   // Martes
        ["11:00", "21:00"],   // Miércoles
        ["11:00", "21:00"],   // Jueves
        ["11:00", "21:00"],   // Viernes
        ["11:00", "21:00"]    // Sábado
    ]
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* ---------- WhatsApp ---------- */
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

/* ---------- Dirección y mapa ---------- */
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

function dibujarCarrito() {
    const nombres = Object.keys(carrito);
    let total = 0;
    let cantidadTotal = 0;

    if (nombres.length === 0) {
        lista.innerHTML = '<p class="carrito-vacio">Aún no agregaste nada.</p>';
    } else {
        lista.innerHTML = nombres.map(function (n) {
            const item = carrito[n];
            total += item.precio * item.cantidad;
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

    document.getElementById("carrito-total").textContent = total + " Bs";
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

document.getElementById("enviar-pedido").addEventListener("click", function () {
    const nombres = Object.keys(carrito);
    if (nombres.length === 0) {
        alert("Agrega al menos un producto a tu pedido.");
        return;
    }
    let total = 0;
    let mensaje = "Hola Pollos Vidal, quiero hacer este pedido:\n\n";
    nombres.forEach(function (n) {
        const item = carrito[n];
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        mensaje += "• " + item.cantidad + " x " + n + " = " + subtotal + " Bs\n";
    });
    mensaje += "\nTotal: " + total + " Bs";
    window.open(enlaceWhatsApp(mensaje), "_blank");
});

dibujarCarrito();