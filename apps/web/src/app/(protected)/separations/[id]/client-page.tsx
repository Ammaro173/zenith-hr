"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CheckCircle,
  Download,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClearanceBoard } from "@/features/separations";
import { client, orpc } from "@/utils/orpc";

const TYPE_LABELS: Record<string, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  END_OF_CONTRACT: "End of Contract",
};

export function SeparationDetailClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const {
    data: separation,
    isLoading,
    isError,
    error,
  } = useQuery(
    orpc.separations.get.queryOptions({
      input: { separationId: params.id },
    }),
  );

  const approveByManager = useMutation(
    orpc.separations.approveByManager.mutationOptions({
      onSuccess: () => {
        toast.success("Approved");
        setComment("");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const rejectByManager = useMutation(
    orpc.separations.rejectByManager.mutationOptions({
      onSuccess: () => {
        toast.success("Rejected");
        setComment("");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const approveByHr = useMutation(
    orpc.separations.approveByHr.mutationOptions({
      onSuccess: () => {
        toast.success("Clearance started");
        setComment("");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const rejectByHr = useMutation(
    orpc.separations.rejectByHr.mutationOptions({
      onSuccess: () => {
        toast.success("Rejected");
        setComment("");
        queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="p-6 text-destructive">
        {error?.message ?? "Could not load separation."}
      </div>
    );
  }

  if (!separation) {
    return <div className="p-6">Not found</div>;
  }

  const { viewer } = separation;
  const showManagerApprovalCard = viewer.canApproveAsManager;
  const showHrApprovalCard = viewer.canApproveAsHr || viewer.canRejectAsHr;

  const isPending =
    approveByManager.isPending ||
    rejectByManager.isPending ||
    approveByHr.isPending ||
    rejectByHr.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button onClick={() => router.back()} variant="outline">
          Back
        </Button>
        <div>
          <h1 className="font-bold text-2xl">Separation</h1>
          <p className="text-muted-foreground">
            {separation.employee.name} • Last day: {separation.lastWorkingDay}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline">{separation.status}</Badge>
        </div>
      </div>

      {/* Request Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground text-sm">
                Type
              </dt>
              <dd className="mt-1">
                {TYPE_LABELS[separation.type] ?? separation.type}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground text-sm">
                Last Working Day
              </dt>
              <dd className="mt-1">{separation.lastWorkingDay}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground text-sm">
                Notice Period Waived
              </dt>
              <dd className="mt-1">
                <Badge
                  variant={
                    separation.noticePeriodWaived ? "default" : "secondary"
                  }
                >
                  {separation.noticePeriodWaived ? "Yes" : "No"}
                </Badge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground text-sm">
                Reason
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{separation.reason}</dd>
            </div>
          </dl>

          {/* Attached Documents */}
          {separation.documents && separation.documents.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-3 font-medium text-sm">Attached Documents</h4>
              <div className="flex flex-col gap-2">
                {separation.documents.map((doc) => (
                  <DocumentDownloadButton doc={doc} key={doc.id} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending status info */}
      {["REQUESTED", "PENDING_MANAGER", "PENDING_HR"].includes(
        separation.status,
      ) &&
        !showManagerApprovalCard &&
        !showHrApprovalCard && (
          <Card>
            <CardHeader>
              <CardTitle>Request Status: Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This separation request is currently pending necessary
                approvals. The clearance checklist will be generated and
                displayed here once it has been fully approved by HR.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Manager Approval Card */}
      {showManagerApprovalCard ? (
        <Card>
          <CardHeader>
            <CardTitle>Manager Approval Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                className="mb-1.5 block font-medium text-sm"
                htmlFor="manager-notes"
              >
                Notes
              </label>
              <Textarea
                id="manager-notes"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add notes or comments..."
                rows={3}
                value={comment}
              />
            </div>
            <div className="flex gap-3">
              <Button
                disabled={isPending}
                onClick={() =>
                  approveByManager.mutate({
                    separationId: separation.id,
                    comment: comment || undefined,
                  })
                }
              >
                {approveByManager.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                disabled={isPending || comment.trim().length < 5}
                onClick={() =>
                  rejectByManager.mutate({
                    separationId: separation.id,
                    comment,
                  })
                }
                variant="destructive"
              >
                {rejectByManager.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
            {comment.trim().length > 0 && comment.trim().length < 5 && (
              <p className="text-destructive text-xs">
                Notes must be at least 5 characters to reject.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* HR Approval Card */}
      {showHrApprovalCard ? (
        <Card>
          <CardHeader>
            <CardTitle>HR Approval Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                className="mb-1.5 block font-medium text-sm"
                htmlFor="hr-notes"
              >
                Notes
              </label>
              <Textarea
                id="hr-notes"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add notes or comments..."
                rows={3}
                value={comment}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {viewer.canApproveAsHr ? (
                <Button
                  disabled={isPending}
                  onClick={() =>
                    approveByHr.mutate({
                      separationId: separation.id,
                      comment: comment || undefined,
                    })
                  }
                >
                  {approveByHr.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Approve & Start Clearance
                </Button>
              ) : null}
              {viewer.canRejectAsHr ? (
                <Button
                  disabled={isPending || comment.trim().length < 5}
                  onClick={() =>
                    rejectByHr.mutate({
                      separationId: separation.id,
                      comment,
                    })
                  }
                  variant="destructive"
                >
                  {rejectByHr.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
              ) : null}
            </div>
            {viewer.canRejectAsHr &&
            comment.trim().length > 0 &&
            comment.trim().length < 5 ? (
              <p className="text-destructive text-xs">
                Notes must be at least 5 characters to reject.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {["CLEARANCE_IN_PROGRESS", "COMPLETED"].includes(separation.status) ? (
        <ClearanceBoard separation={separation} />
      ) : null}
    </div>
  );
}

function DocumentDownloadButton({
  doc,
}: {
  doc: { id: string; fileName: string; kind: string };
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { url } = await client.separations.getDocumentDownloadUrl({
        documentId: doc.id,
      });
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to download document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
      disabled={loading}
      onClick={handleDownload}
      type="button"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{doc.fileName}</span>
      <Badge className="text-[10px]" variant="outline">
        {doc.kind.replaceAll("_", " ")}
      </Badge>
      <Download className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
