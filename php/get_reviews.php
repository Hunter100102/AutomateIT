<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__.'/_config.php';
$res = $mysqli->query("SELECT id,name,stars,content,status,created_at FROM reviews ORDER BY created_at DESC LIMIT 200");
$items = [];
while($row = $res->fetch_assoc()){ $items[] = $row; }
echo json_encode(["items"=>$items], JSON_UNESCAPED_UNICODE);
?>
