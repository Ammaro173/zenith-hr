import Link from "next/link";
import { CardFooter } from "@/components/ui/card";

export function LoginFooter() {
  return (
    <CardFooter className="flex flex-col items-start gap-6 px-0 pt-5">
      <Link
        className="text-primary text-sm decoration-primary/30 underline-offset-4 hover:underline"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
    </CardFooter>
  );
}
