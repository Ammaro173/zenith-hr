"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RequestsPieChartProps {
  approved: number;
  hiring: number;
  pending: number;
}

export function RequestsPieChart({
  pending,
  approved,
  hiring,
}: RequestsPieChartProps) {
  const data = [
    { name: "Pending", value: pending, color: "#f59e0b" }, // Amber
    { name: "Approved", value: approved, color: "#10b981" }, // Emerald
    { name: "Hiring", value: hiring, color: "#3b82f6" }, // Blue
  ];

  // Filter out zero values for better visual presentation, unless all are zero
  const displayData = data.filter((d) => d.value > 0);
  const chartData =
    displayData.length > 0
      ? displayData
      : [{ name: "No Data", value: 1, color: "#e5e7eb" }];

  return (
    <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80">
      <CardHeader>
        <CardTitle className="font-medium text-lg">Requests Overview</CardTitle>
        <CardDescription>
          Current status distribution of manpower requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-62.5 w-full">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-out"
                cx="50%"
                cy="50%"
                data={chartData}
                dataKey="value"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    fill={entry.color}
                    key={`cell-${index}`}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: "#374151" }}
              />
              <Legend height={36} iconType="circle" verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
