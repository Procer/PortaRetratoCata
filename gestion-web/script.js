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

    // --- Estado de la Aplicación ---
    let currentConfig = {}; // Variable para mantener la configuración actual

    // --- Configuración Esencial ---
    const API_TOKEN = 'TOKEN_SEGURO_12345';
    const API_BASE_URL = '../backend-php';

    // --- Elementos del DOM ---
    const tiempoInput = document.getElementById('tiempo_transicion');
    const fontSizeInput = document.getElementById('font_size');
    const weatherCityInput = document.getElementById('weather_city');
    const weatherApiKeyInput = document.getElementById('weather_api_key');
    const weatherFontSizeInput = document.getElementById('weather_font_size');
    const morningStartInput = document.getElementById('forecast_morning_start');
    const morningEndInput = document.getElementById('forecast_morning_end');
    const eveningStartInput = document.getElementById('forecast_evening_start');
    const eveningEndInput = document.getElementById('forecast_evening_end');
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

    // --- Elementos del DOM para Álbumes ---
    const newAlbumNameInput = document.getElementById('new_album_name');
    const btnCreateAlbum = document.getElementById('btn_create_album');
    const albumsListContainer = document.getElementById('albums-list-container');
    const photoAlbumSelect = document.getElementById('photo-album-select');
    const videoAlbumSelect = document.getElementById('video-album-select');
    const albumListContainer = document.getElementById('album-list-container');
    const galleryViewTitle = document.getElementById('gallery-view-title');
    const btnBackToAlbums = document.getElementById('btn-back-to-albums');
    const importAlbumSelect = document.getElementById('import-album-select');


    // --- Función para mostrar mensajes de feedback ---
    const showFeedback = (message, isError = false) => {
        feedbackMessage.textContent = message;
        feedbackMessage.className = 'feedback show ' + (isError ? 'error' : 'success');
        setTimeout(() => { feedbackMessage.classList.remove('show'); }, 3000);
    };

    // --- Funciones de Galería ---
    let selectedAlbumId = null;

    const switchToAlbumView = () => {
        galleryViewTitle.textContent = 'Álbumes';
        albumListContainer.style.display = 'grid';
        photoListContainer.style.display = 'none';
        btnBackToAlbums.style.display = 'none';
        
        // Mostrar controles de importación solo en la vista de álbumes
        const importControls = document.querySelector('.import-controls');
        if (importControls) importControls.style.display = 'flex';

        selectedAlbumId = null;
        // Limpiar fotos para que no se muestren al volver a entrar a un álbum
        photoListContainer.innerHTML = '<p class="help-text">Cargando...</p>';
    };

    const switchToPhotoView = (albumId, albumName) => {
        galleryViewTitle.textContent = `Álbum: ${albumName}`;
        albumListContainer.style.display = 'none';
        photoListContainer.style.display = 'grid';
        btnBackToAlbums.style.display = 'inline-block';
        
        // Ocultar controles de importación en la vista de fotos
        const importControls = document.querySelector('.import-controls');
        if (importControls) importControls.style.display = 'none';

        selectedAlbumId = albumId;
        fetchPhotos(albumId);
    };
    
    const renderGalleryAlbums = () => {
        albumListContainer.innerHTML = '';
        if (currentAlbums.length === 0) {
            albumListContainer.innerHTML = '<p class="help-text">No hay álbumes creados. ¡Crea uno en la pestaña "Álbumes"!</p>';
            return;
        }

        currentAlbums.forEach(album => {
            const albumItem = document.createElement('div');
            albumItem.className = 'photo-item album-gallery-item'; // Re-use photo-item for grid layout
            albumItem.dataset.albumId = album.id;
            albumItem.dataset.albumName = album.name;
            
            albumItem.innerHTML = `
                <div class="album-gallery-icon">📂</div>
                <div class="album-gallery-name">${album.name}</div>
            `;
            albumListContainer.appendChild(albumItem);
        });
    };

    // --- Funciones de Gestión de Álbumes ---
    let currentAlbums = []; // Almacena la lista actual de álbumes

    const fetchAlbums = async () => {
        albumsListContainer.innerHTML = '<p class="help-text">Cargando álbumes...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/albums`, { headers: { 'X-Api-Token': API_TOKEN } });
            if (!response.ok) throw new Error('No se pudo obtener la lista de álbumes.');
            currentAlbums = await response.json();
            renderAlbums();
            populateAlbumSelects();
            populateImportAlbumSelect(); // <-- Nueva llamada
        } catch (error) {
            console.error('Error al obtener álbumes:', error);
            albumsListContainer.innerHTML = `<p class="help-text error">Error al cargar álbumes: ${error.message}</p>`;
        }
    };

    const renderAlbums = () => {
        albumsListContainer.innerHTML = '';
        if (currentAlbums.length === 0) {
            albumsListContainer.innerHTML = '<p class="help-text">No hay álbumes creados. ¡Crea uno nuevo!</p>';
            return;
        }

        currentAlbums.forEach(album => {
            const albumItem = document.createElement('div');
            albumItem.className = `album-item ${album.is_active ? 'active-album' : ''}`;
            albumItem.dataset.albumId = album.id;
            
            albumItem.innerHTML = `
                <div class="album-info">
                    <span class="album-name-display">${album.name} ${album.is_active ? ' (Activo)' : ''}</span>
                    <input type="text" class="album-name-edit" value="${album.name}" style="display: none;">
                </div>
                <div class="album-actions">
                    <button class="btn-secondary btn-edit-album" title="Renombrar">✏️</button>
                    <button class="btn-secondary btn-save-album" title="Guardar" style="display: none;">💾</button>
                    <button class="btn-secondary btn-cancel-edit" title="Cancelar" style="display: none;">❌</button>
                    <button class="btn-primary btn-activate-album" ${album.is_active ? 'disabled' : ''} title="Activar este álbum">✅</button>
                    <button class="btn-danger btn-delete-album" title="Eliminar álbum y su contenido">🗑️</button>
                </div>
            `;
            albumsListContainer.appendChild(albumItem);
        });
    };

    const populateAlbumSelects = () => {
        if (!photoAlbumSelect || !videoAlbumSelect) return;

        photoAlbumSelect.innerHTML = '<option value="">-- Seleccionar Álbum --</option>';
        videoAlbumSelect.innerHTML = '<option value="">-- Seleccionar Álbum --</option>';

        const activeAlbum = currentAlbums.find(album => album.is_active);

        currentAlbums.forEach(album => {
            const optionPhoto = document.createElement('option');
            optionPhoto.value = album.id;
            optionPhoto.textContent = album.name + (album.is_active ? ' (Activo)' : '');
            if (activeAlbum && album.id === activeAlbum.id) {
                optionPhoto.selected = true;
            }
            photoAlbumSelect.appendChild(optionPhoto);

            const optionVideo = document.createElement('option');
            optionVideo.value = album.id;
            optionVideo.textContent = album.name + (album.is_active ? ' (Activo)' : '');
             if (activeAlbum && album.id === activeAlbum.id) {
                optionVideo.selected = true;
            }
            videoAlbumSelect.appendChild(optionVideo);
        });
    };

    const populateImportAlbumSelect = () => {
        if (!importAlbumSelect) return;

        importAlbumSelect.innerHTML = '<option value="">-- Elegir Álbum --</option>';

        currentAlbums.forEach(album => {
            const option = document.createElement('option');
            option.value = album.id;
            option.textContent = album.name;
            importAlbumSelect.appendChild(option);
        });
    };

    const createAlbum = async () => {
        const name = newAlbumNameInput.value.trim();
        if (!name) {
            showFeedback('El nombre del álbum no puede estar vacío.', true);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/albums`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error desconocido al crear el álbum.');
            
            showFeedback('¡Álbum creado con éxito!');
            newAlbumNameInput.value = '';
            fetchAlbums(); // Refrescar la lista de álbumes
        } catch (error) {
            showFeedback(`Error al crear álbum: ${error.message}`, true);
        }
    };

    const activateAlbum = async (albumId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/albums/${albumId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
                body: JSON.stringify({ is_active: true })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error desconocido al activar el álbum.');
            showFeedback('¡Álbum activado con éxito!');
            fetchAlbums(); // Refrescar la lista de álbumes y la galería
            if (selectedAlbumId) {
                fetchPhotos(selectedAlbumId);
            }
        } catch (error) {
            showFeedback(`Error al activar álbum: ${error.message}`, true);
        }
    };

    const renameAlbum = async (albumId, newName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/albums/${albumId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
                body: JSON.stringify({ name: newName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error desconocido al renombrar el álbum.');
            showFeedback('¡Álbum renombrado con éxito!');
            fetchAlbums(); // Refrescar la lista de álbumes
        } catch (error) {
            showFeedback(`Error al renombrar álbum: ${error.message}`, true);
        }
    };

    const deleteAlbum = async (albumId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este álbum y TODO su contenido (fotos y vídeos) PERMANENTEMENTE? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/albums/${albumId}`, {
                method: 'DELETE',
                headers: { 'X-Api-Token': API_TOKEN }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error desconocido al eliminar el álbum.');
            showFeedback('¡Álbum y su contenido eliminados con éxito!');
            fetchAlbums(); // Refrescar la lista de álbumes
            switchToAlbumView(); // Volver a la vista de álbumes
        } catch (error) {
            showFeedback(`Error al eliminar álbum: ${error.message}`, true);
        }
    };

    // --- Lógica de subida de VIDEO ---
    // Deprecated: upload_video.php is no longer used. All uploads go through /photos.
    const uploadVideo = (file) => {
        if (!file) {
            showFeedback('Por favor, selecciona un archivo de video.', true);
            return;
        }

        const albumId = videoAlbumSelect.value;
        if (!albumId) {
            showFeedback('Por favor, selecciona un álbum para el video.', true);
            return;
        }

        const formData = new FormData();
        formData.append('video', file);
        formData.append('album_id', albumId); // Añadir el ID del álbum

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
                        if (selectedAlbumId) fetchPhotos(selectedAlbumId);
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

        xhr.open('POST', `${API_BASE_URL}/photos`, true); // Usar el endpoint unificado /photos
        xhr.setRequestHeader('X-Api-Token', API_TOKEN);
        xhr.send(formData);
    };

    // --- Lógica de subida de FOTOS (múltiple) ---
    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        const albumId = photoAlbumSelect.value;
        if (!albumId) {
            showFeedback('Por favor, selecciona un álbum para las fotos.', true);
            btnSubirFoto.disabled = false; // Asegurarse de que el botón no se quede deshabilitado
            return;
        }

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
            batch.forEach(file => formData.append('photos[]', file));
            formData.append('album_id', albumId); // Añadir el ID del álbum

            try {
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
        if (selectedAlbumId) fetchPhotos(selectedAlbumId); // Refrescar

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
            photoListContainer.innerHTML = '<p class="help-text">No hay imágenes ni vídeos en este álbum.</p>';
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
                generateVideoThumbnail(item.url)
                    .then(thumbnailUrl => {
                        const img = document.createElement('img');
                        img.src = thumbnailUrl;
                        img.alt = 'Miniatura de vídeo';
                        div.insertBefore(img, indicator);
                    })
                    .catch(console.error);

            } else {
                const img = document.createElement('img');
                img.src = item.url;
                img.alt = 'Miniatura';
                img.loading = 'lazy';
                div.insertBefore(img, div.firstChild);
            }
            photoListContainer.appendChild(div);
        });
    };

    const fetchPhotos = (albumId = null) => { // albumId ahora es un parámetro opcional
        if (!albumId) {
            // Si no hay albumId, no hacemos nada en la galería.
            photoListContainer.innerHTML = '<p class="help-text">Selecciona un álbum para ver su contenido.</p>';
            return;
        }
        photoListContainer.innerHTML = '<p class="help-text">Cargando imágenes...</p>';
        let url = `${API_BASE_URL}/photos`;
        if (albumId) {
            url += `?album_id=${albumId}`; // Si se proporciona albumId, lo añadimos como query param
        }
        fetch(url, { headers: { 'X-Api-Token': API_TOKEN } })
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
            if (selectedAlbumId) {
                fetchPhotos(selectedAlbumId); // Refrescar solo el álbum actual
            }
        })
        .catch(error => showFeedback(error.message, true));
    };

    // --- Cargar configuración inicial ---
    const fetchConfig = () => {
        fetch(`${API_BASE_URL}/config`, { 
            headers: { 
                'X-Api-Token': API_TOKEN,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            } 
        })
            .then(response => response.json())
            .then(data => { 
                currentConfig = data; // <-- Guardar la configuración en la variable de estado
                if (data.tiempo_transicion_seg) tiempoInput.value = data.tiempo_transicion_seg;
                if (data.font_size_px) fontSizeInput.value = data.font_size_px;
                if (data.weather_city) weatherCityInput.value = data.weather_city;
                if (data.weather_api_key) weatherApiKeyInput.value = data.weather_api_key;
                if (data.weather_font_size_px) weatherFontSizeInput.value = data.weather_font_size_px;
                // Cargar valores de los nuevos campos de tiempo. Si son null, se asigna un string vacío.
                if (morningStartInput) morningStartInput.value = data.forecast_morning_start || '';
                if (morningEndInput) morningEndInput.value = data.forecast_morning_end || '';
                if (eveningStartInput) eveningStartInput.value = data.forecast_evening_start || '';
                if (eveningEndInput) eveningEndInput.value = data.forecast_evening_end || '';
            })
            .catch(error => console.error('Error al cargar la configuración:', error));
    };

    // --- Event Listeners ---
    btnGuardarConfig.addEventListener('click', () => {
        // Crear un objeto solo con los valores actuales del formulario
        const updatedValues = {
            tiempo_transicion_seg: parseInt(tiempoInput.value, 10),
            font_size_px: parseInt(fontSizeInput.value, 10),
            weather_city: weatherCityInput.value.trim(),
            weather_api_key: weatherApiKeyInput.value.trim(),
            weather_font_size_px: parseInt(weatherFontSizeInput.value, 10),
            forecast_morning_start: morningStartInput.value,
            forecast_morning_end: morningEndInput.value,
            forecast_evening_start: eveningStartInput.value,
            forecast_evening_end: eveningEndInput.value
        };

        // Fusionar la configuración actual con los nuevos valores
        const payload = { ...currentConfig, ...updatedValues };

        // Validaciones
        if (payload.tiempo_transicion_seg < 1) return showFeedback('El tiempo debe ser de al menos 1 segundo.', true);
        if (payload.font_size_px < 8 || payload.font_size_px > 100) return showFeedback('El tamaño de la fuente del reloj debe estar entre 8 y 100.', true);
        if (payload.weather_font_size_px < 8 || payload.weather_font_size_px > 100) return showFeedback('El tamaño de la fuente del clima debe estar entre 8 y 100.', true);
        if (payload.weather_city && !payload.weather_api_key) {
            return showFeedback('Si especificas una ciudad, también debes proporcionar una API Key.', true);
        }
        
        fetch(`${API_BASE_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
            body: JSON.stringify(payload) // Enviar el payload completo
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Error desconocido');
            showFeedback('¡Configuración guardada con éxito!');
            currentConfig = payload; // Actualizar el estado local con lo que se guardó
        })
        .catch(error => showFeedback(`Error al guardar: ${error.message}`, true));
    });

    // Event listener para el botón de subir foto (ahora solo para imágenes)
    btnSubirFoto.addEventListener('click', () => fileInput.click());

    // Event listener para el formulario de Video (unificado con /photos)
    if (videoForm) {
        videoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const file = videoFileInput.files[0];
            uploadVideo(file);
        });
    }

    if (btnGoogleFotosConnect) {
        btnGoogleFotosConnect.addEventListener('click', () => {
            window.location.href = API_BASE_URL + '/admin.php';
        });
    }

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

    btnRefreshGallery.addEventListener('click', () => {
        if (selectedAlbumId) {
            fetchPhotos(selectedAlbumId);
        } else {
            fetchAlbums().then(renderGalleryAlbums);
        }
    });

    btnBackToAlbums.addEventListener('click', switchToAlbumView);

    albumListContainer.addEventListener('click', (event) => {
        const albumItem = event.target.closest('.album-gallery-item');
        if (albumItem) {
            const albumId = albumItem.dataset.albumId;
            const albumName = albumItem.dataset.albumName;
            switchToPhotoView(albumId, albumName);
        }
    });

    const btnImportServer = document.getElementById('btn_import_server');
    btnImportServer.addEventListener('click', () => {
        const albumId = importAlbumSelect.value;
        if (!albumId) {
            showFeedback('Por favor, selecciona un álbum para la importación.', true);
            return;
        }

        const originalButtonText = btnImportServer.textContent;
        btnImportServer.textContent = 'Importando...';
        btnImportServer.disabled = true;
        importAlbumSelect.disabled = true;

        showFeedback('Iniciando proceso de importación en el servidor...', false);

        fetch(`${API_BASE_URL}/scan.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
            body: JSON.stringify({ album_id: albumId })
        })
        .then(response => {
            // Siempre leemos la respuesta como texto primero para poder depurar errores de PHP
            return response.text().then(text => {
                try {
                    // Intentamos parsear la respuesta como JSON
                    const data = JSON.parse(text);
                    // Si el servidor devolvió un código de error (ej. 4xx, 5xx) pero con un cuerpo JSON, lo tratamos como error
                    if (!response.ok) {
                        return Promise.reject(data);
                    }
                    // Si todo está bien, devolvemos los datos JSON
                    return data;
                } catch (e) {
                    // Si el parseo JSON falla, significa que la respuesta es HTML (un error de PHP)
                    // Rechazamos la promesa con un objeto de error que contiene el HTML para depuración
                    return Promise.reject({ 
                        error: 'El servidor devolvió una respuesta inesperada.', 
                        details: text 
                    });
                }
            });
        })
        .then(data => {
            // Este bloque solo se ejecuta si la respuesta fue un JSON válido y la petición fue exitosa
            if (!data.success) {
                // Maneja errores lógicos del backend, ej: { success: false, error: "Mensaje" }
                return Promise.reject(data);
            }
            
            let message = data.message;
            if (data.imported_count > 0) {
                message = `¡Se importaron ${data.imported_count} nuevos archivos!`;
                fetchAlbums().then(renderGalleryAlbums);
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
        .catch(errorInfo => {
            // Este bloque captura cualquier rechazo de la cadena de promesas
            console.error("Error detallado del servidor:", errorInfo);
            
            let errorMessage = 'Error crítico. Revisa la consola.';
            if (errorInfo && errorInfo.error) {
                errorMessage = errorInfo.error;
            }
            
            if (errorInfo && errorInfo.details) {
                // Muestra el error de PHP en la consola para una depuración más fácil
                console.error("Detalles de la respuesta del servidor (posible error de PHP):", errorInfo.details);
            }

            showFeedback(errorMessage, true);
        })
        .finally(() => {
            btnImportServer.textContent = originalButtonText;
            btnImportServer.disabled = false;
            importAlbumSelect.disabled = false;
        });
    });

    photoListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const photoId = event.target.dataset.photoId;
            if (confirm('¿Estás seguro de que quieres eliminar este elemento permanentemente?')) {
                deletePhoto(photoId);
            }
        }
    });

    // --- Event Listeners para Álbumes ---
    btnCreateAlbum.addEventListener('click', createAlbum);

    albumsListContainer.addEventListener('click', (event) => {
        const target = event.target;
        const albumItem = target.closest('.album-item');
        if (!albumItem) return;

        const albumId = albumItem.dataset.albumId;

        if (target.classList.contains('btn-activate-album')) {
            activateAlbum(albumId);
        } else if (target.classList.contains('btn-delete-album')) {
            deleteAlbum(albumId);
        } else if (target.classList.contains('btn-edit-album')) {
            albumItem.querySelector('.album-name-display').style.display = 'none';
            albumItem.querySelector('.btn-edit-album').style.display = 'none';
            albumItem.querySelector('.btn-activate-album').style.display = 'none';
            albumItem.querySelector('.btn-delete-album').style.display = 'none';

            const editInput = albumItem.querySelector('.album-name-edit');
            editInput.style.display = 'inline-block';
            editInput.focus();
            albumItem.querySelector('.btn-save-album').style.display = 'inline-block';
            albumItem.querySelector('.btn-cancel-edit').style.display = 'inline-block';
        } else if (target.classList.contains('btn-save-album')) {
            const newName = albumItem.querySelector('.album-name-edit').value.trim();
            if (newName && newName !== albumItem.querySelector('.album-name-display').textContent.split(' ')[0]) { // Comparar solo con el nombre, no con "(Activo)"
                renameAlbum(albumId, newName);
            }
            // Restaurar visualización
            albumItem.querySelector('.album-name-display').style.display = 'inline-block';
            albumItem.querySelector('.album-name-edit').style.display = 'none';
            albumItem.querySelector('.btn-save-album').style.display = 'none';
            albumItem.querySelector('.btn-cancel-edit').style.display = 'none';
            albumItem.querySelector('.btn-edit-album').style.display = 'inline-block';
            albumItem.querySelector('.btn-activate-album').style.display = 'inline-block';
            albumItem.querySelector('.btn-delete-album').style.display = 'inline-block';
        } else if (target.classList.contains('btn-cancel-edit')) {
            // Restaurar visualización
            albumItem.querySelector('.album-name-display').style.display = 'inline-block';
            albumItem.querySelector('.album-name-edit').style.display = 'none';
            albumItem.querySelector('.btn-save-album').style.display = 'none';
            albumItem.querySelector('.btn-cancel-edit').style.display = 'none';
            albumItem.querySelector('.btn-edit-album').style.display = 'inline-block';
            albumItem.querySelector('.btn-activate-album').style.display = 'inline-block';
            albumItem.querySelector('.btn-delete-album').style.display = 'inline-block';
        }
    });

    // --- Lógica de Pestañas (Modificada para Álbumes) ---
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

        // Lógica específica al cambiar de pestaña
        if (tabId === 'albums') {
            fetchAlbums();
        } else if (tabId === 'galeria') {
            switchToAlbumView();
            fetchAlbums().then(renderGalleryAlbums);
        }
    });

    // --- Carga Inicial de Datos ---
    fetchConfig();
    fetchAlbums(); // Cargar los álbumes al inicio, para poblar los selects
});