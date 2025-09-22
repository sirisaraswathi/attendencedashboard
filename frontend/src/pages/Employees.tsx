import { useToast } from "@/hooks/use-toast";
import { EmployeeManagement } from "@/components/employees/EmployeeManagement";
import {
  Employee,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/services/employeeService";
import { useEffect, useState } from "react";

// Helper to get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

// Fetch today's attendance records
const getTodaysAttendance = async () => {
  const today = getToday();
  const response = await fetch(`http://localhost/backend/attendance.php?date=${today}`);
  if (!response.ok) return [];
  return await response.json();
};

export default function Employees() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [presentToday, setPresentToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);

      // Fetch today's attendance and calculate present/absent
      const attendance = await getTodaysAttendance();
      const presentCount = attendance.filter(
        (a: any) => a.status === "present" || a.status === "left"
      ).length;
      setPresentToday(presentCount);
      setAbsentToday(data.length - presentCount);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load employees.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployee = async (employee: {
    name: string;
    rollNo: string;
    status: "active" | "inactive";
    email: string;
    position: string;
    phone: string;
    department: string;
  }) => {
    // Validate required fields
    if (!employee.rollNo?.trim()) {
      toast({
        title: "Error",
        description: "Roll number is required.",
        variant: "destructive",
      });
      return { success: false };
    }

    // Create new employee object with all required fields
    const newEmployee: Omit<Employee, 'id'> = {
      name: employee.name,
      rollNo: employee.rollNo,
      department: employee.department,
      position: employee.position,
      email: employee.email,
      phone: employee.phone,
      joinDate: getToday(), // Format as YYYY-MM-DD
      status: employee.status,
      fingerId: null,
    };

    try {
      const result = await addEmployee(newEmployee);
      if (result.success) {
        toast({
          title: "Success",
          description: "Employee added successfully.",
        });
        await loadEmployees();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to add employee.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add employee.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const handleEditEmployee = async (
    id: string,
    updates: Partial<Employee>
  ) => {
    // Validate rollNo if it's being updated
    if (updates.rollNo !== undefined && !updates.rollNo?.trim()) {
      toast({
        title: "Error",
        description: "Roll number is required.",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const result = await updateEmployee(id, updates);
      if (result.success) {
        toast({
          title: "Success",
          description: "Employee updated successfully.",
        });
        await loadEmployees();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: "Failed to update employee.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const result = await deleteEmployee(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Employee deleted successfully.",
        });
        await loadEmployees();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: "Failed to delete employee.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete employee.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  return (
    <EmployeeManagement
      employees={employees}
      onAddEmployee={handleAddEmployee}
      onEditEmployee={handleEditEmployee}
      onDeleteEmployee={handleDeleteEmployee}
      presentToday={presentToday}
      absentToday={absentToday}
      totalEmployees={employees.length}
    />
  );
}