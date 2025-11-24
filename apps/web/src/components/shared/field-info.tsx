import type { AnyFieldApi } from "@tanstack/react-form";
import { Show } from "@/utils";

export default function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <div className="text-red-600 text-sm">
      <Show>
        <Show.When
          isTrue={field.state.meta.isTouched && !field.state.meta.isValid}
        >
          <em>{field.state.meta.errors.map((err) => err.message).join(",")}</em>
        </Show.When>
        <Show.When isTrue={field.state.meta.isValidating}>
          Validating...
        </Show.When>
      </Show>
    </div>
  );
}
