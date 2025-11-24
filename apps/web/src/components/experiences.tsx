import { Card } from "@/components/ui/card";

const experiences = [
  "Convoy Events",
  "Partner-Hosted Luxury Experiences",
  "Private Product Launches",
  "Seasonal Drives",
  "Annual Gala & Awards",
];

export function Experiences({ id }: { id?: string }) {
  return (
    <section
      className="relative overflow-hidden bg-zinc-950 px-6 py-24 lg:px-12 lg:py-32"
      id={id}
    >
      {/* Background accent */}
      <div className="absolute top-0 right-0 h-full w-1/3 bg-linear-to-l from-zinc-900/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative h-[500px] overflow-hidden rounded-lg">
            <img
              alt="Member experiences"
              className="h-full w-full object-cover"
              src="/images/luxury-audi-convoy-driving-through-desert-landscap.jpg"
            />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 to-transparent" />
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="mb-6 font-light font-serif text-4xl text-white tracking-tight md:text-5xl lg:text-6xl">
              Member-Only Experiences
            </h2>
            <p className="mb-8 text-lg text-zinc-400 leading-relaxed">
              Membership gives you access to:
            </p>

            <div className="space-y-4">
              {experiences.map((experience, index) => (
                <Card
                  className="border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
                  key={index}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-sm text-zinc-950">
                      {index + 1}
                    </div>
                    <p className="text-lg text-white">{experience}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
