<?php
// --- Controlador Principal de la API ---

require_once 'db.php';

// --- CORS y Headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Manejar solicitud OPTIONS (pre-flight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Routing Básico ---
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// --- Lógica de Ruteo Dinámica ---
// Determina la ruta base de forma dinámica para que funcione en cualquier entorno.
$script_name = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
$base_path = ($script_name == '/') ? '' : $script_name;

$route = substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen($base_path));
// --- Fin de Lógica de Ruteo Dinámica ---

$marco_id = verificar_token($conn); // Autenticación para todas las rutas

// Normalizar la ruta para el switch (quita query strings y la barra final)
$route = rtrim($route, '/');
$route = $route ?: '/'; // Si la ruta queda vacía (era solo '/'), la restauramos

switch ($route) {
    // --- Endpoint de Configuración ---
    case '/config':
        if ($request_method == 'GET') {
            $stmt = $conn->prepare("SELECT tiempo_transicion_seg, efecto_transicion FROM configuracion_marcos WHERE marco_id = ?");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            json_response($result ? $result : ['tiempo_transicion_seg' => 10, 'efecto_transicion' => 'Disolver']);
        } elseif ($request_method == 'PUT') {
            $data = json_decode(file_get_contents('php://input'), true);
            $tiempo = intval($data['tiempo_transicion_seg']);
            $efecto = $data['efecto_transicion'] ?? 'Disolver'; // Valor por defecto

            $stmt = $conn->prepare("UPDATE configuracion_marcos SET tiempo_transicion_seg = ?, efecto_transicion = ? WHERE marco_id = ?");
            $stmt->bind_param("isi", $tiempo, $efecto, $marco_id);
            if ($stmt->execute()) {
                json_response(['success' => true]);
            } else {
                json_response(['error' => 'Error al actualizar la configuración.'], 500);
            }
        }
        break;

    // --- Endpoint de Fotos ---
    case '/photos':
        if ($request_method == 'GET') {
            $stmt = $conn->prepare("SELECT id, url, media_type FROM fotos WHERE marco_id = ? ORDER BY created_at DESC");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $fotos = [];
            while ($row = $result->fetch_assoc()) {
                $fotos[] = $row;
            }
            json_response($fotos);
        } elseif ($request_method == 'POST') {
            if (isset($_FILES['photos'])) {
                $files = $_FILES['photos'];
                $upload_count = 0;
                $errors = [];

                $upload_dir = 'public/contents/frame_' . $marco_id . '/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }

                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];

                // Iterar sobre cada archivo subido
                for ($i = 0; $i < count($files['name']); $i++) {
                    $file_name = uniqid() . '-' . basename($files['name'][$i]);
                    $target_path = $upload_dir . $file_name;

                    if (move_uploaded_file($files['tmp_name'][$i], $target_path)) {
                        $public_url = $protocol . $host . $base_path . '/' . $target_path;
                        
                        // Determinar el tipo de medio (image o video)
                        $mime_type = $files['type'][$i];
                        $media_type = strpos($mime_type, 'video') === 0 ? 'video' : 'image';

                        $stmt = $conn->prepare("INSERT INTO fotos (marco_id, url, media_type) VALUES (?, ?, ?)");
                        $stmt->bind_param("iss", $marco_id, $public_url, $media_type);

                        if ($stmt->execute()) {
                            $upload_count++;
                        } else {
                            $errors[] = "Error al guardar '{$files['name'][$i]}' en la base de datos.";
                        }
                    } else {
                        $errors[] = "Error al mover el archivo '{$files['name'][$i]}'.";
                    }
                }

                if ($upload_count > 0) {
                    json_response(['success' => true, 'uploaded_count' => $upload_count, 'errors' => $errors], 201);
                } else {
                    json_response(['error' => 'No se pudo subir ningún archivo.', 'details' => $errors], 500);
                }

            } else {
                json_response(['error' => 'No se recibieron archivos. Asegúrate de que el input se llame \'photos[]\'.'], 400);
            }
        }
        break;

    // --- Endpoint de Borrado de Fotos ---
    case '/photos/delete':
        if ($request_method == 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $photo_id = intval($data['photo_id'] ?? 0);

            if ($photo_id === 0) {
                json_response(['error' => 'ID de foto no proporcionado.'], 400);
            }

            // 1. Obtener la URL del archivo para poder borrarlo del disco
            $stmt = $conn->prepare("SELECT url FROM fotos WHERE id = ? AND marco_id = ?");
            $stmt->bind_param("ii", $photo_id, $marco_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            if ($result) {
                $url = $result['url'];
                // Convertir la URL pública a una ruta de archivo local
                $file_path = str_replace($protocol . $host . $base_path . '/', '', $url);

                // 2. Borrar el registro de la base de datos
                $delete_stmt = $conn->prepare("DELETE FROM fotos WHERE id = ?");
                $delete_stmt->bind_param("i", $photo_id);
                
                if ($delete_stmt->execute()) {
                    // 3. Si el borrado de la DB fue exitoso, borrar el archivo físico
                    if (file_exists($file_path)) {
                        unlink($file_path);
                    }
                    json_response(['success' => true]);
                } else {
                    json_response(['error' => 'Error al eliminar la foto de la base de datos.'], 500);
                }
            } else {
                json_response(['error' => 'La foto no existe o no tienes permiso para borrarla.'], 404);
            }
        }
        break;

    case '/photos/delete_all':
        if ($request_method == 'POST') {
            // 1. Obtener todas las URLs de los archivos para poder borrarlos del disco
            $stmt = $conn->prepare("SELECT url FROM fotos WHERE marco_id = ?");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $files_to_delete = [];
            while ($row = $result->fetch_assoc()) {
                $files_to_delete[] = $row['url'];
            }

            // 2. Borrar los registros de la base de datos
            $delete_db_stmt = $conn->prepare("DELETE FROM fotos WHERE marco_id = ?");
            $delete_db_stmt->bind_param("i", $marco_id);

            if ($delete_db_stmt->execute()) {
                // 3. Si el borrado de la DB fue exitoso, borrar los archivos físicos
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                $deleted_count = 0;

                foreach ($files_to_delete as $url) {
                    // Convertir la URL pública a una ruta de archivo local
                    $file_path = str_replace($protocol . $host . $base_path . '/', '', $url);
                    if (file_exists($file_path)) {
                        if (unlink($file_path)) {
                            $deleted_count++;
                        }
                    }
                }
                json_response(['success' => true, 'deleted_files_count' => $deleted_count]);
            } else {
                json_response(['error' => 'Error al eliminar las fotos de la base de datos.'], 500);
            }
        }
        break;

    default:
        json_response(['error' => 'Ruta no encontrada.'], 404);
        break;
}

$conn->close();
?>
