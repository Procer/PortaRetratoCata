<?php
require 'db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method Not Allowed']);
    exit;
}

if (!is_admin()) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized']);
    exit;
}

$uploadDir = __DIR__ . '/public/contents/frame_1/';
$files = glob($uploadDir . '*');
$deleted_count = 0;
$errors = [];

foreach ($files as $file) {
    if (is_file($file)) {
        if (unlink($file)) {
            $deleted_count++;
        } else {
            $errors[] = basename($file);
        }
    }
}

if (empty($errors)) {
    echo json_encode(['message' => "Se eliminaron $deleted_count archivos exitosamente."]);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Error al eliminar algunos archivos.', 'errors' => $errors]);
}
?>