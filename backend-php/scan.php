<?php
// --- Script para Escanear e Importar Archivos Manualmente ---

require_once 'db.php';

// --- Seguridad y Configuración ---
header('Content-Type: application/json');

// Verificar el token del marco para asegurar que la petición es legítima.
// El marco_id se usa para asociar correctamente los archivos.
try {
    $marco_id = verificar_token($conn);
} catch (Exception $e) {
    // Si la función verificar_token lanza una excepción, la capturamos.
    // La función ya se encarga de enviar una respuesta JSON y terminar el script.
    // No necesitamos hacer nada más aquí.
    exit;
}


// --- DEBUGGING BLOCK ---
$import_dir = __DIR__ . '/importar/';
$debug_info = [
    'resolved_import_dir' => realpath($import_dir),
    'import_dir_exists' => is_dir($import_dir),
    'import_dir_is_readable' => is_readable($import_dir),
    'open_basedir' => ini_get('open_basedir'),
    'scandir_result' => @scandir($import_dir)
];

// Si el directorio no es legible, termina el script y muestra la información de depuración.
if (!$debug_info['import_dir_is_readable']) {
    json_response([
        'success' => false,
        'error' => 'El script no tiene permisos para leer el directorio de importación.',
        'debug_info' => $debug_info
    ], 500);
    exit;
}
// --- END DEBUGGING BLOCK ---


// --- Lógica Principal de Importación ---

$target_dir = __DIR__ . '/public/contents/frame_' . $marco_id . '/';


$imported_files = [];
$errors = [];

// Crear directorios si no existen
if (!is_dir($import_dir)) {
    mkdir($import_dir, 0777, true);
}
if (!is_dir($target_dir)) {
    mkdir($target_dir, 0777, true);
}

// Escanear el directorio de importación
$files_to_scan = scandir($import_dir);

if ($files_to_scan === false) {
    json_response(['error' => 'No se pudo leer el directorio de importación.'], 500);
    exit;
}

foreach ($files_to_scan as $file) {
    // Ignorar '.' y '..'
    if ($file === '.' || $file === '..') {
        continue;
    }

    $original_path = $import_dir . $file;

    // --- Determinar el tipo de archivo ---
    $mime_type = mime_content_type($original_path);
    if ($mime_type === false) {
        $errors[] = "No se pudo determinar el tipo de archivo para '{$file}'.";
        continue;
    }

    $is_image = strpos($mime_type, 'image/') === 0;
    $is_video = strpos($mime_type, 'video/') === 0;

    if (!$is_image && !$is_video) {
        $errors[] = "El archivo '{$file}' no es una imagen ni un vídeo y será ignorado.";
        continue;
    }
    
    $media_type = $is_video ? 'video' : 'image';

    // --- Mover y Registrar el Archivo ---
    $new_filename = uniqid() . '-' . basename($file);
    $target_path_on_disk = $target_dir . $new_filename;
    
    // La URL que se guarda en la DB debe ser relativa a la raíz del backend para ser accesible.
    $public_url = 'public/contents/frame_' . $marco_id . '/' . $new_filename;

    if (rename($original_path, $target_path_on_disk)) {
        // El archivo se movió con éxito, ahora lo insertamos en la base de datos.
        $stmt = $conn->prepare("INSERT INTO fotos (marco_id, url, media_type) VALUES (?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("iss", $marco_id, $public_url, $media_type);
            if ($stmt->execute()) {
                $imported_files[] = $file;
            } else {
                $errors[] = "Error al guardar '{$file}' en la base de datos.";
                // Si falla la DB, intentamos devolver el archivo a su lugar original
                rename($target_path_on_disk, $original_path);
            }
            $stmt->close();
        } else {
            $errors[] = "Error al preparar la consulta a la base de datos.";
            rename($target_path_on_disk, $original_path);
        }
    } else {
        $errors[] = "No se pudo mover el archivo '{$file}'. Verifique los permisos.";
    }
}

$conn->close();

// --- Respuesta Final ---
if (count($imported_files) === 0 && count($files_to_scan) <= 2) { // <= 2 para contar '.' y '..'
     json_response(['message' => 'No se encontraron nuevos archivos para importar en la carpeta \'importar\'.', 'success' => true, 'imported_count' => 0]);
} else {
     json_response([
        'success' => true,
        'message' => 'Proceso de importación completado.',
        'imported_count' => count($imported_files),
        'imported_files' => $imported_files,
        'errors' => $errors
    ]);
}
?>
