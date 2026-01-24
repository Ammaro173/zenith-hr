"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalActionDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  commentLabel?: string;
  commentPlaceholder?: string;
  comment: string;
  requireComment?: boolean;
  isPending?: boolean;
  onCommentChange: (next: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ApprovalActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  commentLabel = "Comment",
  commentPlaceholder = "Add a note for the requester...",
  comment,
  requireComment = false,
  isPending = false,
  onCommentChange,
  onOpenChange,
  onConfirm,
}: ApprovalActionDialogProps) {
  const canConfirm = useMemo(() => {
    if (!requireComment) {
      return true;
    }
    return comment.trim().length > 0;
  }, [comment, requireComment]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-muted-foreground text-sm">{commentLabel}</div>
          <Textarea
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={commentPlaceholder}
            value={comment}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!canConfirm || isPending}
            onClick={onConfirm}
            type="button"
            variant={confirmVariant}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
