import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { HowToGuide } from "@/components/HowToGuide";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 pb-16 pt-20 text-center">
      <HowToGuide />

      <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Heart className="h-10 w-10 fill-current" />
      </div>

      <h1 className="font-serif text-5xl font-bold text-foreground sm:text-6xl">
        Vow & Venue
      </h1>

      <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
        The elegant, all-in-one platform for modern couples and wedding planners. Manage budgets, guests, and details with ease,
        while keeping your celebration story at the heart of every decision.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/login"
          className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90"
        >
          Start Planning
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <button className="rounded-xl px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-muted">
          Learn More
        </button>
      </div>

      <div className="mt-16 grid max-w-5xl gap-6 text-left sm:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card/70 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Designed for real celebrations</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Thoughtful tools for every milestone</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            From your first inspiration board to the final guest thank-you, Vow & Venue simplifies every detail. Build timelines,
            track RSVPs, assign seating, and collaborate with your planner so you can focus on making memories.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Our curated templates, budget safeguards, and concierge-style reminders keep everything organized without the
            overwhelm. It is the peace of mind every couple deserves.
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Kind words from our couples</h2>
          <div className="mt-6 space-y-6">
            <blockquote className="rounded-xl border border-primary/20 bg-white/70 p-5 shadow-sm shadow-primary/10">
              <p className="text-base leading-relaxed text-foreground">
                “Vow & Venue felt like having a calm wedding planner in our pocket. The guest list tools kept everyone on track and
                we never missed a detail.”
              </p>
              <footer className="mt-3 text-sm font-semibold text-primary">— Priya & Arjun, Napa Valley</footer>
            </blockquote>
            <blockquote className="rounded-xl border border-border bg-white/60 p-5 shadow-sm">
              <p className="text-base leading-relaxed text-foreground">
                “The timeline builder and reminders turned planning from stressful to effortless. Our vendors were impressed with
                how organized everything was.”
              </p>
              <footer className="mt-3 text-sm font-semibold text-foreground">— Elena & Marco, Lake Como</footer>
            </blockquote>
            <blockquote className="rounded-xl border border-border bg-white/60 p-5 shadow-sm">
              <p className="text-base leading-relaxed text-foreground">
                “We loved personalizing every detail together. Vow & Venue kept our budget honest and our families informed without
                endless spreadsheets.”
              </p>
              <footer className="mt-3 text-sm font-semibold text-foreground">— Tasha & Morgan, Charleston</footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
