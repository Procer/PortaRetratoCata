<?php
// --- Panel de Administración para Google Photos ---

require_once 'vendor/autoload.php';
session_start();

// --- Configuración del Cliente de Google ---
$client = new Google_Client();
$client->setClientId('350742092559-58gag2m3i90vdovbh3kqg94ti9bk58ng.apps.googleusercontent.com');
$client->setClientSecret('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');
$redirect_uri = 'http://' . $_SERVER['HTTP_HOST'] . '/PortaRetrato/backend-php/oauth2callback.php';
$client->setRedirectUri($redirect_uri);
$client->setScopes('https://www.googleapis.com/auth/photoslibrary.readonly');
$client->setAccessType('offline'); // Para obtener un refresh token

// --- Lógica de Autenticación ---

// Si no tenemos un token de acceso en la sesión, mostramos el enlace de login
if (!isset($_SESSION['google_access_token'])) {
    $auth_url = $client->createAuthUrl();
    echo "<h1>Administración del Portaretratos</h1>";
    echo "<p>Para continuar, necesitas conectar tu cuenta de Google Fotos.</p>";
    echo "<a href='" . htmlspecialchars($auth_url) . "'>Conectar con Google Fotos</a>";

} else {
    // Si ya tenemos un token, lo configuramos en el cliente
    $client->setAccessToken($_SESSION['google_access_token']);

    // Si el token ha expirado, intentamos refrescarlo
    if ($client->isAccessTokenExpired()) {
        $refresh_token = $client->getRefreshToken();
        if ($refresh_token) {
            $client->fetchAccessTokenWithRefreshToken($refresh_token);
            $_SESSION['google_access_token'] = $client->getAccessToken();
        } else {
            // Si no hay refresh token, debemos re-autenticar
            unset($_SESSION['google_access_token']);
            $auth_url = $client->createAuthUrl();
            echo "<h1>Tu sesión ha expirado</h1>";
            echo "<p>Por favor, conéctate de nuevo.</p>";
            echo "<a href='" . htmlspecialchars($auth_url) . "'>Conectar con Google Fotos</a>";
            exit;
        }
    }

    // --- Usuario Autenticado ---
    echo "<h1>¡Conectado a Google Fotos!</h1>";
    echo "<p>El siguiente paso será mostrar tus álbumes aquí.</p>";
    echo "<hr>";
    echo '<a href="?logout">Cerrar sesión de Google</a>';

    // Manejar el logout
    if (isset($_GET['logout'])) {
        unset($_SESSION['google_access_token']);
        header('Location: admin.php');
        exit;
    }
}

?>
