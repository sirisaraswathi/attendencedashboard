export interface Employee {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  joinDate: string;
  status: "active" | "inactive";
  fingerId?: string | null;
}
