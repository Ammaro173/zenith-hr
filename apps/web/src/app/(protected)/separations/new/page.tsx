"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

type SeparationForm = {
  type: "RESIGNATION" | "TERMINATION" | "RETIREMENT" | "END_OF_CONTRACT";
  reason: string;
  lastWorkingDay: string;
  noticePeriodWaived: boolean;
};

const defaultValues: SeparationForm = {
  type: "RESIGNATION",
  reason: "",
  lastWorkingDay: "",
  noticePeriodWaived: false,
};

export default function NewSeparationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createSeparation = useMutation(
    orpc.separations.create.mutationOptions({
      onSuccess: () => {
        toast.success("Separation request submitted");
        queryClient.invalidateQueries();
        router.push("/separations");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await createSeparation.mutateAsync({
        ...value,
        lastWorkingDay: value.lastWorkingDay
          ? new Date(value.lastWorkingDay)
          : new Date(),
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Separation Request</CardTitle>
          <CardDescription>
            Initiate a resignation or termination request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="type">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Type</Label>
                  <select
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as SeparationForm["type"],
                      )
                    }
                    value={field.state.value}
                  >
                    <option value="RESIGNATION">Resignation</option>
                    <option value="TERMINATION">Termination</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="END_OF_CONTRACT">End of Contract</option>
                  </select>
                </div>
              )}
            </form.Field>

            <form.Field name="lastWorkingDay">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Last Working Day</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="date"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Reason</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Provide context..."
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="noticePeriodWaived">
              {(field) => (
                <label className="flex items-center gap-2">
                  <input
                    checked={field.state.value}
                    id={field.name}
                    name={field.name}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    type="checkbox"
                  />
                  <span>Notice period waived</span>
                </label>
              )}
            </form.Field>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
