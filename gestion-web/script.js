document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica de Pestañas ---
    const tabContainer = document.querySelector('.tabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.tab-button');
        if (!clickedButton) return;

        const tabId = clickedButton.dataset.tab;
        
        // Ocultar todos los contenidos y desactivar todos los botones
        tabButtons.forEach(button => button.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Activar el botón y el contenido seleccionados
        const contentToShow = document.getElementById(`tab-${tabId}`);
        clickedButton.classList.add('active');
        if (contentToShow) {
            contentToShow.classList.add('active');
        }
    });

    // --- Configuración Esencial ---
    const API_TOKEN = 'TOKEN_SEGURO_12345';
    const API_BASE_URL = '../backend-php';

    // --- Elementos del DOM ---
    const tiempoInput = document.getElementById('tiempo_transicion');
    const fontSizeInput = document.getElementById('font_size');
    const weatherCityInput = document.getElementById('weather_city');
    const weatherApiKeyInput = document.getElementById('weather_api_key');
    const weatherFontSizeInput = document.getElementById('weather_font_size');
    const btnGuardarConfig = document.getElementById('btn_guardar_config');
    const btnSubirFoto = document.getElementById('btn_subir_foto');
    const fileInput = document.getElementById('file_input');
    const feedbackMessage = document.getElementById('feedback-message');
    const photoListContainer = document.getElementById('photo-list-container');
    const btnRefreshGallery = document.getElementById('btn_refresh_gallery');
    const btnGoogleFotosConnect = document.getElementById('btn_google_fotos_connect');
    const dropZone = document.getElementById('drop-zone');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    // --- Elementos del DOM para Video ---
    const videoForm = document.getElementById('upload-video-form');
    const videoFileInput = document.getElementById('video-file');
    const videoProgressContainer = document.getElementById('video-progress-container');
    const videoProgressBar = document.getElementById('video-progress-bar');
    const videoUploadStatus = document.getElementById('video-upload-status');


    // --- Función para mostrar mensajes de feedback ---
    const showFeedback = (message, isError = false) => {
        feedbackMessage.textContent = message;
        feedbackMessage.className = 'feedback show ' + (isError ? 'error' : 'success');
        setTimeout(() => { feedbackMessage.classList.remove('show'); }, 3000);
    };

    // --- Lógica de subida de VIDEO ---
    const uploadVideo = (file) => {
        if (!file) {
            showFeedback('Por favor, selecciona un archivo de video.', true);
            return;
        }

        const formData = new FormData();
        formData.append('video', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                videoProgressContainer.style.display = 'block';
                videoProgressBar.style.width = percentComplete + '%';
                videoProgressBar.textContent = percentComplete + '%';
                videoUploadStatus.textContent = `Subiendo... ${percentComplete}%`;
            }
        });

        xhr.addEventListener('load', () => {
            videoProgressBar.textContent = '¡Completo!';
            videoUploadStatus.textContent = 'Procesando video...';

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showFeedback('¡Video subido con éxito!', false);
                        fetchPhotos(); // Refrescar la galería
                    } else {
                        throw new Error(response.error || 'Error desconocido en el servidor.');
                    }
                } catch (e) {
                     showFeedback('Error al procesar la respuesta del servidor.', true);
                     videoUploadStatus.textContent = 'Error de respuesta del servidor.';
                }
            } else {
                showFeedback(`Error en la subida: ${xhr.statusText}`, true);
                videoUploadStatus.textContent = `Error: ${xhr.statusText}`;
            }
            
            // Ocultar la barra de progreso después de un momento
            setTimeout(() => {
                videoProgressContainer.style.display = 'none';
                videoUploadStatus.textContent = '';
                videoForm.reset();
            }, 4000);
        });

        xhr.addEventListener('error', () => {
            showFeedback('Error de red durante la subida.', true);
            videoUploadStatus.textContent = 'Error de red. Inténtalo de nuevo.';
            videoProgressContainer.style.display = 'none';
        });

        xhr.open('POST', `${API_BASE_URL}/upload_video.php`, true);
        xhr.setRequestHeader('X-Api-Token', API_TOKEN);
        xhr.send(formData);
    };

    // --- Lógica de subida de FOTOS (múltiple) ---
    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        const originalButtonText = btnSubirFoto.textContent;
        btnSubirFoto.disabled = true;
        btnSubirFoto.textContent = 'Subiendo...';

        const BATCH_SIZE = 50;
        // Modificado para aceptar solo imágenes
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length !== files.length) {
            showFeedback('Algunos archivos no eran imágenes y fueron ignorados.', true);
        }

        if (validFiles.length === 0) {
            showFeedback('No se seleccionaron archivos de imagen válidos.', true);
            btnSubirFoto.disabled = false;
            btnSubirFoto.textContent = originalButtonText;
            return;
        }

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '';

        let totalUploaded = 0;
        for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
            const batch = validFiles.slice(i, i + BATCH_SIZE);
            const formData = new FormData();
            // Asegurarse que el backend espera 'photos[]'
            batch.forEach(file => formData.append('photos[]', file));

            try {
                // El endpoint de subida de fotos sigue siendo /photos
                const response = await fetch(`${API_BASE_URL}/photos`, {
                    method: 'POST',
                    headers: { 'X-Api-Token': API_TOKEN },
                    body: formData
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `Error en el servidor`);

                totalUploaded += data.uploaded_count || batch.length;
                const progress = Math.round((totalUploaded / validFiles.length) * 100);
                
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${progress}%`;
                progressText.textContent = `Subidos ${totalUploaded} de ${validFiles.length} archivos.`;

            } catch (error) {
                showFeedback(`Error durante la subida: ${error.message}`, true);
                progressText.textContent = `Error. La subida se detuvo.`;
                break; 
            }
        }

        showFeedback(`¡Proceso de subida de fotos completado!`, false);
        fetchPhotos();

        // Ocultar la barra de progreso después de un par de segundos
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressText.textContent = '';
        }, 4000);

        btnSubirFoto.textContent = originalButtonText;
        btnSubirFoto.disabled = false;
        fileInput.value = '';
    };

    /**
     * Genera una miniatura de un vídeo capturando un fotograma.
     * @param {string} videoUrl - La URL del vídeo.
     * @returns {Promise<string>} Una promesa que resuelve con la URL de la miniatura en formato Data URL.
     */
    const generateVideoThumbnail = (videoUrl) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = "anonymous"; // Necesario si los vídeos se sirvieran desde otro dominio

            // Cuando el vídeo ha buscado el fotograma solicitado
            video.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL()); // Devuelve la imagen como un string base64
            }, { once: true });

            video.addEventListener('error', (e) => {
                reject('Error al cargar el vídeo para generar la miniatura.');
            });

            // Iniciar la carga del vídeo y buscar el primer segundo
            video.src = videoUrl;
            video.currentTime = 1; 
        });
    };

    const renderPhotos = (media) => {
        photoListContainer.innerHTML = '';
        if (media.length === 0) {
            photoListContainer.innerHTML = '<p class="help-text">No hay imágenes ni vídeos subidos.</p>';
            return;
        }

        media.forEach(item => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `<button class="delete-btn" data-photo-id="${item.id}">×</button>`;

            if (item.media_type === 'video') {
                div.classList.add('is-video');
                const indicator = document.createElement('span');
                indicator.className = 'video-indicator';
                indicator.textContent = '▶';
                div.appendChild(indicator);
                
                // Generar y mostrar la miniatura del vídeo
                generateVideoThumbnail(`${API_BASE_URL}/${item.url}`)
                    .then(thumbnailUrl => {
                        const img = document.createElement('img');
                        img.src = thumbnailUrl;
                        img.alt = 'Miniatura de vídeo';
                        div.insertBefore(img, indicator);
                    })
                    .catch(console.error);

            } else {
                const img = document.createElement('img');
                img.src = `${API_BASE_URL}/${item.url}`;
                img.alt = 'Miniatura';
                img.loading = 'lazy';
                div.insertBefore(img, div.firstChild);
            }
            photoListContainer.appendChild(div);
        });
    };

    const fetchPhotos = () => {
        photoListContainer.innerHTML = '<p class="help-text">Cargando imágenes...</p>';
        fetch(`${API_BASE_URL}/photos`, { headers: { 'X-Api-Token': API_TOKEN } })
            .then(response => response.ok ? response.json() : Promise.reject('No se pudo obtener la lista de fotos.'))
            .then(renderPhotos)
            .catch(error => {
                photoListContainer.innerHTML = `<p class="help-text" style="color: var(--color-error);">${error}</p>`;
            });
    };

    const deletePhoto = (photoId) => {
        fetch(`${API_BASE_URL}/photos/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
            body: JSON.stringify({ photo_id: photoId })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Error desconocido');
            showFeedback('¡Elemento eliminado con éxito!');
            fetchPhotos();
        })
        .catch(error => showFeedback(error.message, true));
    };

    // --- Cargar configuración inicial ---
    const fetchConfig = () => {
        fetch(`${API_BASE_URL}/config`, { headers: { 'X-Api-Token': API_TOKEN } })
            .then(response => response.json())
            .then(data => { 
                if (data.tiempo_transicion_seg) tiempoInput.value = data.tiempo_transicion_seg;
                if (data.font_size_px) fontSizeInput.value = data.font_size_px;
                if (data.weather_city) weatherCityInput.value = data.weather_city;
                if (data.weather_api_key) weatherApiKeyInput.value = data.weather_api_key;
                if (data.weather_font_size_px) weatherFontSizeInput.value = data.weather_font_size_px;
            })
            .catch(error => console.error('Error al cargar la configuración:', error));
    };

    // --- Event Listeners ---
    btnGuardarConfig.addEventListener('click', () => {
        const payload = {
            tiempo_transicion_seg: parseInt(tiempoInput.value, 10),
            font_size_px: parseInt(fontSizeInput.value, 10),
            weather_city: weatherCityInput.value.trim(),
            weather_api_key: weatherApiKeyInput.value.trim(),
            weather_font_size_px: parseInt(weatherFontSizeInput.value, 10)
        };

        if (payload.tiempo_transicion_seg < 1) return showFeedback('El tiempo debe ser de al menos 1 segundo.', true);
        if (payload.font_size_px < 8 || payload.font_size_px > 100) return showFeedback('El tamaño de la fuente del reloj debe estar entre 8 y 100.', true);
        if (payload.weather_font_size_px < 8 || payload.weather_font_size_px > 100) return showFeedback('El tamaño de la fuente del clima debe estar entre 8 y 100.', true);

        // Validar que si se pone una ciudad, también se ponga la API key
        if (payload.weather_city && !payload.weather_api_key) {
            return showFeedback('Si especificas una ciudad, también debes proporcionar una API Key.', true);
        }
        
        fetch(`${API_BASE_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Error desconocido');
            showFeedback('¡Configuración guardada con éxito!');
        })
        .catch(error => showFeedback(`Error al guardar: ${error.message}`, true));
    });

    btnSubirFoto.addEventListener('click', () => fileInput.click());

    btnGoogleFotosConnect.addEventListener('click', () => {
        window.location.href = API_BASE_URL + '/admin.php';
    });

    fileInput.addEventListener('change', () => {
        uploadFiles(fileInput.files);
    });

    // --- Lógica de Arrastrar y Soltar ---
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));

        if (videoFiles.length > 0) {
            showFeedback('Para subir videos, por favor usa la sección "Subir Video".', true);
        }
        
        if (imageFiles.length > 0) {
            uploadFiles(imageFiles);
        } else if (videoFiles.length === 0) {
            // Solo muestra este mensaje si no se soltaron ni imágenes ni videos válidos
            showFeedback('No se encontraron imágenes válidas en los archivos que soltaste.', true);
        }
    });

    btnRefreshGallery.addEventListener('click', fetchPhotos);

    const btnImportServer = document.getElementById('btn_import_server');
    btnImportServer.addEventListener('click', () => {
        const originalButtonText = btnImportServer.textContent;
        btnImportServer.textContent = 'Importando...';
        btnImportServer.disabled = true;

        showFeedback('Iniciando proceso de importación en el servidor...', false);

        fetch(`${API_BASE_URL}/scan.php`, {
            method: 'POST', // Usamos POST para que se ejecute la lógica
            headers: { 'X-Api-Token': API_TOKEN }
        })
        .then(response => {
            // Si la respuesta no es OK (ej. un error 500), la procesamos como un error.
            if (!response.ok) {
                return response.json().then(errorData => {
                    // Rechazamos la promesa para que caiga en el .catch, pasando los datos del error.
                    return Promise.reject(errorData);
                });
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                // Esto manejaría errores lógicos donde la respuesta es 200 OK pero success=false
                throw new Error(data.error || 'Ocurrió un error desconocido durante la importación.');
            }
            
            let message = data.message;
            if (data.imported_count > 0) {
                message = `¡Se importaron ${data.imported_count} nuevos archivos!`;
                fetchPhotos(); // Refrescar la galería para ver los nuevos archivos
            } else {
                message = 'No se encontraron nuevos archivos para importar.';
            }

            if(data.errors && data.errors.length > 0){
                console.error("Errores durante la importación:", data.errors);
                message += ` Se encontraron ${data.errors.length} errores. Revisa la consola para más detalles.`;
                showFeedback(message, true);
            } else {
                showFeedback(message, false);
            }
        })
        .catch(errorData => {
            // errorData ahora es el objeto JSON que enviamos desde el backend
            console.error("Error detallado del servidor:", errorData);
            const errorMessage = errorData.error || 'Error crítico. Revisa la consola.';
            showFeedback(errorMessage, true);
        })
        .finally(() => {
            btnImportServer.textContent = originalButtonText;
            btnImportServer.disabled = false;
        });
    });

    const btnDeleteAllPhotos = document.getElementById('btn_delete_all_photos');

    btnDeleteAllPhotos.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar TODAS las fotos y vídeos subidos permanentemente? Esta acción no se puede deshacer.')) {
            fetch(`${API_BASE_URL}/photos/delete_all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'Error desconocido al eliminar todas las fotos.');
                showFeedback('¡Todas las fotos y vídeos han sido eliminados con éxito!');
                fetchPhotos(); // Refrescar la galería
            })
            .catch(error => showFeedback(`Error al eliminar todas las fotos: ${error.message}`, true));
        }
    });

    photoListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const photoId = event.target.dataset.photoId;
            if (confirm('¿Estás seguro de que quieres eliminar este elemento permanentemente?')) {
                deletePhoto(photoId);
            }
        }
    });

    // --- Carga Inicial de Datos ---
    fetchConfig();
    fetchPhotos();

    // --- Event Listener para el formulario de Video ---
    videoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const file = videoFileInput.files[0];
        uploadVideo(file);
    });
});
