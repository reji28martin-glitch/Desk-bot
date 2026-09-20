<?php
namespace DeskBot;

/**
 * Talks to whichever AI provider is configured. Keep every provider-specific
 * detail inside this class so the rest of the backend (and the entire mobile
 * app) never needs to know which AI service is behind /api/chat.
 */
class AIService
{
    private const PERSONALITY = <<<SYS
You are DeskBot, a friendly, casual, helpful little AI desk robot with a
camera, pan/tilt head, microphone and speaker. Keep answers short and
natural when a short answer fits; you can have relaxed casual conversation
too. You are NOT responsible for executing hardware commands yourself -
the app already intercepts direct commands like "turn left" or "track me"
before they reach you, so if a message like that reaches you, treat it as
conversation (e.g. explain what you'd do) rather than assuming you already
did it.
SYS;

    public static function reply(string $message, array $history = []): string
    {
        $provider = $_ENV['AI_PROVIDER'] ?? 'openai';

        return match ($provider) {
            'openai' => self::openai($message, $history),
            default => throw new \RuntimeException("Unknown AI_PROVIDER: $provider"),
        };
    }

    private static function openai(string $message, array $history): string
    {
        $apiKey = $_ENV['AI_API_KEY'] ?? '';
        if ($apiKey === '' || $apiKey === 'sk-replace-me') {
            throw new \RuntimeException('AI_API_KEY not configured on the backend (.env)');
        }
        $model = $_ENV['AI_MODEL'] ?? 'gpt-4o-mini';

        $messages = [['role' => 'system', 'content' => self::PERSONALITY]];
        foreach ($history as $m) {
            if (in_array($m['role'] ?? '', ['user', 'assistant'], true)) {
                $messages[] = ['role' => $m['role'], 'content' => (string) $m['content']];
            }
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => $model,
                'messages' => $messages,
                'max_tokens' => 300,
                'temperature' => 0.7,
            ]),
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            throw new \RuntimeException('AI request failed: ' . curl_error($ch));
        }
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($raw, true);
        if ($status !== 200 || !isset($data['choices'][0]['message']['content'])) {
            $err = $data['error']['message'] ?? ('HTTP ' . $status);
            throw new \RuntimeException('AI provider error: ' . $err);
        }
        return trim($data['choices'][0]['message']['content']);
    }
}
