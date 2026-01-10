import Image from "next/image";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginHeader() {
  return (
    <CardHeader className="items-center gap-17 px-0 text-center">
      <div className="flex flex-col items-center gap-5 text-[#1e1e1e]">
        <Image
          alt="Q-Auto emblem"
          className="object-contain"
          height={32}
          src="/images/logo.svg"
          width={108}
        />
        <span className="font-medium text-[#5f5f5f] text-sm">
          Growing Stronger, Progressing Together
        </span>
      </div>

      <div className="flex flex-col gap-3 text-start">
        <CardTitle className="font-semibold text-4xl">Sign In</CardTitle>
        <CardDescription className="text-[#999999] text-sm">
          Enter your email and password to sign in!
        </CardDescription>
      </div>
    </CardHeader>
  );
}
