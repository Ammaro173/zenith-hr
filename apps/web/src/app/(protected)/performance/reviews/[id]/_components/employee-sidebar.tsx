import { format } from "date-fns";
import { Calendar, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Employee {
  createdAt?: Date | string;
  email: string;
  id: string;
  image: string | null;
  name: string | null;
  role?: string | null;
}

interface EmployeeSidebarProps {
  employee: Employee;
}

export function EmployeeSidebar({ employee }: EmployeeSidebarProps) {
  const initials = employee.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="size-20">
            <AvatarImage
              alt={employee.name || "Employee"}
              src={employee.image || undefined}
            />
            <AvatarFallback className="text-lg">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">
              {employee.name || "Unknown"}
            </CardTitle>
            {employee.role && (
              <Badge className="mt-2" variant="secondary">
                {employee.role}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <User className="size-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground text-xs">Employee ID</p>
            <p className="font-mono text-xs">
              {employee.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Mail className="size-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="truncate text-xs">{employee.email}</p>
          </div>
        </div>

        {employee.createdAt && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Joined</p>
              <p className="text-xs">
                {format(new Date(employee.createdAt), "MMM yyyy")}
              </p>
            </div>
          </div>
        )}

        {/* TODO: Add past reviews section when data is available */}
        {/* <Separator className="my-4" />
        <div>
          <h4 className="mb-2 font-semibold text-sm">Past Reviews</h4>
          ...
        </div> */}
      </CardContent>
    </Card>
  );
}
