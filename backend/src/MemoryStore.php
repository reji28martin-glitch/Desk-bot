<?php
namespace DeskBot;

/**
 * Backend-side mirror of the robot's memory. Today this is the source of
 * truth (SQLite file next to the backend). Once the ESP32 firmware grows a
 * microSD sync routine (see docs/API.md), this class is the place to push
 * changes down to /memory/* on the robot as well as serving the app.
 */
class MemoryStore
{
    private \PDO $pdo;

    public function __construct()
    {
        $path = $_ENV['DB_PATH'] ?? __DIR__ . '/../data/deskbot.sqlite';
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $this->pdo = new \PDO('sqlite:' . $path);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                key_label TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL
            )'
        );
    }

    public function list(): array
    {
        $stmt = $this->pdo->query('SELECT id, key_label AS `key`, value FROM memories ORDER BY created_at DESC');
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function add(string $key, string $value): array
    {
        $id = bin2hex(random_bytes(8));
        $stmt = $this->pdo->prepare(
            'INSERT INTO memories (id, key_label, value, created_at) VALUES (:id, :key, :value, :created_at)'
        );
        $stmt->execute([
            ':id' => $id,
            ':key' => $key,
            ':value' => $value,
            ':created_at' => date('c'),
        ]);
        return ['id' => $id, 'key' => $key, 'value' => $value];
    }

    public function update(string $id, string $key, string $value): void
    {
        $stmt = $this->pdo->prepare('UPDATE memories SET key_label = :key, value = :value WHERE id = :id');
        $stmt->execute([':key' => $key, ':value' => $value, ':id' => $id]);
    }

    public function delete(string $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM memories WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    public function wipe(): void
    {
        $this->pdo->exec('DELETE FROM memories');
    }
}
