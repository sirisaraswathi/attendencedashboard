-- Create database
CREATE DATABASE IF NOT EXISTS attendance_dashboard;
USE attendance_dashboard;

-- Create attendancepage table
CREATE TABLE IF NOT EXISTS attendancepage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fingerid VARCHAR(50) NOT NULL,
    rollno VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    login_time TIME DEFAULT NULL,
    logout_time TIME DEFAULT NULL,
    status ENUM('present', 'absent', 'left') DEFAULT 'absent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data (optional)
INSERT INTO attendancepage (fingerid, rollno, name, login_time, logout_time, status) VALUES
('F123', 'EMP001', 'John Doe', '09:30:00', NULL, 'present'),
('F124', 'EMP002', 'Jane Smith', '09:50:00', NULL, 'absent'),
('F125', 'EMP003', 'Alice Brown', '09:15:00', '16:30:00', 'left');
