  import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { AttendanceRecord } from "@/services/attendanceService";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  timeWindows: {
    loginStartTime: string;
    loginEndTime: string;
    logoutStartTime: string;
    logoutEndTime: string;
  };
  title?: string;
}

function getStatusBadge(status: "intime" | "late" | "absent" | "left on time" | "left early") {
  const variants = {
    intime: { variant: "default" as const, className: "bg-success text-success-foreground" },
    late: { variant: "secondary" as const, className: "bg-warning text-warning-foreground" },
    absent: { variant: "destructive" as const, className: "" },
    "left on time": { variant: "default" as const, className: "bg-success text-success-foreground" },
    "left early": { variant: "secondary" as const, className: "bg-warning text-warning-foreground" },
  };

  const labels = {
    intime: "In Time",
    late: "Late",
    absent: "Absent",
    "left on time": "Left On Time",
    "left early": "Left Early",
  };

  return (
    <Badge variant={variants[status].variant} className={variants[status].className}>
      {labels[status]}
    </Badge>
  );
}

function formatTime(timeString?: string) {
  if (!timeString) return "-";
  try {
    return format(new Date(timeString), "hh:mm a");
  } catch {
    return timeString;
  }
}

export function AttendanceTable({ records, timeWindows, title = "Today's Attendance" }: AttendanceTableProps) {
  // Helper to convert "HH:mm" to minutes since midnight
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const loginStartMinutes = toMinutes(timeWindows.loginStartTime);
  const loginEndMinutes = toMinutes(timeWindows.loginEndTime);
  const logoutStartMinutes = toMinutes(timeWindows.logoutStartTime);
  const logoutEndMinutes = toMinutes(timeWindows.logoutEndTime);

  // Calculate status dynamically based on login/logout times and time windows
  const calculateStatus = (record: AttendanceRecord) => {
    const loginTimeMinutes = record.loginTime ? toMinutes(record.loginTime) : null;
    const logoutTimeMinutes = record.logoutTime ? toMinutes(record.logoutTime) : null;

    if (loginTimeMinutes !== null && loginTimeMinutes >= loginStartMinutes && loginTimeMinutes <= loginEndMinutes) {
      return "present";
    } else if (logoutTimeMinutes !== null && logoutTimeMinutes >= logoutStartMinutes && logoutTimeMinutes <= logoutEndMinutes) {
      return "left";
    } else {
      return "absent";
    }
  };

  return (
    <Card className="gradient-card shadow-custom border-0 animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Login Time</TableHead>
            <TableHead className="font-semibold">Login Status</TableHead>
            <TableHead className="font-semibold">Logout Time</TableHead>
            <TableHead className="font-semibold">Logout Status</TableHead>
            <TableHead className="font-semibold">Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No attendance records found for today
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => {
              // Helper to convert "HH:mm" to minutes since midnight
              const toMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(":").map(Number);
                return h * 60 + m;
              };

              const loginStartMinutes = toMinutes(timeWindows.loginStartTime);
              const loginEndMinutes = toMinutes(timeWindows.loginEndTime);
              const logoutStartMinutes = toMinutes(timeWindows.logoutStartTime);
              const logoutEndMinutes = toMinutes(timeWindows.logoutEndTime);

              const loginTimeMinutes = record.loginTime ? toMinutes(record.loginTime) : null;
              const logoutTimeMinutes = record.logoutTime ? toMinutes(record.logoutTime) : null;

              const loginStatus =
                loginTimeMinutes !== null && loginTimeMinutes >= loginStartMinutes && loginTimeMinutes <= loginEndMinutes
                  ? "intime"
                  : "late";

              const logoutStatus =
                logoutTimeMinutes !== null && logoutTimeMinutes >= logoutStartMinutes && logoutTimeMinutes <= logoutEndMinutes
                  ? "left on time"
                  : "left early";

              return (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell className="text-muted-foreground">{record.employeeId}</TableCell>
                  <TableCell>{formatTime(record.loginTime)}</TableCell>
                  <TableCell>{getStatusBadge(loginStatus)}</TableCell>
                  <TableCell>{formatTime(record.logoutTime)}</TableCell>
                  <TableCell>{record.logoutTime ? getStatusBadge(logoutStatus) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {record.method}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export type { AttendanceRecord };
