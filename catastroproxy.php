<?php
// proxy.php — simple QGIS-compatible WMS relay

// Base WMS endpoint (change if needed)
$target_base = "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx";

// Forward all incoming query parameters
$query_string = $_SERVER['QUERY_STRING'] ?? '';
$url = $target_base . ($query_string ? '?' . $query_string : '');

// Security: allow only safe WMS params
if (!preg_match('/SERVICE=WMS/i', $query_string)) {
    http_response_code(400);
    echo "Invalid or missing SERVICE=WMS parameter.";
    exit;
}

// Initialize cURL
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_USERAGENT => 'QGIS-Proxy/1.0',
    CURLOPT_HTTPHEADER => ['Accept: */*']
]);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$err = curl_error($ch);
curl_close($ch);

// Handle response
if ($response === false) {
    http_response_code(502);
    header('Content-Type: text/plain');
    echo "Proxy error: $err";
    exit;
}

if ($content_type) {
    header("Content-Type: $content_type");
}
http_response_code($httpcode);
echo $response;
