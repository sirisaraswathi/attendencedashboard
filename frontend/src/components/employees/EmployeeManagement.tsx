import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,/////////
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { Employee } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";

interface EmployeeManagementProps {
  employees: Employee[];
  onAddEmployee: (
    employee: {
      name: string;
      rollNo: string;
      status: "active" | "inactive";
      email: string;
      position: string;
      phone: string;
      department: string;
    }
  ) => Promise<{ success: boolean }>;
  onEditEmployee: (...args: any[]) => Promise<{ success: boolean }>;
  onDeleteEmployee: (...args: any[]) => Promise<{ success: boolean }>;
  presentToday: number;
  absentToday: number;
  totalEmployees: number;
}

export function EmployeeManagement({
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  presentToday,
  absentToday,
  totalEmployees,
}: EmployeeManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      onDeleteEmployee(id);
      toast({
        title: "Success",
        description: "Employee deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="flex space-x-6 mb-4">
        <Card>
          <CardContent>
            <div>Total Employees: <b>{totalEmployees}</b></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div>Present Today: <b>{presentToday}</b></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div>Absent Today: <b>{absentToday}</b></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Employee Management</span>
            <Button onClick={() => setShowAddDialog(true)} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Fingerprint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="font-medium">{employee.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.rollNo}</TableCell>
                      <TableCell>{employee.id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.status === "active" ? "default" : "secondary"}
                          className={
                            employee.status === "active"
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingEmployee(employee);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
      </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddEmployee={async (employee) => {
          const result = await onAddEmployee(employee);
          if (result.success) {
            setShowAddDialog(false);
          }
          // Optionally, handle error feedback here
          return result;
        }}
      />

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        employee={editingEmployee}
        onUpdateSuccess={() => {
          setShowEditDialog(false);
          setEditingEmployee(null);
        }}
        onEditEmployee={onEditEmployee}
      />
    </div>
  );
}

export type { Employee };
