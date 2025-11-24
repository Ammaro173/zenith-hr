export function BreakpointIndicator() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed start-4 bottom-4 z-50 flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 font-bold font-mono text-primary-foreground text-xs shadow-lg">
      <div className="block sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
}
