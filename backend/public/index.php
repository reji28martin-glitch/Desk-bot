<?php
/**
 * DeskBot backend router.
 *
 * Routes (see docs/API.md for full request/response examples):
 *   POST /api/chat            -> AIService, returns { reply, speak }
 *   GET  /api/memory/list     -> { items: [...] }
 *   POST /api/memory/add      -> { item: {...} }
 *   POST /api/memory/update   -> { ok: true }
 *   POST /api/memory/delete   -> { ok: true }
 *   POST /api/memory/wipe     -> { ok: true }
 *
 * Point your webserver's document root at backend/public and rewrite all
 * requests to this file (see docs/SETUP.md), or run it with PHP's built-in
 * server for local testing:
 *   php -S localhost:8080 -t backend/public
 */

require __DIR__ . '/config.php';
require __DIR__ . '/../src/Auth.php';
require __DIR__ . '/../src/AIService.php';
require __DIR__ . '/../src/MemoryStore.php';

use DeskBot\Auth;
use DeskBot\AIService;
use DeskBot\MemoryStore;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rtrim($path, '/');

// Everything under /api requires the shared token.
if (str_starts_with($path, '/api')) {
    Auth::check();
}

try {
    switch (true) {

        case $path === '/api/chat' && $_SERVER['REQUEST_METHOD'] === 'POST':
            $body = json_body();
            $message = trim((string) ($body['message'] ?? ''));
            if ($message === '') {
                http_response_code(400);
                echo json_encode(['error' => 'message is required']);
                break;
            }
            $reply = AIService::reply($message, $body['history'] ?? []);
            echo json_encode(['reply' => $reply, 'speak' => true]);
            break;

        case $path === '/api/memory/list' && $_SERVER['REQUEST_METHOD'] === 'GET':
            echo json_encode(['items' => (new MemoryStore())->list()]);
            break;

        case $path === '/api/memory/add' && $_SERVER['REQUEST_METHOD'] === 'POST':
            $body = json_body();
            $item = (new MemoryStore())->add((string) ($body['key'] ?? ''), (string) ($body['value'] ?? ''));
            echo json_encode(['item' => $item]);
            break;

        case $path === '/api/memory/update' && $_SERVER['REQUEST_METHOD'] === 'POST':
            $body = json_body();
            (new MemoryStore())->update((string) ($body['id'] ?? ''), (string) ($body['key'] ?? ''), (string) ($body['value'] ?? ''));
            echo json_encode(['ok' => true]);
            break;

        case $path === '/api/memory/delete' && $_SERVER['REQUEST_METHOD'] === 'POST':
            $body = json_body();
            (new MemoryStore())->delete((string) ($body['id'] ?? ''));
            echo json_encode(['ok' => true]);
            break;

        case $path === '/api/memory/wipe' && $_SERVER['REQUEST_METHOD'] === 'POST':
            (new MemoryStore())->wipe();
            echo json_encode(['ok' => true]);
            break;

        case $path === '' || $path === '/api':
            echo json_encode(['name' => 'DeskBot backend', 'status' => 'ok']);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Not found', 'path' => $path]);
    }
} catch (\Throwable $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
