<?php
// php/reviews_admin.php — VERY SIMPLE admin to approve/reject (protect with HTTP auth or your session system)
require_once __DIR__.'/_config.php';
if ($_SERVER['REQUEST_METHOD']==='POST') {
  $id = intval($_POST['id'] ?? 0);
  $act = $_POST['action'] ?? '';
  if ($id > 0 && in_array($act,['approve','reject'])) {
    $status = $act==='approve' ? 'approved' : 'rejected';
    $stmt = $mysqli->prepare("UPDATE reviews SET status=? WHERE id=?");
    $stmt->bind_param("si", $status, $id);
    $stmt->execute();
  }
  header("Location: reviews_admin.php"); exit;
}
$res = $mysqli->query("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200");
?>
<!doctype html><html><head><meta charset="utf-8"><title>Reviews Admin</title>
<link rel="stylesheet" href="/frontend/reviews.css"></head><body>
<div style="max-width:900px;margin:2rem auto">
<h2>Pending Reviews</h2>
<?php while($r=$res->fetch_assoc()): ?>
  <form method="post" class="review-card">
    <div class="review-meta"><strong><?=htmlspecialchars($r['name'])?></strong> · <?=$r['stars']?>★ · <?=$r['status']?></div>
    <div class="review-content"><?=nl2br(htmlspecialchars($r['content']))?></div>
    <input type="hidden" name="id" value="<?=$r['id']?>"/>
    <button name="action" value="approve" class="submit">Approve</button>
    <button name="action" value="reject" class="submit" style="background:#900">Reject</button>
  </form>
<?php endwhile; ?>
</div>
</body></html>
