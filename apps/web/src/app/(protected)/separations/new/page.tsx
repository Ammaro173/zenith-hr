"use client";

import { useRouter } from "next/navigation";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { SeparationForm } from "@/features/separations";

export default function NewSeparationPage() {
  const router = useRouter();

  return (
    <div className="space-y-2 p-6">
      <CardTitle className="text-2xl">New Separation Request</CardTitle>
      <CardDescription>
        Initiate an employee separation and start the approval flow.
      </CardDescription>
      <div className="pt-4">
        <SeparationForm
          mode="page"
          onCancel={() => router.back()}
          onSuccess={() => router.push("/separations")}
        />
      </div>
    </div>
  );
}
