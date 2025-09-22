<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// === DB config ===
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "attendance_dashboard"; // adjust if needed

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!is_array($data) || !isset($data['finger_id']) || !isset($data['rollno']) || !isset($data['name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields (finger_id, rollno, name)"]);
        exit();
    }

    $fingerid = $data['finger_id'];
    $rollno   = $data['rollno'];
    $name     = $data['name'];
    $current_time = date('H:i:s');
    $today    = date('Y-m-d');

    // --- check if record exists for this rollno today ---
    $checkSql = "SELECT id, login_time, logout_time FROM attendancepage WHERE rollno = ? AND DATE(created_at) = ?";
    $checkStmt = $conn->prepare($checkSql);
    if (!$checkStmt) {
        http_response_code(500);
        echo json_encode(["error" => "Prepare failed (check): " . $conn->error]);
        exit();
    }

    if (!$checkStmt->bind_param("ss", $rollno, $today)) {
        http_response_code(500);
        echo json_encode(["error" => "Bind failed (check): " . $checkStmt->error]);
        $checkStmt->close();
        exit();
    }

    if (!$checkStmt->execute()) {
        http_response_code(500);
        echo json_encode(["error" => "Execute failed (check): " . $checkStmt->error]);
        $checkStmt->close();
        exit();
    }

    // 使用更兼容的方式获取结果
    $result = $checkStmt->get_result();
    if ($result === false) {
        // 如果get_result不可用，回退到store_result方式
        $checkStmt->store_result();
        $numRows = $checkStmt->num_rows;
        
        if ($numRows > 0) {
            $checkStmt->bind_result($id, $login_time, $logout_time);
            $checkStmt->fetch();
        }
    } else {
        $numRows = $result->num_rows;
        
        if ($numRows > 0) {
            $row = $result->fetch_assoc();
            $id = $row['id'];
            $login_time = $row['login_time'];
            $logout_time = $row['logout_time'];
        }
    }

    if ($numRows > 0) {
        // update logout_time and status to 'left'
        $updateSql = "UPDATE attendancepage SET logout_time = ?, status = 'left', updated_at = NOW() WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        if (!$updateStmt) {
            http_response_code(500);
            echo json_encode(["error" => "Prepare failed (update): " . $conn->error]);
            $checkStmt->close();
            exit();
        }

        if (!$updateStmt->bind_param("si", $current_time, $id)) {
            http_response_code(500);
            echo json_encode(["error" => "Bind failed (update): " . $updateStmt->error]);
            $updateStmt->close();
            $checkStmt->close();
            exit();
        }

        if ($updateStmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Logout time updated", "id" => $id]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Execute failed (update): " . $updateStmt->error]);
        }

        $updateStmt->close();
    } else {
        // insert new login record with login_time and status 'present'
        $insertSql = "INSERT INTO attendancepage (finger_id, rollno, name, login_time, status) VALUES (?, ?, ?, ?, 'present')";
        $insertStmt = $conn->prepare($insertSql);
        if (!$insertStmt) {
            http_response_code(500);
            echo json_encode(["error" => "Prepare failed (insert): " . $conn->error]);
            $checkStmt->close();
            exit();
        }

        if (!$insertStmt->bind_param("ssss", $fingerid, $rollno, $name, $current_time)) {
            http_response_code(500);
            echo json_encode(["error" => "Bind failed (insert): " . $insertStmt->error]);
            $insertStmt->close();
            $checkStmt->close();
            exit();
        }

        if ($insertStmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Login recorded", "id" => $insertStmt->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Execute failed (insert): " . $insertStmt->error]);
        }

        $insertStmt->close();
    }

    $checkStmt->close();

} elseif ($method === 'GET') {
    // Optionally support filters: ?rollno=... & ?date=YYYY-MM-DD
    $params = [];
    $sql = "SELECT id, finger_id, rollno, name, login_time, logout_time, status, created_at, updated_at FROM attendancepage";
    $where = [];

    if (isset($_GET['rollno']) && $_GET['rollno'] !== '') {
        $where[] = "rollno = ?";
        $params[] = $_GET['rollno'];
    }
    if (isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date'])) {
        $where[] = "DATE(created_at) = ?";
        $params[] = $_GET['date'];
    }

    if (count($where) > 0) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY created_at DESC";

    if (count($params) === 0) {
        // simple query
        $res = $conn->query($sql);
        if ($res === false) {
            http_response_code(500);
            echo json_encode(["error" => "Query failed: " . $conn->error]);
            exit();
        }
        $rows = [];
        while ($r = $res->fetch_assoc()) {
            $rows[] = $r;
        }
        echo json_encode($rows, JSON_PRETTY_PRINT);
    } else {
        // prepared query with filters
        $types = str_repeat("s", count($params));
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["error" => "Prepare failed (GET filter): " . $conn->error]);
            exit();
        }
        
        // 动态绑定参数
        $bindParams = [$stmt, "bind_param", $types];
        foreach ($params as $param) {
            $bindParams[] = &$param;
        }
        call_user_func_array("mysqli_stmt_bind_param", $bindParams);

        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(["error" => "Execute failed (GET filter): " . $stmt->error]);
            $stmt->close();
            exit();
        }
        
        // 获取结果
        $result = $stmt->get_result();
        if ($result === false) {
            // 回退到store_result方式
            $stmt->store_result();
            $meta = $stmt->result_metadata();
            $fields = [];
            $row = [];
            while ($field = $meta->fetch_field()) {
                $fields[] = &$row[$field->name];
            }
            call_user_func_array([$stmt, 'bind_result'], $fields);
            $rows = [];
            while ($stmt->fetch()) {
                $tmp = [];
                foreach ($row as $k => $v) {
                    $tmp[$k] = $v;
                }
                $rows[] = $tmp;
            }
            echo json_encode($rows, JSON_PRETTY_PRINT);
        } else {
            $rows = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode($rows, JSON_PRETTY_PRINT);
        }
        $stmt->close();
    }

} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>