/*
  Archivo principal de JavaScript.
  Maneja la interactividad global: menú móvil y carga dinámica de componentes.
*/

// Función para cargar componentes HTML dinámicamente usando Fetch API
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Error al cargar ${componentPath}`);
        const html = await response.text();
        const element = document.getElementById(elementId);
        
        if (element) {
            element.innerHTML = html;
            
            // Inicializar scripts específicos tras cargar componentes
            if (elementId === 'navbar-container') {
                initNavbar();
            }
        }
    } catch (error) {
        console.error("Error cargando componente:", error);
    }
}

// Inicializar la interactividad del Navbar
function initNavbar() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    if (mobileMenuToggle && navbarMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navbarMenu.classList.toggle('active');
            
            // Evitar scroll en el body cuando el menú móvil está abierto
            if (navbarMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Cerrar menú al hacer clic en un enlace
        const links = navbarMenu.querySelectorAll('.nav-link, .btn');
        links.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                navbarMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}

// Ejecutar cargas al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    // Importamos el navbar en el contenedor designado
    loadComponent('navbar-container', '/components/navbar.html');
    // Importamos el footer
    loadComponent('footer-container', '/components/footer.html');
    
    // Iniciar animaciones con un pequeño retraso para permitir inyecciones del DOM
    setTimeout(initScrollAnimations, 150);
});

function initScrollAnimations() {
    const sections = document.querySelectorAll('.hero-content, .hero-visual, .product-card, .feature-card, .cta-box');
    sections.forEach(el => el.classList.add('animate-on-scroll'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    sections.forEach(el => observer.observe(el));
}
