import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEmployee: (employee: {
    name: string;
    rollNo: string;
    status: "active" | "inactive";
    email: string;
    position: string;
    phone: string;
    department: string;
  }) => Promise<{ success: boolean }>;
}

export function AddEmployeeDialog({ open, onOpenChange, onAddEmployee }: AddEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    status: "active",
    email: "",
    position: "",
    phone: "",
    department: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    // Validate required fields if needed
    await onAddEmployee({
      name: formData.name,
      rollNo: formData.rollNo,
      status: formData.status as "active" | "inactive",
      email: formData.email,
      position: formData.position,
      phone: formData.phone,
      department: formData.department,
    });
    // ...existing code...
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Add New Employee</span>
          </DialogTitle>
          <DialogDescription>
            Enter employee details to add a new employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
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
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} className="gradient-primary" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
