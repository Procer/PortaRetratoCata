<?php
header('Content-Type: application/json');

// --- Configuración y Seguridad ---
define('API_TOKEN', 'TOKEN_SEGURO_12345');
define('UPLOAD_DIR', __DIR__ . '/public/contents/frame_1/');

// 1. Verificación del Token de API
$headers = getallheaders();
$api_token = isset($headers['X-Api-Token']) ? $headers['X-Api-Token'] : '';

if (empty($api_token) || !hash_equals(API_TOKEN, $api_token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Acceso no autorizado.']);
    exit;
}

// 2. Verificación del método y archivo
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido.']);
    exit;
}

if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $error_message = 'No se recibió el archivo o hubo un error en la subida.';
    if (isset($_FILES['video']['error'])) {
        switch ($_FILES['video']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $error_message = 'El archivo es demasiado grande.';
                break;
            case UPLOAD_ERR_PARTIAL:
                $error_message = 'El archivo se subió solo parcialmente.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $error_message = 'No se seleccionó ningún archivo.';
                break;
        }
    }
    echo json_encode(['success' => false, 'error' => $error_message]);
    exit;
}

$file = $_FILES['video'];

// 3. Validación del tipo de archivo (MIME type)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime_type = $finfo->file($file['tmp_name']);

if (strpos($mime_type, 'video/') !== 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El archivo subido no es un video válido.']);
    exit;
}

// 4. Crear el directorio de subida si no existe
if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0755, true)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo crear el directorio de destino.']);
    exit;
}

// 5. Generar nombre de archivo único
$original_name = pathinfo($file['name'], PATHINFO_FILENAME);
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$safe_original_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $original_name);
$timestamp = time();
$unique_name = $timestamp . '_' . $safe_original_name . '.' . $extension;
$destination = UPLOAD_DIR . $unique_name;

// 6. Mover el archivo
if (move_uploaded_file($file['tmp_name'], $destination)) {
    // Éxito
    echo json_encode([
        'success' => true,
        'message' => 'Video subido con éxito.',
        'file_path' => 'contents/frame_1/' . $unique_name // Ruta relativa para el cliente
    ]);
} else {
    // Error al mover
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo de video.']);
}
