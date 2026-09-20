<?php
// Bootstrap: env vars, CORS, JSON headers. Included by every endpoint.

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

header('Content-Type: application/json');

$allowed = $_ENV['ALLOWED_ORIGINS'] ?? '*';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($allowed === '*' || in_array($origin, array_map('trim', explode(',', $allowed)), true)) {
    header('Access-Control-Allow-Origin: ' . ($allowed === '*' ? '*' : $origin));
}
header('Access-Control-Allow-Headers: Content-Type, X-DeskBot-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
