document.addEventListener('DOMContentLoaded', () => {

    // --- Configuración Esencial ---
    const API_TOKEN = 'TOKEN_SEGURO_12345';
    const API_BASE_URL = '../backend-php';

    // --- Elementos del DOM ---
    const tiempoInput = document.getElementById('tiempo_transicion');
    const btnGuardarConfig = document.getElementById('btn_guardar_config');
    const btnSubirFoto = document.getElementById('btn_subir_foto');
    const fileInput = document.getElementById('file_input');
    const feedbackMessage = document.getElementById('feedback-message');
    const photoListContainer = document.getElementById('photo-list-container');
    const btnRefreshGallery = document.getElementById('btn_refresh_gallery');
    const btnGoogleFotosConnect = document.getElementById('btn_google_fotos_connect');

    // --- Función para mostrar mensajes de feedback ---
    const showFeedback = (message, isError = false) => {
        feedbackMessage.textContent = message;
        feedbackMessage.className = 'feedback show ' + (isError ? 'error' : 'success');
        setTimeout(() => { feedbackMessage.classList.remove('show'); }, 3000);
    };

    // --- Lógica de la Galería ---

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
            .then(data => { if (data.tiempo_transicion_seg) tiempoInput.value = data.tiempo_transicion_seg; })
            .catch(error => console.error('Error al cargar la configuración:', error));
    };

    // --- Event Listeners ---
    btnGuardarConfig.addEventListener('click', () => {
        const tiempo = parseInt(tiempoInput.value, 10);
        if (tiempo < 1) return showFeedback('El tiempo debe ser de al menos 1 segundo.', true);
        
        fetch(`${API_BASE_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
            body: JSON.stringify({ tiempo_transicion_seg: tiempo })
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

    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files);
        if (files.length === 0) return;

        const originalButtonText = btnSubirFoto.textContent;
        btnSubirFoto.disabled = true;

        const BATCH_SIZE = 10; // Subir en lotes de 10
        let totalUploaded = 0;

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            const batchNumber = (i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(files.length / BATCH_SIZE);

            btnSubirFoto.textContent = `Subiendo lote ${batchNumber} de ${totalBatches}...`;
            
            const formData = new FormData();
            batch.forEach(file => formData.append('photos[]', file));

            try {
                const response = await fetch(`${API_BASE_URL}/photos`, {
                    method: 'POST',
                    headers: { 'X-Api-Token': API_TOKEN },
                    body: formData
                });
                
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || `Error en el lote ${batchNumber}`);
                }
                
                totalUploaded += data.uploaded_count || batch.length;
                showFeedback(`Lote ${batchNumber} subido. Total: ${totalUploaded} / ${files.length}`);

            } catch (error) {
                showFeedback(`Error al subir el lote ${batchNumber}: ${error.message}`, true);
                // Detener la subida si un lote falla
                break; 
            }
        }

        showFeedback(`¡Proceso de subida completado! Total subidos: ${totalUploaded}`, false);
        fetchPhotos(); // Refrescar la galería al final

        btnSubirFoto.textContent = originalButtonText;
        btnSubirFoto.disabled = false;
        fileInput.value = '';
    });

    btnRefreshGallery.addEventListener('click', fetchPhotos);

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
});
