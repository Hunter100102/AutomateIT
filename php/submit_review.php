<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__.'/_config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$honeypot = $_POST['website'] ?? '';

// Basic anti-abuse
if (!empty($honeypot)) { http_response_code(400); echo json_encode(["ok"=>false]); exit; }

$name = trim($data['name'] ?? '');
$stars = intval($data['stars'] ?? 5);
$content = trim($data['content'] ?? '');
if ($stars < 1) $stars = 1; if ($stars > 5) $stars = 5;

if (strlen($name) < 2 || strlen($content) < 10) {
  http_response_code(400); echo json_encode(["ok"=>false,"error"=>"Invalid"]); exit;
}

// Simple profanity blocklist (expand as needed)
$bad = ['http://','https://','viagra','sex','porn'];
foreach($bad as $b){ if (stripos($content, $b)!==false) { http_response_code(400); echo json_encode(["ok"=>false]); exit; } }

$stmt = $mysqli->prepare("INSERT INTO reviews (name,stars,content,status) VALUES (?,?,?,'pending')");
$stmt->bind_param("sis",$name,$stars,$content);
if($stmt->execute()){ echo json_encode(["ok"=>true,"pending"=>true]); }
else { http_response_code(500); echo json_encode(["ok"=>false]); }
?>
