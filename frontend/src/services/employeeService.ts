import { Employee } from "@/types/employee";

// Re-export the Employee type so it can be imported from this service
export type { Employee };

const API_BASE_URL = "http://10.164.214.52/backend/employees.php";

// === Get all employees ===
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Map DB (snake_case) → frontend (camelCase)
    return data.map((emp: any) => ({
      id: emp.id.toString(),
      name: emp.name,
      rollNo: emp.rollno,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      phone: emp.phone,
      joinDate: emp.joinDate,
      status: emp.status,
      fingerId: emp.finger_id ?? null,
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

// === Get single employee by fingerprint ID ===
export const getEmployee = async (fingerId: string): Promise<Employee | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${fingerId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const emp = await response.json();

    return {
      id: emp.id.toString(),
      name: emp.name,
      rollNo: emp.rollno,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      phone: emp.phone,
      joinDate: emp.joinDate,
      status: emp.status,
      fingerId: emp.finger_id ?? null,
    };
  } catch (error) {
    console.error("Error fetching employee:", error);
    throw error;
  }
};

// === Add employee ===
export const addEmployee = async (
  employee: Omit<Employee, 'id'>
): Promise<{ success: boolean; id?: string; error?: any }> => {
  try {
    // Validate required fields
    if (!employee.name || !employee.rollNo || !employee.department || 
        !employee.position || !employee.email || !employee.phone || 
        !employee.joinDate || !employee.status) {
      return { 
        success: false, 
        error: { message: "All fields are required" } 
      };
    }

    // camelCase → snake_case
    const payload: any = {
      name: employee.name,
      rollno: employee.rollNo,  // Ensure this is not null
      department: employee.department,
      position: employee.position,
      email: employee.email,
      phone: employee.phone,
      joinDate: employee.joinDate,
      status: employee.status,
      // finger_id is omitted since backend sets it to NULL by default
    };

    console.log("addEmployee payload:", payload);

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      return { success: false, error: { status: response.status, body: responseText } };
    }

    return { success: true, id: responseData?.id?.toString() };
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false, error: error };
  }
};

// === Update employee ===
export const updateEmployee = async (
  id: string,
  employee: Partial<Employee>
): Promise<{ success: boolean; error?: any }> => {
  try {
    // Validate required fields
    if (!employee.name || !employee.rollNo || !employee.department || 
        !employee.position || !employee.email || !employee.phone || 
        !employee.joinDate || !employee.status) {
      return { 
        success: false, 
        error: { message: "All fields are required" } 
      };
    }

    // Map camelCase to snake_case for backend
    const payload: any = {
      name: employee.name,
      rollno: employee.rollNo,
      department: employee.department,
      position: employee.position,
      email: employee.email,
      phone: employee.phone,
      joinDate: employee.joinDate,
      status: employee.status,
      finger_id: employee.fingerId ?? null,
    };

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating employee:", error);
    return { success: false, error: error };
  }
};

// === Delete employee ===
export const deleteEmployee = async (id: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false, error: error };
  }
};

// === Get pending enrollments (for ESP32) ===
export const getPendingEnrollments = async (): Promise<Employee[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}?pending=true`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    return data.map((emp: any) => ({
      id: emp.id.toString(),
      name: emp.name,
      rollNo: emp.rollno,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      phone: emp.phone,
      joinDate: emp.joinDate,
      status: emp.status,
      fingerId: emp.finger_id ?? null,
    }));
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    throw error;
  }
};

// === Enroll fingerprint (for ESP32) ===
export const enrollFingerprint = async (
  rollNo: string,
  fingerId: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}?enroll=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rollno: rollNo,
        fingerId: fingerId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error enrolling fingerprint:", error);
    return { success: false, error: error };
  }
};