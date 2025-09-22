import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceChartProps {
  data: {
    present: number;
    absent: number;
    late: number;
  };
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = [
    { name: "Present", value: data.present, color: "hsl(var(--success))" },
    { name: "Late", value: data.late, color: "hsl(var(--warning))" },
    { name: "Absent", value: data.absent, color: "hsl(var(--destructive))" },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-semibold text-foreground">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="gradient-card shadow-custom border-0 animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Today's Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '14px' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}