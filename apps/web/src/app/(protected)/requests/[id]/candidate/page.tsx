"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const chunkSize = 32_768;
  let binary = "";
  const u8 = new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += chunkSize) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function CandidateSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = params.id as string;
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    cvFile: null as File | null,
    startDate: "",
  });

  const uploadAndGenerate = useMutation({
    mutationFn: async () => {
      if (!formData.cvFile) {
        throw new Error("CV file is required");
      }
      if (!formData.startDate) {
        throw new Error("Start date is required");
      }

      const cvFileBase64 = await fileToBase64(formData.cvFile);

      const uploaded = await client.candidates.uploadCV({
        requestId,
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        cvFileBase64,
      });

      await client.candidates.selectCandidate({
        requestId,
        candidateId: uploaded.candidateId,
      });

      const contract = await client.contracts.generate({
        requestId,
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        startDate: formData.startDate,
      });
      return contract;
    },
    onSuccess: (contract) => {
      toast.success("Candidate selected and contract generated");
      queryClient.invalidateQueries();
      router.push(`/contracts/${contract.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadAndGenerate.mutate();
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Select Candidate</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium text-sm" htmlFor="candidate-name">
            Candidate Name
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="candidate-name"
            onChange={(e) =>
              setFormData({ ...formData, candidateName: e.target.value })
            }
            required
            type="text"
            value={formData.candidateName}
          />
        </div>
        <div>
          <label
            className="block font-medium text-sm"
            htmlFor="candidate-email"
          >
            Candidate Email
          </label>
          <input
            className="mt-1 w-full rounded border p-2"
            id="candidate-email"
            onChange={(e) =>
              setFormData({ ...formData, candidateEmail: e.target.value })
            }
            required
            type="email"
            value={formData.candidateEmail}
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="cv-file">
            CV File
          </label>
          <input
            accept=".pdf"
            className="mt-1 w-full rounded border p-2"
            id="cv-file"
            onChange={(e) =>
              setFormData({
                ...formData,
                cvFile: e.target.files?.[0] || null,
              })
            }
            required
            type="file"
          />
        </div>
        <div>
          <label className="block font-medium text-sm" htmlFor="start-date">
            Start Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "mt-1 w-full justify-start border p-2 text-left font-normal",
                  !formData.startDate && "text-muted-foreground",
                )}
                id="start-date"
                type="button"
                variant="outline"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? (
                  format(new Date(formData.startDate), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                initialFocus
                mode="single"
                onSelect={(date) => {
                  if (date) {
                    setFormData({
                      ...formData,
                      startDate: format(date, "yyyy-MM-dd"),
                    });
                  }
                }}
                selected={
                  formData.startDate ? new Date(formData.startDate) : undefined
                }
              />
            </PopoverContent>
          </Popover>
        </div>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-primary hover:bg-blue-600 disabled:opacity-50"
          disabled={uploadAndGenerate.isPending}
          type="submit"
        >
          {uploadAndGenerate.isPending ? "Processing..." : "Create Contract"}
        </button>
      </form>
    </div>
  );
}
