"use client";

import { useEffect, useState } from "react";

export function DashboardHeader() {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <div className="flex items-center text-muted-foreground">
          {currentDate}
        </div>
      </div>
    </div>
  );
}
