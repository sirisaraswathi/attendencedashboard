import { useEffect, useState } from "react";
import { getEmployees } from "@/services/employeeService";
import { getTodayAttendance } from "@/services/attendanceService";
import { AttendanceRecord } from "@/services/attendanceService";
import { Employee } from "@/services/employeeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Absentees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absentees, setAbsentees] = useState<Employee[]>([]);

  useEffect(() => {
    async function fetchData() {
      const allEmployees = await getEmployees();
      setEmployees(allEmployees);

      const attendanceData = await getTodayAttendance(await fetchAttendanceData());
      setAttendance(attendanceData);

      // Find absentees: employees not in attendance today
      const presentEmployeeIds = new Set(attendanceData.map((a) => a.employeeId));
      const absentEmployees = allEmployees.filter((emp) => !presentEmployeeIds.has(emp.id));
      setAbsentees(absentEmployees);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground mb-2">Absentees</h1>
        <p className="text-muted-foreground">List of employees absent today</p>
      </div>

      <Card className="shadow-custom border-0">
        <CardHeader>
          <CardTitle>Absent Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absentees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No absentees today
                  </TableCell>
                </TableRow>
              ) : (
                absentees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.rollNo}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.phone}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to fetch attendance data (imported from attendanceService)
async function fetchAttendanceData() {
  const response = await fetch("http://localhost/backend/attendance.php");
  if (!response.ok) throw new Error("Failed to fetch attendance data");
  return response.json();
}
