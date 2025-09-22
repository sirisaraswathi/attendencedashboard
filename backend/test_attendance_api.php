<?php
// Test script for attendance.php API

function sendPostRequest($url, $data) {
    $ch = curl_init($url);
    $payload = json_encode($data);

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['httpcode' => $httpcode, 'response' => $response];
}

$apiUrl = "http://localhost/backend/attendance.php";

// Test cases
$tests = [
    [
        'desc' => 'Present (scan time between 09:20 and 09:45)',
        'data' => ['fingerid' => 'F123', 'scan_time' => '09:30:00'],
    ],
    [
        'desc' => 'Absent (scan time after 09:45 but before 16:25)',
        'data' => ['fingerid' => 'F123', 'scan_time' => '10:00:00'],
    ],
    [
        'desc' => 'Left (scan time after 16:25)',
        'data' => ['fingerid' => 'F123', 'scan_time' => '16:30:00'],
    ],
    [
        'desc' => 'Invalid fingerid',
        'data' => ['fingerid' => 'INVALID', 'scan_time' => '09:30:00'],
    ],
    [
        'desc' => 'Missing fields',
        'data' => ['fingerid' => 'F123'],
    ],
];

foreach ($tests as $test) {
    echo "Test: {$test['desc']}\n";
    $result = sendPostRequest($apiUrl, $test['data']);
    echo "HTTP Code: {$result['httpcode']}\n";
    echo "Response: {$result['response']}\n\n";
}
?>
