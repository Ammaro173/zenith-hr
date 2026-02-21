"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Globe, Loader2, Monitor, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { client } from "@/utils/orpc";

interface UserSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

interface SessionsTableProps {
  sessions: UserSession[];
  isPending: boolean;
  onRevokeSession: (sessionId: string) => void;
}

function SessionsTable({
  sessions,
  isPending,
  onRevokeSession,
}: SessionsTableProps) {
  return (
    <div className="max-h-100 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>IP Address</TableHead>
            <TableHead>User Agent</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {session.ipAddress || "Unknown"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Monitor className="size-4 text-muted-foreground" />
                  <span
                    className="max-w-[200px] truncate text-sm"
                    title={session.userAgent || "Unknown"}
                  >
                    {session.userAgent || "Unknown"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(session.createdAt), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(session.expiresAt), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                <Button
                  disabled={isPending}
                  onClick={() => onRevokeSession(session.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                  <span className="sr-only">Revoke session</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface SessionsContentProps {
  sessions: UserSession[] | undefined;
  isLoading: boolean;
  isPending: boolean;
  onRevokeSession: (sessionId: string) => void;
}

function SessionsContent({
  sessions,
  isLoading,
  isPending,
  onRevokeSession,
}: SessionsContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No active sessions found for this user.
      </div>
    );
  }

  return (
    <SessionsTable
      isPending={isPending}
      onRevokeSession={onRevokeSession}
      sessions={sessions}
    />
  );
}

interface UserSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function UserSessionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: UserSessionsDialogProps) {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["users", userId, "sessions"],
    queryFn: () => client.users.getSessions({ userId }),
    enabled: open && !!userId,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      client.users.revokeSession({ sessionId }),
    onSuccess: () => {
      toast.success("Session revoked successfully");
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });

  const revokeAllSessionsMutation = useMutation({
    mutationFn: () => client.users.revokeAllSessions({ userId }),
    onSuccess: () => {
      toast.success("All sessions revoked successfully");
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke all sessions");
    },
  });

  const handleRevokeSession = (sessionId: string) => {
    revokeSessionMutation.mutate(sessionId);
  };

  const handleRevokeAllSessions = () => {
    revokeAllSessionsMutation.mutate();
  };

  const isPending =
    revokeSessionMutation.isPending || revokeAllSessionsMutation.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            View and manage active sessions for{" "}
            <span className="font-semibold text-foreground">{userName}</span>.
          </DialogDescription>
        </DialogHeader>

        <SessionsContent
          isLoading={isLoading}
          isPending={isPending}
          onRevokeSession={handleRevokeSession}
          sessions={sessions}
        />

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Close
          </Button>
          {sessions && sessions.length > 0 && (
            <Button
              disabled={isPending}
              onClick={handleRevokeAllSessions}
              type="button"
              variant="destructive"
            >
              {revokeAllSessionsMutation.isPending
                ? "Revoking..."
                : "Revoke All Sessions"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
