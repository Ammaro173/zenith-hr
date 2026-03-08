import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalDetailActionFooterProps {
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestChange: () => void;
}

export function ApprovalDetailActionFooter({
  disabled = false,
  onApprove,
  onReject,
  onRequestChange,
}: ApprovalDetailActionFooterProps) {
  return (
    <div className="shrink-0 border-t bg-card px-6 py-3">
      <div className="flex items-center justify-end gap-3">
        <Button
          disabled={disabled}
          onClick={onRequestChange}
          size="sm"
          variant="outline"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Request Change
        </Button>
        <Button
          disabled={disabled}
          onClick={onReject}
          size="sm"
          variant="destructive"
        >
          <X className="mr-2 h-3.5 w-3.5" />
          Reject
        </Button>
        <Button disabled={disabled} onClick={onApprove} size="sm">
          <Check className="mr-2 h-3.5 w-3.5" />
          Approve
        </Button>
      </div>
    </div>
  );
}
