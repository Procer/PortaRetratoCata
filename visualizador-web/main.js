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
let clockFontSize = 16;
let weatherCity = '';
let weatherFontSize = 16;
let currentMediaIndex = 0;
let slideshowTimerId = null;
let isSyncing = false;

const slideshowContainer = document.getElementById('slideshow-container');
const dateTimeContainer = document.getElementById('datetime-container');
const weatherContainer = document.getElementById('weather-container');


// --- Lógica del Slideshow Mejorada ---
function cleanupOldMedia() {
    if (slideshowTimerId) {
        clearTimeout(slideshowTimerId);
        slideshowTimerId = null;
    }
    const oldElements = slideshowContainer.querySelectorAll('.slideshow-image, .slideshow-video');
    oldElements.forEach(el => {
        if (el.tagName === 'VIDEO') {
            el.pause();
            el.src = '';
            el.removeEventListener('ended', showNextMedia);
            el.removeEventListener('error', showNextMedia);
        }
        el.classList.remove('visible');
    });
    setTimeout(() => {
        const elementsToRemove = slideshowContainer.querySelectorAll('.slideshow-image, .slideshow-video');
        elementsToRemove.forEach(el => {
            if (!el.classList.contains('visible')) {
                slideshowContainer.removeChild(el);
            }
        });
    }, 1600);
}

function showNextMedia() {
    cleanupOldMedia();
    if (mediaItems.length === 0) {
        slideshowTimerId = setTimeout(showNextMedia, 5000);
        return;
    }
    const item = mediaItems[currentMediaIndex];
    if (item.media_type === 'video') {
        const video = document.createElement('video');
        video.src = `${API_BASE_URL}/${item.url}`;
        video.muted = true;
        video.playsInline = true;
        video.className = 'slideshow-video';
        video.addEventListener('canplay', function() {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Error al intentar reproducir el video automáticamente:', error);
                    showNextMedia();
                });
            }
            setTimeout(() => video.classList.add('visible'), 50);
        }, { once: true });
        video.addEventListener('ended', showNextMedia, { once: true });
        video.addEventListener('error', () => {
            console.warn(`Error al cargar el video: ${item.url}. Saltando al siguiente.`);
            showNextMedia();
        }, { once: true });
        slideshowContainer.appendChild(video);
        video.load();
    } else {
        const image = new Image();
        image.src = `${API_BASE_URL}/${item.url}`;
        image.onload = () => {
            image.className = 'slideshow-image';
            slideshowContainer.appendChild(image);
            setTimeout(() => image.classList.add('visible'), 50);
            slideshowTimerId = setTimeout(showNextMedia, transitionTime * 1000);
        };
        image.onerror = () => {
            console.warn(`Error al cargar la imagen: ${item.url}. Saltando a la siguiente.`);
            showNextMedia();
        };
    }
    currentMediaIndex = (currentMediaIndex + 1) % mediaItems.length;
}

// --- Lógica del Reloj ---
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

// --- Lógica del Clima ---
async function fetchWeather() {
    if (!weatherCity) {
        console.log('No hay ciudad configurada para el clima.');
        weatherContainer.classList.remove('loaded');
        return;
    }
    try {
        const fetchOptions = { method: 'GET', headers: { 'X-Api-Token': API_TOKEN } };
        const response = await fetch(`${API_BASE_URL}/weather`, fetchOptions);
        if (!response.ok) {
            // Intenta obtener más detalles del error desde el cuerpo de la respuesta
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudo obtener el clima.');
        }
        const data = await response.json();
        weatherContainer.innerHTML = `
            <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" class="weather-icon">
            <span class="weather-temp">${data.temp}°C</span>
            <span class="weather-desc">${data.description}</span>
        `;
        weatherContainer.classList.add('loaded');
    } catch (error) {
        console.error('Error al obtener el clima:', error.message);
        weatherContainer.classList.remove('loaded');
    }
}

// --- Lógica de Sincronización con el Backend ---
async function syncWithBackend() {
    if (isSyncing) {
        console.log('Sincronización ya en curso. Omitiendo.');
        return;
    }
    isSyncing = true;
    console.log('Sincronizando con el backend...');
    try {
        const fetchOptions = { method: 'GET', headers: { 'X-Api-Token': API_TOKEN } };
        const configResponse = await fetch(`${API_BASE_URL}/config`, fetchOptions);
        let configChanged = false;

        if (configResponse.ok) {
            const config = await configResponse.json();
            if (transitionTime !== parseInt(config.tiempo_transicion_seg, 10)) {
                transitionTime = parseInt(config.tiempo_transicion_seg, 10) || 10;
                configChanged = true;
            }
            clockFontSize = parseInt(config.font_size_px, 10) || 16;
            weatherFontSize = parseInt(config.weather_font_size_px, 10) || 16;
            const newCity = config.weather_city || '';
            if (weatherCity !== newCity) {
                weatherCity = newCity;
                fetchWeather(); // Si la ciudad cambia, buscar clima inmediatamente
            }
            if (dateTimeContainer) dateTimeContainer.style.fontSize = `${clockFontSize}px`;
            if (weatherContainer) weatherContainer.style.fontSize = `${weatherFontSize}px`;
        } else {
            console.error('No se pudo obtener la configuración. Usando valores por defecto.');
        }

        const mediaResponse = await fetch(`${API_BASE_URL}/photos`, fetchOptions);
        if (mediaResponse.ok) {
            const newItems = await mediaResponse.json();
            if (JSON.stringify(mediaItems) !== JSON.stringify(newItems) || configChanged) {
                console.log(`Lista de medios o configuración actualizada.`);
                mediaItems = newItems;
                shuffleArray(mediaItems);
                currentMediaIndex = 0;
                showNextMedia();
            }
        } else {
            console.error('No se pudo obtener la lista de medios.');
        }
    } catch (error) {
        console.error('Error al sincronizar con el backend:', error);
    } finally {
        isSyncing = false;
    }
}

// --- Inicio de la Aplicación ---
function startApp() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    syncWithBackend().then(() => {
        if (!slideshowTimerId && mediaItems.length > 0) {
            showNextMedia();
        }
        if (weatherCity) {
            fetchWeather();
        }
        setInterval(syncWithBackend, 30000); // Sincroniza config y fotos
        setInterval(fetchWeather, 30 * 60 * 1000); // Actualiza el clima cada 30 minutos
    });
}

startApp();
