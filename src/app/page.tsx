import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-4">
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Heart className="h-10 w-10 fill-current" />
      </div>

      <h1 className="font-serif text-5xl font-bold text-foreground sm:text-6xl">
        Vow & Venue
      </h1>

      <p className="mt-6 max-w-lg text-lg text-muted-foreground">
        The elegant, all-in-one platform for modern couples and wedding planners.
        Manage budgets, guests, and details with ease.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/login"
          className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105"
        >
          Start Planning
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <button className="rounded-xl px-8 py-3.5 text-base font-medium text-foreground hover:bg-muted transition-colors">
          Learn More
        </button>
      </div>
    </div>
  );
}
