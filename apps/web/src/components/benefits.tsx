import { Calendar, Car, Gift, Users, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

const benefits = [
  {
    icon: Calendar,
    title: "Exclusive Events",
    description:
      "Private track days, lifestyle gatherings, desert drives, and VIP previews.",
  },
  {
    icon: Users,
    title: "Elite Networking",
    description:
      "Connect with Audi owners, business leaders, and enthusiasts across Qatar.",
  },
  {
    icon: Car,
    title: "Convoy Drives",
    description: "Scenic convoys and destination experiences.",
  },
  {
    icon: Wrench,
    title: "Workshops",
    description:
      "Learn from Audi experts about car care, safety, and performance.",
  },
  {
    icon: Gift,
    title: "Member Privileges",
    description:
      "Enjoy special offers and privileges curated just for members.",
  },
];

export function Benefits({ id }: { id?: string }) {
  return (
    <section className="bg-zinc-900 px-6 py-24 lg:px-12 lg:py-32" id={id}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-light font-serif text-4xl text-white tracking-tight md:text-5xl lg:text-6xl">
            Why Join Audi Club Qatar?
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400 leading-relaxed">
            Experience the best of the Audi lifestyle, both on and off the road
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Card
              className="border-zinc-800 bg-zinc-950/50 p-8 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/50"
              key={index}
            >
              <benefit.icon className="mb-4 h-10 w-10 text-white" />
              <h3 className="mb-3 font-semibold text-white text-xl">
                {benefit.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
