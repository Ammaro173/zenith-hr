import { Card, CardContent } from "@/components/ui/card";
import { LoginFooter, LoginForm, LoginHeader } from "./_components";

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen place-items-center">
      <Card className="w-full max-w-lg gap-0 rounded-none border border-white/25 bg-background p-12 text-start">
        <LoginHeader />
        <CardContent className="px-0 pt-8">
          <LoginForm />
        </CardContent>
        <LoginFooter />
      </Card>
    </div>
  );
}
