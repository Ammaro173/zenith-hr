"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Briefcase, FileText, Plane } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ManpowerRequest } from "@/types/requests";
import { orpc } from "@/utils/orpc";
import { RequestInboxDetailView } from "./inbox/request-inbox-detail-view";
import {
  TripInboxDetailView,
  type TripWithRequester,
} from "./inbox/trip-inbox-detail-view";

type InboxItemType = "REQUEST" | "TRIP";

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  subtitle: string;
  createdAt: Date;
  status: string;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  raw: unknown;
}

export function UnifiedInbox() {
  const { data: requestsData, isLoading: requestsLoading } = useQuery(
    orpc.requests.getPendingApprovals.queryOptions(),
  );

  const { data: tripsData, isLoading: tripsLoading } = useQuery(
    orpc.businessTrips.getPendingApprovals.queryOptions(),
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const items: InboxItem[] = [];

    if (requestsData) {
      for (const req of requestsData) {
        const r = req as Record<string, unknown>;
        const pos = r.positionDetails as Record<string, string> | undefined;
        items.push({
          id: `req-${r.id}`,
          type: "REQUEST",
          title: pos?.title || "Manpower Request",
          subtitle: pos?.department || String(r.requestType ?? ""),
          createdAt: new Date(r.createdAt as string),
          status: String(r.status),
          requester: r.requester as InboxItem["requester"],
          raw: req,
        });
      }
    }

    if (tripsData) {
      for (const trip of tripsData) {
        const t = trip as Record<string, unknown>;
        items.push({
          id: `trip-${t.id}`,
          type: "TRIP",
          title: `Trip to ${t.city || "Unknown"}, ${t.country || "Unknown"}`,
          subtitle: String(t.purposeType ?? ""),
          createdAt: new Date(t.createdAt as string),
          status: String(t.status),
          requester: t.requester as InboxItem["requester"],
          raw: trip,
        });
      }
    }

    // Sort newest first
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [requestsData, tripsData]);

  const isLoading = requestsLoading || tripsLoading;
  const selectedItem =
    inboxItems.find((item) => item.id === selectedItemId) || null;

  if (isLoading) {
    return (
      <div className="flex flex-1 overflow-hidden rounded-md border bg-card shadow-xs">
        <div className="flex w-80 flex-col border-r">
          <div className="border-b p-4 font-semibold">Inbox</div>
          <div className="space-y-4 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="mb-6 h-8 w-64" />
          <Skeleton className="mb-4 h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border bg-card shadow-xs">
      {/* Left Sidebar - Master List */}
      <div className="flex w-80 flex-col border-r bg-muted/20">
        <div className="flex items-center justify-between border-b bg-card p-4 text-card-foreground">
          <h2 className="font-semibold tracking-tight">Inbox</h2>
          <Badge className="font-mono text-xs" variant="secondary">
            {inboxItems.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          {inboxItems.length === 0 ? (
            <div className="flex h-full min-h-75 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="mb-4 rounded-full bg-muted p-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="font-medium">No pending approvals.</p>
              <p className="mt-1 text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-1 p-2">
              {inboxItems.map((item) => (
                <button
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg p-3 text-left text-sm ring-offset-background transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                    selectedItemId === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Avatar className="h-6 w-6 shrink-0 border bg-background text-foreground">
                        <AvatarImage src={item.requester?.image || ""} />
                        <AvatarFallback className="text-[10px]">
                          {item.requester?.name
                            ?.substring(0, 2)
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-semibold">
                        {item.requester?.name || "Unknown User"}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-medium text-[10px]",
                        selectedItemId === item.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </span>
                  </div>

                  <div className="w-full pl-[2px]">
                    <div className="mb-1 flex items-center gap-2">
                      {item.type === "REQUEST" ? (
                        <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      ) : (
                        <Plane className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      )}
                      <span className="truncate font-medium">{item.title}</span>
                    </div>
                    <div
                      className={cn(
                        "ml-5.5 truncate text-xs",
                        selectedItemId === item.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Content - Detail View */}
      <div className="flex flex-1 flex-col overflow-hidden bg-card">
        {selectedItem ? (
          <ScrollArea className="h-full flex-1">
            <div className="h-full">
              {selectedItem.type === "REQUEST" ? (
                <RequestInboxDetailView
                  onActionComplete={() => setSelectedItemId(null)}
                  request={selectedItem.raw as ManpowerRequest}
                />
              ) : (
                <TripInboxDetailView
                  onActionComplete={() => setSelectedItemId(null)}
                  trip={selectedItem.raw as TripWithRequester}
                />
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex min-h-100 flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="mb-4 rounded-full bg-muted/50 p-6">
              <Briefcase className="h-8 w-8 opacity-20" />
            </div>
            <h3 className="mb-1 font-medium text-foreground text-lg">
              Select an item to review
            </h3>
            <p className="max-w-xs text-sm">
              Choose a request or trip from the left to view details and take
              action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
