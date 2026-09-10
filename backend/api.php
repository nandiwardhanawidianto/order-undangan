<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$config = require __DIR__ . '/config.php';
try {
    $host = $config['host'] ?? 'localhost';
    $port = $config['port'] ?? 3306;
    $database = $config['database'] ?? '';
    $username = $config['username'] ?? '';
    $password = $config['password'] ?? '';
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (Throwable $e) {
    respond(['message' => 'Koneksi database gagal. Cek backend/config.php'], 500);
}

$statuses = ['Orderan Masuk', 'Revisi', 'Antri Cetak', 'Proses Cetak', 'Selesai Cetak', 'Pending', 'Sudah Dikirim'];
$types = ['Digital', 'Cetak'];
$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['path'] ?? '/orders';
$path = '/' . trim($path, '/');
$body = json_decode(file_get_contents('php://input'), true) ?: [];

function normalizeLegacyType(?string $type): string {
    return $type === 'Digital + Cetak' ? 'Cetak' : (string)$type;
}

function mapOrder(array $row): array {
    return [
        'id' => (int)$row['id'],
        'orderNo' => $row['order_no'],
        'type' => normalizeLegacyType($row['order_type'] ?? ''),
        'variant' => $row['variant'],
        'qty' => (int)$row['quantity'],
        'couple' => $row['couple_name'],
        'status' => $row['status'],
        'notes' => $row['notes'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function validateOrder(array $body, array $statuses, array $types): array {
    $orderNo = trim((string)($body['orderNo'] ?? ''));
    $type = normalizeLegacyType((string)($body['type'] ?? ''));
    $variant = trim((string)($body['variant'] ?? ''));
    $qty = max(1, (int)($body['qty'] ?? 1));
    $couple = trim((string)($body['couple'] ?? ''));
    $status = (string)($body['status'] ?? 'Orderan Masuk');
    $notes = trim((string)($body['notes'] ?? ''));
    if ($orderNo === '' || $couple === '') respond(['message' => 'No pesanan dan nama mempelai wajib diisi.'], 422);
    if (!in_array($type, $types, true)) respond(['message' => 'Jenis order tidak valid.'], 422);
    if (!in_array($status, $statuses, true)) respond(['message' => 'Status tidak valid.'], 422);
    return compact('orderNo','type','variant','qty','couple','status','notes');
}

if ($method === 'GET' && $path === '/orders') {
    $rows = $pdo->query('SELECT * FROM wedding_orders ORDER BY id DESC')->fetchAll();
    respond(['data' => array_map('mapOrder', $rows)]);
}

if ($method === 'POST' && $path === '/orders') {
    $v = validateOrder($body, $statuses, $types);
    try {
        $stmt = $pdo->prepare('INSERT INTO wedding_orders (order_no, order_type, variant, quantity, couple_name, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
        $stmt->execute([$v['orderNo'],$v['type'],$v['variant'] ?: null,$v['qty'],$v['couple'],$v['status'],$v['notes'] ?: null]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') respond(['message' => 'No pesanan sudah ada.'], 422);
        throw $e;
    }
    $stmt = $pdo->prepare('SELECT * FROM wedding_orders WHERE id = ?');
    $stmt->execute([$pdo->lastInsertId()]);
    respond(['data' => mapOrder($stmt->fetch())], 201);
}

if (preg_match('#^/orders/(\\d+)$#', $path, $m)) {
    $id = (int)$m[1];
    if ($method === 'PUT') {
        $v = validateOrder($body, $statuses, $types);
        try {
            $stmt = $pdo->prepare('UPDATE wedding_orders SET order_no=?, order_type=?, variant=?, quantity=?, couple_name=?, status=?, notes=?, updated_at=NOW() WHERE id=?');
            $stmt->execute([$v['orderNo'],$v['type'],$v['variant'] ?: null,$v['qty'],$v['couple'],$v['status'],$v['notes'] ?: null,$id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') respond(['message' => 'No pesanan sudah dipakai order lain.'], 422);
            throw $e;
        }
        $stmt = $pdo->prepare('SELECT * FROM wedding_orders WHERE id=?'); $stmt->execute([$id]);
        $row = $stmt->fetch(); if (!$row) respond(['message' => 'Order tidak ditemukan.'], 404);
        respond(['data' => mapOrder($row)]);
    }
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM wedding_orders WHERE id=?'); $stmt->execute([$id]);
        respond(['message' => 'Order dihapus.']);
    }
}

if (preg_match('#^/orders/(\\d+)/status$#', $path, $m) && $method === 'PATCH') {
    $id = (int)$m[1];
    $status = (string)($body['status'] ?? '');
    if (!in_array($status, $statuses, true)) respond(['message' => 'Status tidak valid.'], 422);
    $stmt = $pdo->prepare('UPDATE wedding_orders SET status=?, updated_at=NOW() WHERE id=?'); $stmt->execute([$status,$id]);
    $stmt = $pdo->prepare('SELECT * FROM wedding_orders WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch(); if (!$row) respond(['message' => 'Order tidak ditemukan.'], 404);
    respond(['data' => mapOrder($row)]);
}

respond(['message' => 'Endpoint tidak ditemukan.'], 404);
