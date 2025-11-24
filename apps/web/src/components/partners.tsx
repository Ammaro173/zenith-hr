"use client";

import { Boxes, Hotel, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from "@/components/kibo-ui/glimpse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const partnerCategories = [
  {
    name: "Luxury Hotels",
    icon: Hotel,
    partners: [
      {
        name: "Muse Hotel",
        discount: "20% off spa, food & gym",
        image: "03.png",
      },
      {
        name: "Century Marina Hotel",
        discount: "20% off food & beverages",
        image: "04.png",
      },
      {
        name: "The OQ Hotel",
        discount: "20% off spa, food & gym",
        image: "05.png",
      },
      {
        name: "Velero Hotel",
        discount: "20% off spa, pool, food, beverages & gym",
        image: "06.png",
      },
      {
        name: "La Cigale Hotel",
        discount: "10% off rooms + 25% of all benefits",
        image: "07.png",
      },
      {
        name: "T apestry collection by Hilton",
        discount: "15% off food & beverages",
        image: "08.png",
      },
      {
        name: "The Chedi Katara",
        discount: "20% off spa, pool, food, beverages & gym",
        image: "09.png",
      },
      {
        name: "Mondrian Doha",
        discount: "15% off food, beverages & spa",
        image: "10.png",
      },
      {
        name: "The Ned Doha",
        discount: "10% off food & beverages",
        image: "12.png",
      },
      {
        name: "Al Messila Resort",
        discount: "20% off spa, pool, food, beverages & gym",
        image: "14.png",
      },
      {
        name: "DoubleTree by Hilton",
        discount: "20% off food & beverages + 15% off spa",
        image: "14.png",
      },
    ],
  },
  {
    name: "Lifestyle & Retail",
    icon: Sparkles,
    partners: [
      {
        name: "Grand Hyatt Doha",
        discount: "Corporate rates + breakfast",
        image: "11.png",
      },
      {
        name: "Blue Salon",
        discount: "Mozoon Card Azure Tier access",
        image: "13.png",
      },
      {
        name: "Godiva Café (Mall of Qatar, The Pearl)",
        discount: "15% off",
        image: "13.png",
      },
      {
        name: "Alshaya Perfumes (Highland Mall Royal Plaza, Hyatt Plaza, Souq Waqif)",
        discount: "10% off",
        image: "13.png",
      },
      { name: "Asala Café (Katara)", discount: "15% off", image: "13.png" },
      { name: "Byerley (Blue Salon)", discount: "20% off", image: "13.png" },
      { name: "Oryx Dry Clean", discount: "10% off", image: "13.png" },
      {
        name: "Arabeq Cafe (Mina District, Old Doha Port)",
        discount: "15% off",
        image: "13.png",
      },
      {
        name: "Falta Service Center (The Pearl)",
        discount: "30% off",
        image: "13.png",
      },
    ],
  },
  {
    name: "Other Services",
    icon: Boxes,
    partners: [
      { name: "OnlyRoses", discount: "15% off", image: "16.png" },
      { name: "Kiddy Zone", discount: "10% off", image: "16.png" },
      { name: "Photobrick", discount: "10% off", image: "16.png" },
      { name: "RondVill", discount: "10% off", image: "16.png" },
      { name: "Space toys", discount: "10% off", image: "16.png" },
      { name: "Bioskin Spa", discount: "15% off", image: "16.png" },
      { name: "Bioskin Spa Services", discount: "25% off", image: "16.png" },
    ],
  },
];

export function Partners({ id }: { id?: string }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className="bg-zinc-900 px-6 py-24 lg:px-12 lg:py-32" id={id}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-light font-serif text-4xl text-white tracking-tight md:text-5xl lg:text-6xl">
            Club Partners
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400 leading-relaxed">
            Exclusive discounts and privileges at Qatar's finest establishments
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-12 flex flex-wrap justify-center gap-4">
          {partnerCategories.map((category, index) => (
            <Button
              className={
                activeCategory === index
                  ? "bg-white text-zinc-950 hover:bg-zinc-100"
                  : "border-zinc-700 bg-zinc-950/50 text-white hover:bg-zinc-800"
              }
              key={category.name}
              onClick={() => setActiveCategory(index)}
              variant={activeCategory === index ? "default" : "outline"}
            >
              <category.icon className="mr-2 h-4 w-4" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Partners Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partnerCategories[activeCategory].partners.map((partner) => (
            <Glimpse closeDelay={200} key={partner.name} openDelay={200}>
              <GlimpseTrigger asChild>
                <Card className="cursor-pointer border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/50">
                  <h3 className="mb-2 font-semibold text-lg text-white">
                    {partner.name}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {partner.discount}
                  </p>
                </Card>
              </GlimpseTrigger>
              <GlimpseContent className="w-[600px]">
                <GlimpseImage
                  alt={partner.name}
                  src={`/images/club-partners/${partner.image}`}
                />
                <GlimpseTitle>{partner.name}</GlimpseTitle>
                <GlimpseDescription>{partner.discount}</GlimpseDescription>
              </GlimpseContent>
            </Glimpse>
          ))}
        </div>
      </div>
    </section>
  );
}
