<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Token');

$output = [
    'get_params' => $_GET,
    'post_params' => $_POST,
    'server_vars' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? null,
        'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? null,
        'HTTP_X_API_TOKEN' => $_SERVER['HTTP_X_API_TOKEN'] ?? null,
        'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null, // Otra variable común después de reescribir
    ],
    'php_input_json_decoded' => json_decode(file_get_contents('php://input')),
];

echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
