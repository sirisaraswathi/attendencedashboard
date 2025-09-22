<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "attendance_dashboard";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit();
}

$method  = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id      = $request[0] ?? null;

/* ========================
   ESP32: Get pending enrollments
   ======================== */
if ($method === 'GET' && isset($_GET['pending'])) {
    $result  = $conn->query("SELECT * FROM employees WHERE finger_id IS NULL ORDER BY created_at ASC");
    $pending = [];
    while ($row = $result->fetch_assoc()) {
        $pending[] = $row;
    }
    echo json_encode($pending);
    exit();
}

/* ========================
   ESP32: Update fingerprint ID
   ======================== */
if ($method === 'PUT' && isset($_GET['enroll'])) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data['rollno']) || !isset($data['fingerId'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing rollno or fingerId"]);
        exit();
    }

    $stmt = $conn->prepare("UPDATE employees SET finger_id = ? WHERE rollno = ? AND finger_id IS NULL");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["error" => $conn->error]);
        exit();
    }

    $stmt->bind_param("ss", $data['fingerId'], $data['rollno']);
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Fingerprint enrolled"]);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Employee not found or already enrolled"]);
    }
    $stmt->close();
    exit();
}

/* ========================
   REST API
   ======================== */
switch ($method) {
    case 'GET':
        if ($id) {
            // Get employee by finger_id
            $stmt = $conn->prepare("SELECT * FROM employees WHERE finger_id = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $result   = $stmt->get_result();
            $employee = $result->fetch_assoc();
            if ($employee) {
                echo json_encode($employee);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Employee not found"]);
            }
            $stmt->close();
        } else {
            $result    = $conn->query("SELECT * FROM employees ORDER BY created_at DESC");
            $employees = [];
            while ($row = $result->fetch_assoc()) {
                $employees[] = $row;
            }
            echo json_encode($employees);
        }
        break;

    case 'POST':
    $data = json_decode(file_get_contents("php://input"), true);
    error_log("POST data received: " . print_r($data, true));
    if (!$data) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        break;
    }

        $stmt = $conn->prepare("
            INSERT INTO employees (finger_id, name, rollno, department, position, email, phone, joinDate, status) 
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["error" => $conn->error]);
            break;
        }

        $stmt->bind_param(
            "ssssssss",
            $data['name'],
            $data['rollno'],  // changed to lowercase to match frontend payload
            $data['department'],
            $data['position'],
            $data['email'],
            $data['phone'],
            $data['joinDate'],
            $data['status']
        );

        if ($stmt->execute()) {
            // Return success response with proper HTTP status
            http_response_code(201); // Created
            echo json_encode(["success" => true, "id" => $stmt->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "Missing employee ID"]);
            break;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid JSON"]);
            break;
        }

        $stmt = $conn->prepare("
            UPDATE employees 
            SET finger_id=?, name=?, rollno=?, department=?, position=?, email=?, phone=?, joinDate=?, status=? 
            WHERE id=?
        ");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["error" => $conn->error]);
            break;
        }

        $stmt->bind_param(
            "sssssssssi",
            $data['finger_id'],
            $data['name'],
            $data['rollno'],
            $data['department'],
            $data['position'],
            $data['email'],
            $data['phone'],
            $data['joinDate'],
            $data['status'],
            $id
        );

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "Missing employee ID"]);
            break;
        }

        $stmt = $conn->prepare("DELETE FROM employees WHERE id=?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["error" => $conn->error]);
            break;
        }

        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'OPTIONS':
        http_response_code(200);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;
}

$conn->close();
?>