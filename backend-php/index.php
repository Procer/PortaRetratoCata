<?php
// --- Controlador Principal de la API ---

require_once 'db.php';

// Aumentar los límites de subida para permitir vídeos y subidas en lote más grandes.
// Estos valores pueden estar limitados por la configuración del servidor (php.ini).
@ini_set('upload_max_filesize', '100M');
@ini_set('post_max_size', '110M'); // Un poco más grande que upload_max_filesize
@ini_set('max_file_uploads', '50');    // Coincidir con el BATCH_SIZE del frontend

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
            $stmt = $conn->prepare("SELECT tiempo_transicion_seg, efecto_transicion, font_size_px, weather_city, weather_api_key, weather_font_size_px, weather_icon_size_px, weather_toggle_interval_sec FROM configuracion_marcos WHERE marco_id = ?");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            // Proporcionar valores por defecto para todos los campos si no existen
            $defaults = [
                'tiempo_transicion_seg' => 10,
                'efecto_transicion' => 'Disolver',
                'font_size_px' => 16,
                'weather_city' => '',
                'weather_api_key' => '',
                'weather_font_size_px' => 16,
                'weather_icon_size_px' => 72, // Default value for the new field
                'weather_toggle_interval_sec' => 0 // Default value for the new field
            ];
            json_response($result ? array_merge($defaults, $result) : $defaults);

        } elseif ($request_method == 'PUT') {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Asignar valores desde la data o usar un valor por defecto coherente
            $tiempo = intval($data['tiempo_transicion_seg'] ?? 10);
            $efecto = $data['efecto_transicion'] ?? 'Disolver';
            $fontSize = intval($data['font_size_px'] ?? 16);
            $weatherCity = $data['weather_city'] ?? '';
            $weatherApiKey = $data['weather_api_key'] ?? '';
            $weatherFontSize = intval($data['weather_font_size_px'] ?? 16);
            $weatherIconSize = intval($data['weather_icon_size_px'] ?? 72); // New field for icon size

                        $weatherToggleInterval = intval($data['weather_toggle_interval_sec'] ?? 0); // New field

            

                        $stmt = $conn->prepare("UPDATE configuracion_marcos SET 

                            tiempo_transicion_seg = ?, 

                            efecto_transicion = ?, 

                            font_size_px = ?,

                            weather_city = ?,

                            weather_api_key = ?,

                            weather_font_size_px = ?,

                            weather_icon_size_px = ?,

                            weather_toggle_interval_sec = ? -- New field in UPDATE query

                            WHERE marco_id = ?");

            

                        if ($stmt === false) {

                            // Si la preparación falla, es muy probable que las columnas no existan en la DB.

                            json_response(['error' => 'Error en la consulta a la base de datos. ¿Has ejecutado el comando ALTER TABLE para añadir las nuevas columnas de pronóstico o weather_icon_size_px?'], 500);

                            exit;

                        }

            

                        $stmt->bind_param(

                            "isissiiii", // Updated bind_param string (fewer 's' for removed forecast fields)

                            $tiempo, 

                            $efecto, 

                            $fontSize, 

                            $weatherCity, 

                            $weatherApiKey, 

                            $weatherFontSize,

                            $weatherIconSize,

                            $weatherToggleInterval, // New variable in bind_param

                            $marco_id

                        );

                        

                        if ($stmt->execute()) {

                            json_response(['success' => true]);

                        } else {

                            json_response(['error' => 'Error al actualizar la configuración.'], 500);

                        }        }
        break;

    // --- Endpoint de Fotos ---
    case '/photos':
        // GET: Listar fotos del álbum activo
        if ($request_method == 'GET') {
            // 1. Obtener el ID del álbum activo para este marco
            $stmt = $conn->prepare("SELECT id FROM albums WHERE marco_id = ? AND is_active = TRUE");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $active_album_result = $stmt->get_result()->fetch_assoc();
            $active_album_id = $active_album_result ? $active_album_result['id'] : null;

            if ($active_album_id === null) {
                // No hay álbum activo, devolver vacío o error
                json_response([]);
                break;
            }

            $stmt = $conn->prepare("SELECT id, url, media_type FROM fotos WHERE marco_id = ? AND album_id = ? ORDER BY created_at DESC");
            $stmt->bind_param("ii", $marco_id, $active_album_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $fotos = [];
            // Construir la URL base una sola vez fuera del bucle para eficiencia.
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'];
            // $base_path ya está calculado arriba y es la ruta a la carpeta backend-php
            $base_url = $protocol . $host . $base_path . '/';

            while ($row = $result->fetch_assoc()) {
                // Convertir la URL relativa almacenada en una URL absoluta completa.
                $row['url'] = $base_url . $row['url'];
                $fotos[] = $row;
            }
            json_response($fotos);
        } elseif ($request_method == 'POST') {
            // Lógica unificada para subir fotos y videos
            // 1. Determinar el album_id de destino
            $target_album_id = null;
            if (isset($_POST['album_id'])) { // Desde formulario multipart/form-data
                $target_album_id = (int)$_POST['album_id'];
            } elseif (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
                $data = json_decode(file_get_contents('php://input'), true);
                $target_album_id = (int)($data['album_id'] ?? 0);
            }

            if (!$target_album_id) {
                // Si no se especificó un album_id, buscar el activo o el primero
                $stmt = $conn->prepare("SELECT id FROM albums WHERE marco_id = ? AND is_active = TRUE LIMIT 1");
                $stmt->bind_param("i", $marco_id);
                $stmt->execute();
                $active_album_result = $stmt->get_result()->fetch_assoc();
                if ($active_album_result) {
                    $target_album_id = $active_album_result['id'];
                } else {
                    $stmt = $conn->prepare("SELECT id FROM albums WHERE marco_id = ? ORDER BY id ASC LIMIT 1");
                    $stmt->bind_param("i", $marco_id);
                    $stmt->execute();
                    $first_album_result = $stmt->get_result()->fetch_assoc();
                    if ($first_album_result) {
                        $target_album_id = $first_album_result['id'];
                    } else {
                        json_response(['error' => 'No hay álbumes disponibles para subir el contenido.'], 400);
                        break;
                    }
                }
            } else {
                // Verificar que el album_id proporcionado pertenece al marco
                $stmt = $conn->prepare("SELECT COUNT(*) FROM albums WHERE id = ? AND marco_id = ?");
                $stmt->bind_param("ii", $target_album_id, $marco_id);
                $stmt->execute();
                $stmt->bind_result($count);
                $stmt->fetch();
                $stmt->close();
                if ($count === 0) {
                    json_response(['error' => 'El álbum especificado no existe o no pertenece a este marco.'], 404);
                    break;
                }
            }

            $upload_count = 0;
            $errors = [];
            $files_to_process = [];

            // Unificar el manejo de archivos de fotos y videos
            if (isset($_FILES['photos'])) {
                if (is_array($_FILES['photos']['name'])) {
                    // Múltiples fotos
                    for ($i = 0; $i < count($_FILES['photos']['name']); $i++) {
                        $files_to_process[] = [
                            'name' => $_FILES['photos']['name'][$i],
                            'type' => $_FILES['photos']['type'][$i],
                            'tmp_name' => $_FILES['photos']['tmp_name'][$i],
                            'error' => $_FILES['photos']['error'][$i],
                            'size' => $_FILES['photos']['size'][$i],
                        ];
                    }
                } else {
                    // Una sola foto subida como 'photos'
                     $files_to_process[] = [
                        'name' => $_FILES['photos']['name'],
                        'type' => $_FILES['photos']['type'],
                        'tmp_name' => $_FILES['photos']['tmp_name'],
                        'error' => $_FILES['photos']['error'],
                        'size' => $_FILES['photos']['size'],
                    ];
                }
            } 
            // Manejo específico para 'video' - deprecando upload_video.php
            elseif (isset($_FILES['video'])) {
                $files_to_process[] = [
                    'name' => $_FILES['video']['name'],
                    'type' => $_FILES['video']['type'],
                    'tmp_name' => $_FILES['video']['tmp_name'],
                    'error' => $_FILES['video']['error'],
                    'size' => $_FILES['video']['size'],
                ];
            } else {
                json_response(['error' => 'No se recibieron archivos. Asegúrate de que el input se llame \'photos[]\' o \'video\'.'], 400);
                break;
            }


            $upload_dir = 'public/contents/frame_' . $marco_id . '/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }

            foreach ($files_to_process as $file) {
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    $errors[] = "Error al subir '{$file['name']}': Código de error {$file['error']}.";
                    continue;
                }

                $file_name = uniqid() . '-' . basename($file['name']);
                $target_path = $upload_dir . $file_name;

                if (move_uploaded_file($file['tmp_name'], $target_path)) {
                    $public_url = $target_path;
                    $mime_type = $file['type'];
                    $media_type = strpos($mime_type, 'video') === 0 ? 'video' : 'image';

                    $stmt = $conn->prepare("INSERT INTO fotos (marco_id, album_id, url, media_type) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("iiss", $marco_id, $target_album_id, $public_url, $media_type);

                    if ($stmt->execute()) {
                        $upload_count++;
                    } else {
                        $errors[] = "Error al guardar '{$file['name']}' en la base de datos.";
                        @unlink($target_path); // Borrar archivo si falla la DB
                    }
                } else {
                    $errors[] = "Error al mover el archivo '{$file['name']}'.";
                }
            }

            if ($upload_count > 0) {
                json_response(['success' => true, 'uploaded_count' => $upload_count, 'errors' => $errors], 201);
            } else {
                json_response(['error' => 'No se pudo subir ningún archivo.', 'details' => $errors], 500);
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

                // Definir las variables que faltaban para construir la ruta
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                
                // Convertir la URL pública a una ruta de archivo local
                $file_path = str_replace($protocol . $host . $base_path . '/', '', $url);

                // 2. Borrar el registro de la base de datos
                $delete_stmt = $conn->prepare("DELETE FROM fotos WHERE id = ?");
                $delete_stmt->bind_param("i", $photo_id);
                
                if ($delete_stmt->execute()) {
                    // 3. Si el borrado de la DB fue exitoso, borrar el archivo físico
                    $warning = null;
                    if (file_exists($file_path)) {
                        if (!@unlink($file_path)) {
                             $warning = "El registro se eliminó de la DB, pero no se pudo borrar el archivo físico ({$file_path}). Verifique los permisos.";
                        }
                    }
                    json_response(['success' => true, 'warning' => $warning]);
                } else {
                    json_response(['error' => 'Error al eliminar la foto de la base de datos.'], 500);
                }
            } else {
                json_response(['error' => 'La foto no existe o no tienes permiso para borrarla.'], 404);
            }
        }
        break;



    // --- Endpoint de Clima ---
    case '/weather':
        if ($request_method == 'GET') {
            // 1. Obtener la configuración de la ciudad y la API key
            $stmt = $conn->prepare("SELECT weather_city, weather_api_key FROM configuracion_marcos WHERE marco_id = ?");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $config = $stmt->get_result()->fetch_assoc();

            if (!$config || empty($config['weather_city']) || empty($config['weather_api_key'])) {
                json_response(['error' => 'La ciudad o la API key para el clima no están configuradas.'], 400);
                break;
            }

            $city = $config['weather_city'];
            $apiKey = $config['weather_api_key'];
            $lang = 'es'; // Para obtener la descripción en español
            
            // Nueva URL para WeatherAPI.com
            $url = "http://api.weatherapi.com/v1/current.json?key={$apiKey}&q=" . urlencode($city) . "&lang={$lang}";

            // 2. Usar cURL para hacer la petición a la API externa
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Tiempo de espera de 10 segundos
            $api_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code != 200) {
                $error_details = json_decode($api_response, true);
                $errorMessage = $error_details['error']['message'] ?? 'Respuesta no válida del servicio de clima.';
                json_response(['error' => 'Error al contactar el servicio de clima.', 'details' => $errorMessage], 502); // 502 Bad Gateway
                break;
            }

            $weather_data = json_decode($api_response, true);

            // 3. Formatear y devolver una respuesta simplificada
            $response = [
                'temp' => round($weather_data['current']['temp_c']),
                'description' => ucfirst($weather_data['current']['condition']['text']),
                // La URL del icono ya viene completa, solo le quitamos el protocolo para que sea flexible (http/https)
                'icon' => str_replace('https:', '', $weather_data['current']['condition']['icon'])
            ];

            json_response($response);
        }
        break;

    // --- Endpoint de Pronóstico ---
    case '/forecast':
        if ($request_method == 'GET') {
            // 1. Obtener la configuración de la ciudad y la API key
            $stmt = $conn->prepare("SELECT weather_city, weather_api_key FROM configuracion_marcos WHERE marco_id = ?");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $config = $stmt->get_result()->fetch_assoc();

            if (!$config || empty($config['weather_city']) || empty($config['weather_api_key'])) {
                json_response(['error' => 'La ciudad o la API key para el clima no están configuradas.'], 400);
                break;
            }

            $city = $config['weather_city'];
            $apiKey = $config['weather_api_key'];
            $lang = 'es';
            $days = 3; // El plan gratuito de WeatherAPI suele dar hasta 3 días.

            // 2. Construir la URL para el pronóstico de WeatherAPI.com
            $forecast_url = "http://api.weatherapi.com/v1/forecast.json?key={$apiKey}&q=" . urlencode($city) . "&days={$days}&lang={$lang}";
            
            $ch_forecast = curl_init();
            curl_setopt($ch_forecast, CURLOPT_URL, $forecast_url);
            curl_setopt($ch_forecast, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch_forecast, CURLOPT_TIMEOUT, 15);
            $forecast_response = curl_exec($ch_forecast);
            $http_code_forecast = curl_getinfo($ch_forecast, CURLINFO_HTTP_CODE);
            curl_close($ch_forecast);

            if ($http_code_forecast != 200) {
                $error_details = json_decode($forecast_response, true);
                $error_message = $error_details['error']['message'] ?? 'Respuesta no válida del servicio de pronóstico.';
                json_response(['error' => 'Error al obtener los datos del pronóstico.', 'details' => $error_message], 502);
                break;
            }

            $forecast_data = json_decode($forecast_response, true);

            // 4. Procesar y simplificar la respuesta
            $simplified_forecast = [
                'hourly' => [],
                'daily' => []
            ];

            // Procesar las horas restantes del día actual
            if (isset($forecast_data['forecast']['forecastday'][0]['hour'])) {
                $current_time = time();
                foreach($forecast_data['forecast']['forecastday'][0]['hour'] as $hour) {
                    // Incluir solo las horas futuras
                    if ($hour['time_epoch'] > $current_time) {
                         $simplified_forecast['hourly'][] = [
                            'dt' => $hour['time_epoch'],
                            'hour' => date('H:i', $hour['time_epoch']),
                            'temp' => round($hour['temp_c']),
                            'icon' => str_replace('https:', '', $hour['condition']['icon']),
                            'description' => $hour['condition']['text']
                        ];
                    }
                }
            }
            
            // Procesar los días siguientes
            if (isset($forecast_data['forecast']['forecastday'])) {
                 // Empezar en 1 para obtener el pronóstico de "mañana" en adelante
                for ($i = 1; $i < count($forecast_data['forecast']['forecastday']); $i++) {
                    $day_data = $forecast_data['forecast']['forecastday'][$i];
                    $day_of_week_index = date('w', $day_data['date_epoch']);
                    $day_names_es = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

                    $simplified_forecast['daily'][] = [
                        'dt' => $day_data['date_epoch'],
                        'day_name' => $day_names_es[$day_of_week_index],
                        'temp_max' => round($day_data['day']['maxtemp_c']),
                        'temp_min' => round($day_data['day']['mintemp_c']),
                        'icon' => str_replace('https:', '', $day_data['day']['condition']['icon']),
                        'description' => $day_data['day']['condition']['text']
                    ];
                }
            }

            json_response($simplified_forecast);
        }
        break;

    // --- Endpoint de Álbumes ---
    case '/albums':
    case preg_match('/^\/albums\/(\d+)$/', $route, $matches) ? true : false: // Para /albums/{id}
        $album_id = isset($matches[1]) ? (int)$matches[1] : null;

        // GET: Listar todos los álbumes del marco
        if ($request_method == 'GET' && $album_id === null) {
            $stmt = $conn->prepare("SELECT id, name, is_active FROM albums WHERE marco_id = ? ORDER BY name ASC");
            $stmt->bind_param("i", $marco_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $albums = [];
            while ($row = $result->fetch_assoc()) {
                $album_id_current = $row['id'];

                // Obtener el conteo de medios para el álbum
                $stmt_count = $conn->prepare("SELECT COUNT(*) AS media_count FROM fotos WHERE album_id = ? AND marco_id = ?");
                $stmt_count->bind_param("ii", $album_id_current, $marco_id);
                $stmt_count->execute();
                $count_result = $stmt_count->get_result()->fetch_assoc();
                $row['media_count'] = $count_result['media_count'];
                $stmt_count->close();

                // Obtener hasta 4 URLs de previsualización para el álbum
                $stmt_previews = $conn->prepare("SELECT url, media_type FROM fotos WHERE album_id = ? AND marco_id = ? ORDER BY created_at DESC LIMIT 4");
                $stmt_previews->bind_param("ii", $album_id_current, $marco_id);
                $stmt_previews->execute();
                $previews_result = $stmt_previews->get_result();
                $previews = [];
                // Construir la URL base una sola vez fuera del bucle para eficiencia.
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                $base_url = $protocol . $host . $base_path . '/'; // $base_path ya está calculado arriba

                while ($preview_row = $previews_result->fetch_assoc()) {
                    $preview_row['url'] = $base_url . $preview_row['url'];
                    $previews[] = $preview_row;
                }
                $row['previews'] = $previews;
                $stmt_previews->close();
                
                $albums[] = $row;
            }
            json_response($albums);
        }
        // POST: Crear un nuevo álbum
        elseif ($request_method == 'POST' && $album_id === null) {
            $data = json_decode(file_get_contents('php://input'), true);
            $album_name = trim($data['name'] ?? '');

            if (empty($album_name)) {
                json_response(['error' => 'El nombre del álbum no puede estar vacío.'], 400);
            }

            // Verificar si ya existe un álbum con ese nombre para este marco
            $stmt = $conn->prepare("SELECT COUNT(*) FROM albums WHERE marco_id = ? AND name = ?");
            $stmt->bind_param("is", $marco_id, $album_name);
            $stmt->execute();
            $stmt->bind_result($count);
            $stmt->fetch();
            $stmt->close();

            if ($count > 0) {
                json_response(['error' => 'Ya existe un álbum con ese nombre.'], 409); // 409 Conflict
            }

            $stmt = $conn->prepare("INSERT INTO albums (marco_id, name) VALUES (?, ?)");
            $stmt->bind_param("is", $marco_id, $album_name);
            if ($stmt->execute()) {
                json_response(['success' => true, 'id' => $conn->insert_id, 'name' => $album_name, 'is_active' => false], 201);
            } else {
                json_response(['error' => 'Error al crear el álbum.'], 500);
            }
        }
        // PUT: Actualizar un álbum (renombrar o activar)
        elseif ($request_method == 'PUT' && $album_id !== null) {
            $data = json_decode(file_get_contents('php://input'), true);
            $new_album_name = trim($data['name'] ?? '');
            $set_active = $data['is_active'] ?? null; // Puede ser true, false o null

            if (empty($new_album_name) && $set_active === null) {
                json_response(['error' => 'No se proporcionaron datos para actualizar el álbum.'], 400);
            }

            // Verificar que el álbum pertenece al marco actual
            $stmt = $conn->prepare("SELECT COUNT(*) FROM albums WHERE id = ? AND marco_id = ?");
            $stmt->bind_param("ii", $album_id, $marco_id);
            $stmt->execute();
            $stmt->bind_result($count);
            $stmt->fetch();
            $stmt->close();

            if ($count === 0) {
                json_response(['error' => 'Álbum no encontrado o no pertenece a este marco.'], 404);
            }

            if (!empty($new_album_name)) {
                // Verificar si el nuevo nombre ya existe para otro álbum en el mismo marco
                $stmt = $conn->prepare("SELECT COUNT(*) FROM albums WHERE marco_id = ? AND name = ? AND id != ?");
                $stmt->bind_param("isi", $marco_id, $new_album_name, $album_id);
                $stmt->execute();
                $stmt->bind_result($name_conflict);
                $stmt->fetch();
                $stmt->close();

                if ($name_conflict > 0) {
                    json_response(['error' => 'Ya existe otro álbum con ese nombre.'], 409);
                }

                $stmt = $conn->prepare("UPDATE albums SET name = ? WHERE id = ? AND marco_id = ?");
                $stmt->bind_param("sii", $new_album_name, $album_id, $marco_id);
                $stmt->execute();
            }

            if ($set_active !== null) {
                // Si se intenta activar un álbum
                if ($set_active) {
                    // Desactivar todos los demás álbumes del mismo marco
                    $stmt_deactivate = $conn->prepare("UPDATE albums SET is_active = FALSE WHERE marco_id = ?");
                    $stmt_deactivate->bind_param("i", $marco_id);
                    $stmt_deactivate->execute();

                    // Activar el álbum especificado
                    $stmt_activate = $conn->prepare("UPDATE albums SET is_active = TRUE WHERE id = ? AND marco_id = ?");
                    $stmt_activate->bind_param("ii", $album_id, $marco_id);
                    $stmt_activate->execute();
                } else {
                    // Si se intenta desactivar el álbum, solo se desactiva
                    $stmt_deactivate_single = $conn->prepare("UPDATE albums SET is_active = FALSE WHERE id = ? AND marco_id = ?");
                    $stmt_deactivate_single->bind_param("ii", $album_id, $marco_id);
                    $stmt_deactivate_single->execute();
                }
            }
            
            json_response(['success' => true]);
        }
        // DELETE: Eliminar un álbum
        elseif ($request_method == 'DELETE' && $album_id !== null) {
            // Obtener la URL de las fotos para borrarlas físicamente
            $stmt = $conn->prepare("SELECT url FROM fotos WHERE album_id = ? AND marco_id = ?");
            $stmt->bind_param("ii", $album_id, $marco_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $files_to_delete = [];
            while ($row = $result->fetch_assoc()) {
                $files_to_delete[] = $row['url'];
            }
            $stmt->close();

            // Borrar el álbum de la base de datos (ON DELETE CASCADE en fotos se encargará de los registros de fotos)
            $stmt_delete_album = $conn->prepare("DELETE FROM albums WHERE id = ? AND marco_id = ?");
            $stmt_delete_album->bind_param("ii", $album_id, $marco_id);
            
            if ($stmt_delete_album->execute()) {
                // Borrar archivos físicos
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                $deleted_count = 0;
                $errors = [];

                foreach ($files_to_delete as $url) {
                    // Convertir la URL pública a una ruta de archivo local
                    $file_path = str_replace($protocol . $host . $base_path . '/', '', $url);
                    if (file_exists($file_path)) {
                        if (@unlink($file_path)) {
                            $deleted_count++;
                        } else {
                            $errors[] = "No se pudo borrar '{$file_path}'. Verifique los permisos.";
                        }
                    }
                }
                json_response(['success' => true, 'deleted_files_count' => $deleted_count, 'errors' => $errors]);
            } else {
                json_response(['error' => 'Error al eliminar el álbum.'], 500);
            }
        }
        break;

    default:
        json_response(['error' => 'Ruta no encontrada.'], 404);
        break;
}

$conn->close();
?>
