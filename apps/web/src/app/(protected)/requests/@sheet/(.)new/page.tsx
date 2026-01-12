"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ManpowerRequestForm } from "@/features/manpower-requests";

export default function InterceptedNewRequestPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      router.back();
    }
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="overflow-y-auto p-6 sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="font-bold text-2xl">
            Create Manpower Request
          </SheetTitle>
          <SheetDescription>
            Fill out the form below to initiate a new hiring request.
          </SheetDescription>
        </SheetHeader>
        <ManpowerRequestForm
          mode="sheet"
          onCancel={() => {
            setOpen(false);
            router.back();
          }}
          onSuccess={() => {
            setOpen(false);
            router.back();
            router.refresh();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
