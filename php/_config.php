<?php
// php/_config.php — set your MySQL credentials
$DB_HOST = "localhost";
$DB_USER = "root";
$DB_PASS = "";
$DB_NAME = "website_db";
$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($mysqli->connect_errno) { http_response_code(500); die("DB error"); }
$mysqli->set_charset("utf8mb4");
?>
