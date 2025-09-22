# TODO: Replace Firebase with XAMPP Backend

## Backend Setup
- [x] Create backend directory structure
- [x] Create MySQL database schema for employees table
- [x] Create PHP API endpoints (GET, POST, PUT, DELETE for employees)
- [x] Add CORS headers for local development

## Frontend Updates
- [x] Rewrite employeeService.ts to use PHP API calls
- [x] Update AddEmployeeDialog.tsx to use new employeeService
- [x] Update EmployeeManagement.tsx to fetch from PHP backend
- [x] Remove Firebase dependencies from components

## Attendance Data Integration
- [x] Add GET endpoint to attendance.php for fetching today's attendance records
- [x] Update attendanceService.ts to fetch data from backend API instead of Google Sheets
- [x] Map backend response to AttendanceRecord interface
- [x] Test dashboard updates with live data from XAMPP database

## Testing & Integration
- [ ] Test PHP API endpoints
- [ ] Test frontend-backend integration
- [ ] Verify error handling and data validation
- [ ] Update Vite config for proxy if needed
- [x] Implement ESP32 fingerprint enrollment workflow
