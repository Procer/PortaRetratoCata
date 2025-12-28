<?php
// --- Conexión a la Base de Datos ---
// Ajusta estos valores según tu configuración de MySQL

// --- Configuración de Base de Datos Dinámica ---
// Detecta el entorno (local o producción) para usar las credenciales correctas.
$is_local = (
    isset($_SERVER['HTTP_HOST']) &&
    ($_SERVER['HTTP_HOST'] === 'localhost' || strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0 || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === 0)
);

if ($is_local) {
    // Configuración para el entorno LOCAL
    $db_host = 'localhost';
    $db_user = 'root';
    $db_pass = 'Catunga0112.'; // o tu contraseña local
    $db_name = 'portaretrato_db';
} else {
    // Configuración para el entorno de PRODUCCIÓN (Hosting)
    $db_host = 'localhost';
    $db_user = 'zaratesy_portaretrato';
    $db_pass = 'Catunga0112.';
    $db_name = 'zaratesy_portaretrato';
}

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// --- Función de ayuda para la respuesta JSON ---
function json_response($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// --- Función de ayuda para verificar el token (versión robusta) ---
function verificar_token($conn) {
    $token = '';

    // Intentar obtener el token de query parameters (GET)
    if (isset($_GET['api_token'])) {
        $token = $_GET['api_token'];
    }
    // Intentar obtener el token del cuerpo de la solicitud (POST/PUT JSON)
    // Solo si no se encontró en GET y el método no es GET
    if (empty($token) && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['api_token'])) {
            $token = $input['api_token'];
        }
    }
    // Intentar obtener el token de POST data (para FormData)
    if (empty($token) && isset($_POST['api_token'])) {
        $token = $_POST['api_token'];
    }

    if (empty($token)) {
        json_response(['error' => 'Token no proporcionado o en formato incorrecto.'], 401);
    }

    $stmt = $conn->prepare("SELECT id FROM marcos WHERE token_acceso = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_response(['error' => 'Token inválido.'], 401);
    }

    $marco = $result->fetch_assoc();
    return $marco['id']; // Devuelve el ID del marco para usarlo en otras consultas
}
