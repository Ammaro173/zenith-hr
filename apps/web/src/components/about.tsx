import Image from "next/image";

export function About({ id }: { id?: string }) {
  return (
    <section
      className="relative overflow-hidden bg-zinc-950 px-6 py-24 lg:px-12 lg:py-32"
      id={id}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="mb-6 font-light font-serif text-4xl text-primary tracking-tight md:text-5xl lg:text-6xl">
              Who We Are
            </h2>
            <p className="mb-4 font-light text-xl text-zinc-400">
              Driven by Passion. United by Audi.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Founded in partnership with Q-Auto, Audi Club Qatar is your
              gateway to unique automotive experiences, networking
              opportunities, and lifestyle benefits.
            </p>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              We're more than a club, we're a community that celebrates
              performance, design, and innovation.
            </p>
          </div>
          <div className="relative h-100 overflow-hidden rounded-lg lg:h-auto">
            <Image
              alt="Audi Club community"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              src="/images/audi-club-members-gathering-luxury-event.jpg"
            />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
