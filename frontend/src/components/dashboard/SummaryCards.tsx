import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "destructive";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function SummaryCard({ title, value, icon: Icon, color, trend }: SummaryCardProps) {
  const colorClasses = {
    primary: "gradient-primary text-primary-foreground",
    success: "gradient-success text-success-foreground",
    warning: "gradient-warning text-warning-foreground", 
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <Card className="gradient-card shadow-custom border-0 animate-scale-in hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${colorClasses[color]} hover:scale-110 transition-all duration-200`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-foreground hover:scale-105 transition-all duration-200 cursor-default">{value}</div>
          {trend && (
            <div
              className={`text-xs flex items-center animate-bounce-gentle ${
                trend.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryCardsProps {
  data: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  };
  onAbsentClick?: () => void;
}

export function SummaryCards({ data, onAbsentClick }: SummaryCardsProps) {
  const { totalEmployees, presentToday, absentToday, lateToday } = data;

  const cards = [
    {
      title: "Total Employees",
      value: totalEmployees,
      icon: Users,
      color: "primary" as const,
    },
    {
      title: "Present Today",
      value: presentToday,
      icon: UserCheck,
      color: "success" as const,
      trend: { value: 5, isPositive: true },
    },
    {
      title: "Absent Today",
      value: absentToday,
      icon: UserX,
      color: "destructive" as const,
      trend: { value: -2, isPositive: true },
      onClick: onAbsentClick,
    },
    {
      title: "Late Today",
      value: lateToday,
      icon: Clock,
      color: "warning" as const,
      trend: { value: -1, isPositive: true },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
      {cards.map((card, index) => (
        <SummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
}
