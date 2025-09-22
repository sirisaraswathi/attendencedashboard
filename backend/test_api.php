<?php
header("Content-Type: application/json");

// Test database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "attendance_dashboard";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit();
}

// Test employees table
$result = $conn->query("SELECT COUNT(*) as count FROM employees");
$employeeCount = $result->fetch_assoc()['count'];

// Test attendancepage table
$result = $conn->query("SELECT COUNT(*) as count FROM attendancepage");
$attendanceCount = $result->fetch_assoc()['count'];

$conn->close();

echo json_encode([
    "status" => "success",
    "message" => "API test completed successfully",
    "data" => [
        "database_connected" => true,
        "employees_count" => $employeeCount,
        "attendance_count" => $attendanceCount,
        "timestamp" => date('Y-m-d H:i:s')
    ]
]);
?>
