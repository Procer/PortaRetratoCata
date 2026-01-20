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
let forecastMorningStart = null;
let forecastMorningEnd = null;
let forecastEveningStart = null;
let forecastEveningEnd = null;

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
        video.src = item.url;
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
        image.src = item.url;
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
    
    // Formato de Hora
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Formato de Fecha
    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const monthName = months[now.getMonth()];
    
    const timeHTML = `<div class="time-display">${hours}:${minutes}<span class="seconds">:${seconds}</span></div>`;
    const dateHTML = `<div class="date-display">${dayName}, ${day} de ${monthName}</div>`;
    
    if (dateTimeContainer) {
        dateTimeContainer.innerHTML = timeHTML + dateHTML;
    }
}

// --- Lógica del Clima y Pronóstico ---

async function renderCurrentWeather() {
    if (!weatherCity) {
        console.log('No hay ciudad configurada para el clima.');
        weatherContainer.classList.remove('loaded');
        return;
    }
    try {
        const fetchOptions = { method: 'GET', headers: { 'X-Api-Token': API_TOKEN } };
        const response = await fetch(`${API_BASE_URL}/weather`, fetchOptions);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudo obtener el clima.');
        }
        const data = await response.json();
        const iconHtml = `<img src="https:${data.icon}" alt="${data.description}" class="weather-icon-img">`;

        weatherContainer.innerHTML = `
            <div class="weather-icon">${iconHtml}</div>
            <div class="weather-info">
                <span class="weather-temp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="temp-icon"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>
                    ${data.temp}°C
                </span>
                <span class="weather-desc">${data.description}</span>
            </div>
        `;
        weatherContainer.classList.add('loaded');
    } catch (error) {
        console.error('Error al obtener el clima actual:', error.message);
        weatherContainer.classList.remove('loaded');
    }
}

async function renderForecast(type) {
    if (!weatherCity) {
        console.log('No hay ciudad configurada para el pronóstico.');
        weatherContainer.classList.remove('loaded');
        return;
    }
    try {
        const fetchOptions = { method: 'GET', headers: { 'X-Api-Token': API_TOKEN } };
        const response = await fetch(`${API_BASE_URL}/forecast`, fetchOptions);
        if (!response.ok) throw new Error('No se pudo obtener el pronóstico.');
        
        const data = await response.json();
        let forecastHTML = '';

        if (type === 'day' && data.hourly && data.hourly.length > 0) {
            // Pronóstico por hora para el resto del día
            forecastHTML = `<div class="forecast-hourly-container">`;
            data.hourly.slice(0, 5).forEach(hour => {
                const iconHtml = `<img src="https:${hour.icon}" alt="${hour.description}" class="forecast-icon-img">`;
                forecastHTML += `
                    <div class="forecast-item">
                        <div class="forecast-time">${hour.hour}</div>
                        <div class="forecast-icon">${iconHtml}</div>
                        <div class="forecast-temp">${hour.temp}°</div>
                    </div>
                `;
            });
            forecastHTML += `</div>`;
        } else if (type === 'night' && data.daily && data.daily.length > 0) {
            // Pronóstico para el día siguiente
            const tomorrow = data.daily[0];
            const iconHtml = `<img src="https:${tomorrow.icon}" alt="${tomorrow.description}" class="weather-icon-img">`;
            forecastHTML = `
                <div class="forecast-daily-container">
                    <div class="forecast-day-name">Mañana: ${tomorrow.day_name}</div>
                    <div class="forecast-icon">${iconHtml}</div>
                    <div class="forecast-daily-temp">
                        <span class="temp-max">Max: ${tomorrow.temp_max}°</span>
                        <span class="temp-min">Min: ${tomorrow.temp_min}°</span>
                    </div>
                    <div class="forecast-desc">${tomorrow.description}</div>
                </div>
            `;
        } else {
            // Si no hay datos, mostrar clima actual como fallback
            return renderCurrentWeather();
        }

        weatherContainer.innerHTML = forecastHTML;
        weatherContainer.classList.add('loaded');

    } catch (error) {
        console.error('Error al obtener el pronóstico:', error.message);
        // Fallback a clima actual si el pronóstico falla
        renderCurrentWeather();
    }
}

function updateWeatherDisplay() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const morningStart = parseTime(forecastMorningStart);
    const morningEnd = parseTime(forecastMorningEnd);
    const eveningStart = parseTime(forecastEveningStart);
    const eveningEnd = parseTime(forecastEveningEnd);

    if (morningStart !== null && morningEnd !== null && currentTime >= morningStart && currentTime <= morningEnd) {
        renderForecast('day');
    } else if (eveningStart !== null && eveningEnd !== null && currentTime >= eveningStart && currentTime <= eveningEnd) {
        renderForecast('night');
    } else {
        renderCurrentWeather();
    }
}


// --- Lógica de Sincronización con el Backend ---
async function syncWithBackend() {
    if (isSyncing) return;
    isSyncing = true;
    console.log('Sincronizando con el backend...');

    try {
        const fetchOptions = { method: 'GET', headers: { 'X-Api-Token': API_TOKEN } };
        const configResponse = await fetch(`${API_BASE_URL}/config`, fetchOptions);
        let configChanged = false;
        let weatherConfigChanged = false;

        if (configResponse.ok) {
            const config = await configResponse.json();
            if (transitionTime !== (parseInt(config.tiempo_transicion_seg, 10) || 10)) {
                transitionTime = parseInt(config.tiempo_transicion_seg, 10) || 10;
                configChanged = true;
            }
            clockFontSize = parseInt(config.font_size_px, 10) || 16;
            
            if (weatherFontSize !== (parseInt(config.weather_font_size_px, 10) || 16) || weatherCity !== (config.weather_city || '')) {
                weatherConfigChanged = true;
            }
            weatherFontSize = parseInt(config.weather_font_size_px, 10) || 16;
            weatherCity = config.weather_city || '';
            
            if (forecastMorningStart !== config.forecast_morning_start || forecastMorningEnd !== config.forecast_morning_end || forecastEveningStart !== config.forecast_evening_start || forecastEveningEnd !== config.forecast_evening_end) {
                weatherConfigChanged = true;
            }
            forecastMorningStart = config.forecast_morning_start;
            forecastMorningEnd = config.forecast_morning_end;
            forecastEveningStart = config.forecast_evening_start;
            forecastEveningEnd = config.forecast_evening_end;

            if (dateTimeContainer) dateTimeContainer.style.fontSize = `${clockFontSize}px`;
            if (weatherContainer) weatherContainer.style.fontSize = `${weatherFontSize}px`;
            
            if (weatherConfigChanged) {
                updateWeatherDisplay();
            }

        } else {
            console.error('No se pudo obtener la configuración. Usando valores por defecto.');
        }

        const mediaResponse = await fetch(`${API_BASE_URL}/photos`, fetchOptions);
        if (mediaResponse.ok) {
            const newItems = await mediaResponse.json();
            if (JSON.stringify(mediaItems) !== JSON.stringify(newItems) || configChanged) {
                console.log('Lista de medios o configuración de slideshow actualizada.');
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
        // La primera llamada al clima se hace dentro de syncWithBackend si la configuración cambia
        // o a través del intervalo regular.
        setInterval(syncWithBackend, 30000); 
        setInterval(updateWeatherDisplay, 30 * 60 * 1000); // Actualiza el clima/pronóstico cada 30 mins
    });
}

startApp();
