import { About } from "@/components/about";
import { Benefits } from "@/components/benefits";
import { Experiences } from "@/components/experiences";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Partners } from "@/components/partners";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Hero />
      <About id="about" />
      <Benefits id="benefits" />
      <Experiences id="experiences" />
      <Partners id="partners" />
      {/* <Gallery /> */}
      <Footer id="contact" />
    </div>
  );
}
