<?php
namespace DeskBot;

/**
 * Very small shared-secret check. This is intentionally simple:
 * swap it out for per-user API keys / OAuth once "multiple users"
 * (see docs/API.md future features) is implemented.
 */
class Auth
{
    public static function check(): void
    {
        $expected = $_ENV['APP_SHARED_TOKEN'] ?? '';
        $given = $_SERVER['HTTP_X_DESKBOT_TOKEN'] ?? '';

        if ($expected === '' || $expected === 'change-me') {
            // Backend not configured yet - fail closed rather than open.
            http_response_code(500);
            echo json_encode(['error' => 'Backend not configured: set APP_SHARED_TOKEN in .env']);
            exit;
        }

        if (!hash_equals($expected, $given)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }
}
