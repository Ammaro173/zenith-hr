export function Gallery() {
  const images = [
    {
      src: "/images/audi-rs-e-tron-gt-luxury-sports-car.jpg",
      alt: "Audi RS e-tron GT",
    },
    {
      src: "/images/audi-r8-v10-performance-supercar.jpg",
      alt: "Audi R8 V10",
    },
    {
      src: "/images/audi-q8-luxury-suv-black.jpg",
      alt: "Audi Q8",
    },
    {
      src: "/images/audi-a8-l-luxury-sedan.jpg",
      alt: "Audi A8 L",
    },
    {
      src: "/images/audi-club-track-day-event.jpg",
      alt: "Track Day Event",
    },
    {
      src: "/images/audi-convoy-desert-drive-qatar.jpg",
      alt: "Desert Convoy",
    },
  ];

  return (
    <section className="bg-zinc-950 px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-light font-serif text-4xl text-white tracking-tight md:text-5xl lg:text-6xl">
            Gallery
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400 leading-relaxed">
            Explore our collection of stunning vehicles and memorable moments
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              className="group relative h-[300px] overflow-hidden rounded-lg"
              key={index}
            >
              <img
                alt={image.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                src={image.src || "/placeholder.svg"}
              />
              <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute right-0 bottom-0 left-0 p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="font-semibold text-lg text-white">{image.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
