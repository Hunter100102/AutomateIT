<?php
// php/widget_reviews.php — include this file where you want the widget
echo '<link rel="stylesheet" href="/frontend/reviews.css">';
echo '<link rel="stylesheet" href="/frontend/ux_refresh.css">';
echo '<div id="reviews-widget" data-endpoint="/php/get_reviews.php" data-post="/php/submit_review.php"></div>';
echo '<script defer src="/frontend/reviews.js"></script>';
?>
