"use client";

import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalActionDialogProps {
  comment: string;
  commentLabel?: string;
  commentPlaceholder?: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  description?: string;
  isPending?: boolean;
  onCommentChange: (next: string) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  requireComment?: boolean;
  title: string;
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
      <DialogContent className="gap-0 sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Label htmlFor="approval-comment">
            {commentLabel}
            {requireComment ? (
              <span className="ml-1 text-destructive">*</span>
            ) : (
              <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                (optional)
              </span>
            )}
          </Label>
          <Textarea
            className="min-h-28 resize-none"
            id="approval-comment"
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={commentPlaceholder}
            value={comment}
          />
          {requireComment && comment.trim().length === 0 ? (
            <p className="text-muted-foreground text-xs">
              A comment is required for this action.
            </p>
          ) : null}
        </div>

        <DialogFooter className="pt-6">
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={!canConfirm || isPending}
            onClick={onConfirm}
            type="button"
            variant={confirmVariant}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
