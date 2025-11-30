"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTripSchema } from "@zenith-hr/api/modules/business-trips/business-trips.schema";
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

export default function NewBusinessTripPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutateAsync: createTrip } = useMutation(
    orpc.businessTrips.create.mutationOptions({
      onSuccess: () => {
        toast.success("Business trip request created successfully");
        queryClient.invalidateQueries({
          queryKey: orpc.businessTrips.getMyTrips.key,
        });
        router.push("/business-trips");
      },
      onError: (error) => {
        toast.error(`Failed to create request: ${error.message}`);
      },
    })
  );

  const form = useForm({
    defaultValues: {
      destination: "",
      purpose: "",
      startDate: "",
      endDate: "",
      estimatedCost: "",
      currency: "USD",
    },
    validators: {
      onChange: createTripSchema,
    },
    onSubmit: async ({ value }) => {
      await createTrip({
        ...value,
        estimatedCost: value.estimatedCost
          ? Number(value.estimatedCost)
          : undefined,
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Business Trip Request</CardTitle>
          <CardDescription>
            Submit a request for an upcoming business trip.
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
            <form.Field
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Destination</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. London, UK"
                    value={field.state.value}
                  />
                  {field.state.meta.errors ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
              name="destination"
            />

            <form.Field
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Purpose</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Reason for the trip..."
                    value={field.state.value}
                  />
                  {field.state.meta.errors ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
              name="purpose"
            />

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Start Date</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="date"
                      value={field.state.value}
                    />
                    {field.state.meta.errors ? (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
                name="startDate"
              />

              <form.Field
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>End Date</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="date"
                      value={field.state.value}
                    />
                    {field.state.meta.errors ? (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
                name="endDate"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Estimated Cost</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      value={field.state.value}
                    />
                    {field.state.meta.errors ? (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
                name="estimatedCost"
              />

              <form.Field
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Currency</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="USD"
                      value={field.state.value}
                    />
                    {field.state.meta.errors ? (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
                name="currency"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <form.Subscribe
                children={([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                )}
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
