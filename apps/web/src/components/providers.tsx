"use client";

import { ProgressProvider } from "@bprogress/next/app";
import {
  type DehydratedState,
  HydrationBoundary,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { Options } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { queryClient } from "@/utils/orpc";
import { CommandMenu } from "./command-menu";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

interface ProvidersProps {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
}

const queryStateOptions: Options = {
  history: "replace",
  shallow: false,
  scroll: false,
  clearOnDefault: true,
};

export default function Providers({
  children,
  dehydratedState,
}: ProvidersProps) {
  return (
    <NuqsAdapter defaultOptions={queryStateOptions}>
      <ProgressProvider
        color="#000000"
        height="2px"
        options={{ showSpinner: false }}
        shallowRouting
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          enableSystem
        >
          <CommandMenu>
            <QueryClientProvider client={queryClient}>
              <HydrationBoundary state={dehydratedState}>
                {children}
              </HydrationBoundary>
              <ReactQueryDevtools />
            </QueryClientProvider>
            <Toaster richColors />
          </CommandMenu>
        </ThemeProvider>
      </ProgressProvider>
    </NuqsAdapter>
  );
}
