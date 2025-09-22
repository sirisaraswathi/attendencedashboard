import { useState, useEffect } from "react";
import { fetchAttendanceData, getTodayAttendance, AttendanceRecord } from "@/services/attendanceService";
import { AttendanceTable, AttendanceRecord as AttendanceRecordType } from "@/components/dashboard/AttendanceTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { useSettings } from "@/context/SettingsContext";

export default function Dashboard() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  // Load real-time data
  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await fetchAttendanceData();
      setAttendanceData(data);
    } catch (error) {
      console.error("Error loading attendance data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate summary data
  const todayData = getTodayAttendance(attendanceData);
  const summaryData = {
    totalEmployees: todayData.length,
    presentToday: todayData.filter(r => r.status === "intime").length,
    absentToday: todayData.filter(r => r.status === "absent").length,
    lateToday: todayData.filter(r => r.status === "late").length,
  };

  const chartData = {
    present: todayData.filter(r => r.status === "intime").length,
    late: todayData.filter(r => r.status === "late").length,
    absent: todayData.filter(r => r.status === "absent").length,
  };

  // Real-time data updates
  useEffect(() => {
    loadAttendanceData();
    
    const interval = setInterval(() => {
      loadAttendanceData();
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time attendance monitoring and analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="animate-scale-in">
        <SummaryCards data={summaryData} />
      </div>

      {/* Charts and Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Chart */}
        <div className="lg:col-span-1 animate-fade-in">
          <AttendanceChart data={chartData} />
        </div>

        {/* Today's Attendance Table */}
        <div className="lg:col-span-2 animate-slide-up">
          <AttendanceTable records={todayData} timeWindows={settings} />
        </div>
      </div>
    </div>
  );
}
