export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  rollNo: string;
  loginTime?: string;
  logoutTime?: string;
  status?: "intime" | "left on time" | "left early" | "late" | "absent";
  loginStatus?: "intime" | "late";
  logoutStatus?: "left early" | "left on time";
  method: "fingerprint" | "manual";
  date: string;
}

const BACKEND_ATTENDANCE_API = "http://10.164.214.52/backend/attendance.php";

export const fetchAttendanceData = async (date?: string): Promise<AttendanceRecord[]> => {
  try {
    let url = BACKEND_ATTENDANCE_API;
    if (date) {
      url += `?date=${date}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const attendanceRecords = await response.json();

    const data: AttendanceRecord[] = attendanceRecords.map((record: any) => {
      const recordDate = new Date(record.created_at);

      // Helper function to convert time string to minutes since midnight
      const timeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      // Default time windows (will be overridden by settings if available)
      const defaultLoginStartTime = "09:00";
      const defaultLoginEndTime = "09:30";

      // Determine login status based on time windows
      let loginStatus: "intime" | "late" = "intime";
      if (record.login_time) {
        const loginMinutes = timeToMinutes(record.login_time);
        const startMinutes = timeToMinutes(defaultLoginStartTime);
        const endMinutes = timeToMinutes(defaultLoginEndTime);

        if (loginMinutes > endMinutes) {
          loginStatus = "late";
        }
      }

      // Map backend status to frontend expected status
      let mappedStatus: "intime" | "late" | "absent" = "absent";
      if (record.status === "present") {
        mappedStatus = loginStatus; // Use the calculated login status
      } else if (record.status === "left") {
        mappedStatus = "intime"; // Consider logged out employees as present for the day
      }

      return {
        id: record.id.toString(),
        employeeId: record.finger_id ?? record.rollno,
        name: record.name,
        rollNo: record.rollno,
        loginTime: record.login_time,
        logoutTime: record.logout_time,
        status: mappedStatus,
        loginStatus: loginStatus,
        method: "fingerprint" as const,
        date: recordDate.toISOString().split('T')[0]
      };
    });

    return data;
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return [];
  }
};

export const getTodayAttendance = (records: AttendanceRecord[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return records.filter(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });
};