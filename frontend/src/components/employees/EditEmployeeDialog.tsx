import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Employee } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onUpdateSuccess: () => void;
  onEditEmployee: (id: string, employee: Partial<Employee>) => Promise<{ success: boolean }>;
}

export function EditEmployeeDialog({ open, onOpenChange, employee, onUpdateSuccess, onEditEmployee }: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    fingerId: "",
    status: "active",
    email: "",
    position: "",
    phone: "",
    department: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        rollNo: employee.rollNo,
        fingerId: employee.fingerId || "",
        status: employee.status,
        email: employee.email || "",
        position: employee.position || "",
        phone: employee.phone || "",
        department: employee.department || "",
      });
    }
  }, [employee]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      // Only use camelCase keys here
      const updateData: Partial<Employee> = {
        name: formData.name,
        rollNo: formData.rollNo,
        fingerId: formData.fingerId, // keep camelCase
        joinDate: employee.joinDate, // ensure joinDate is sent
        status: formData.status as "active" | "inactive",
        email: formData.email,
        position: formData.position,
        phone: formData.phone,
        department: formData.department,
      };

      const result = await onEditEmployee(employee.id, updateData);
      if (result?.success) {
        toast({
          title: "Success",
          description: "Employee updated successfully.",
        });
        onUpdateSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update employee.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="edit-employee-description">
      <DialogHeader>
        <DialogTitle>Edit Employee</DialogTitle>
        <DialogDescription id="edit-employee-description">
          Update the details of the employee below.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rollNo">Roll Number</Label>
          <Input
            id="rollNo"
            value={formData.rollNo}
            onChange={(e) => handleChange("rollNo", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => handleChange("position", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleChange("department", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="fingerId">Finger ID</Label>
          <Input
            id="fingerId"
            value={formData.fingerId}
            onChange={(e) => handleChange("fingerId", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={isSaving} className="gradient-primary">
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}
