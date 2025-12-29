// --- Configuración Esencial ---
const API_TOKEN = 'TOKEN_SEGURO_12345';
const API_BASE_URL = '../backend-php';

// Función para barajar un array (algoritmo de Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Estado de la Aplicación ---
let mediaItems = [];
let transitionTime = 10;
let currentMediaIndex = 0;
let imageTimerId = null; // Para controlar el temporizador de las imágenes

const slideshowContainer = document.getElementById('slideshow-container');

// --- Lógica del Slideshow (Versión Dinámica) ---
function showNextMedia() {
    // Detener cualquier temporizador de imagen anterior
    if (imageTimerId) clearTimeout(imageTimerId);

    if (mediaItems.length === 0) {
        // Si no hay medios, esperar 5 segundos y volver a intentar
        imageTimerId = setTimeout(showNextMedia, 5000);
        return;
    }

    // Limpiar elementos antiguos
    const oldElements = slideshowContainer.querySelectorAll('.slideshow-image');
    oldElements.forEach(el => {
        if (!el.classList.contains('visible')) {
            slideshowContainer.removeChild(el);
        }
    });

    const item = mediaItems[currentMediaIndex];
    let element;

    // Crear el elemento y configurar el próximo avance
    if (item.media_type === 'video') {
        element = document.createElement('video');
        element.src = `${API_BASE_URL}/${item.url}`;
        element.autoplay = true;
        element.muted = true;
        element.playsInline = true;

        // Cuando el vídeo termine, mostrar el siguiente medio
        element.addEventListener('ended', showNextMedia, { once: true });
        // Si hay un error en el vídeo, saltar al siguiente para no bloquear el carrusel
        element.addEventListener('error', showNextMedia, { once: true });

    } else { // Es una imagen
        element = document.createElement('img');
        element.src = `${API_BASE_URL}/${item.url}`;

        // Después del tiempo configurado, mostrar el siguiente medio
        imageTimerId = setTimeout(showNextMedia, transitionTime * 1000);
    }

    element.className = 'slideshow-image';
    slideshowContainer.appendChild(element);

    // Forzar un reflow para que la transición se aplique
    setTimeout(() => {
        element.classList.add('visible');
    }, 50);

    // Ocultar el elemento anterior
    if (oldElements.length > 0) {
        oldElements[0].classList.remove('visible');
    }

    // Actualizar el índice para el siguiente medio
    currentMediaIndex = (currentMediaIndex + 1) % mediaItems.length;
}

// --- Lógica del Reloj ---
const dateTimeContainer = document.getElementById('datetime-container');

function updateDateTime() {
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateTimeString = `${dayName} ${day} de ${monthName} del ${year}, ${hours}:${minutes}:${seconds} hs`;

    if (dateTimeContainer) {
        dateTimeContainer.innerHTML = dateTimeString;
    }
}

// --- Lógica de Sincronización con el Backend ---
async function syncWithBackend() {
    console.log('Sincronizando con el backend...');
    try {
        const fetchOptions = { method: 'GET', headers: { 'Authorization': `Bearer ${API_TOKEN}` } };

        const configResponse = await fetch(`${API_BASE_URL}/config?api_token=${API_TOKEN}`);
        if (configResponse.ok) {
            const config = await configResponse.json();
            transitionTime = config.tiempo_transicion_seg || 10;
        }

        const mediaResponse = await fetch(`${API_BASE_URL}/photos?api_token=${API_TOKEN}`);
        if (mediaResponse.ok) {
            const newItems = await mediaResponse.json();
            if (JSON.stringify(mediaItems) !== JSON.stringify(newItems)) {
                console.log(`Lista de medios actualizada: ${newItems.length} elementos.`);
                mediaItems = newItems;
                shuffleArray(mediaItems); // Barajar el array de medios
                currentMediaIndex = 0;
                // Interrumpir el slideshow actual y reiniciarlo con el nuevo contenido
                showNextMedia();
            }
        }
    } catch (error) {
        console.error('Error al sincronizar con el backend:', error);
    }
}

// --- Inicio de la Aplicación ---
function startApp() {
    // Iniciar el reloj
    updateDateTime();
    setInterval(updateDateTime, 1000); // Actualizar cada segundo

    // Sincronizar inmediatamente al iniciar
    syncWithBackend().then(() => {
        // Iniciar el slideshow por primera vez
        showNextMedia();
        // Iniciar el polling para futuras actualizaciones
        setInterval(syncWithBackend, 30000);
    });
}

startApp();
