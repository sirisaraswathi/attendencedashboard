# Attendance Dashboard Backend

This backend provides REST API endpoints for managing employees and attendance data using PHP and MySQL.

## Setup Instructions

### Prerequisites
- XAMPP (Apache, MySQL, PHP)
- PHP 7.4 or higher
- MySQL 5.7 or higher

### Installation Steps

1. **Start XAMPP**
   - Start Apache and MySQL services from XAMPP Control Panel

2. **Database Setup**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Create a new database named `attendance_dashboard`
   - Import the `database.sql` file to create tables and sample data

3. **Backend Files**
   - Place all PHP files in your XAMPP htdocs directory (e.g., `C:\xampp\htdocs\backend\`)
   - Ensure the files are accessible at `http://localhost/backend/`

4. **Configuration**
   - Update database credentials in `employees.php` if needed:
     ```php
     $servername = "localhost";
     $username = "root";
     $password = "";
     $dbname = "attendance_dashboard";
     ```

## API Endpoints

### Employees API (`employees.php`)

#### GET /backend/employees.php
- Get all employees
- Response: JSON array of employee objects

#### GET /backend/employees.php/{id}
- Get a specific employee by ID
- Response: JSON employee object

#### POST /backend/employees.php
- Add a new employee
- Body: JSON with employee data
- Required fields: name, rollNo, status
- Optional fields: department, position, email, phone, joinDate

#### PUT /backend/employees.php/{id}
- Update an existing employee
- Body: JSON with updated employee data

#### DELETE /backend/employees.php/{id}
- Delete an employee by ID

### Attendance API (`attendance.php`)

#### GET /backend/attendance.php
- Get all attendance records
- Response: JSON array of attendance objects

#### POST /backend/attendance.php
- Record attendance
- Body: JSON with attendance data

## Testing

### Test Employee API
```bash
# Get all employees
curl http://localhost/backend/employees.php

# Add new employee
curl -X POST http://localhost/backend/employees.php \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","rollNo":"EMP001","status":"active"}'
```

### Frontend Integration
- The React frontend will automatically connect to these APIs
- Ensure the frontend is running on a different port (default: 5173)
- CORS is enabled for local development

## Troubleshooting

1. **CORS Issues**: Ensure CORS headers are present in PHP files
2. **Database Connection**: Verify MySQL is running and credentials are correct
3. **File Permissions**: Ensure PHP files have proper read permissions
4. **Port Conflicts**: Make sure Apache is running on port 80

## Security Notes

- This setup is for development only
- In production, implement proper authentication and authorization
- Use HTTPS in production
- Validate and sanitize all input data
- Use prepared statements (already implemented) to prevent SQL injection
