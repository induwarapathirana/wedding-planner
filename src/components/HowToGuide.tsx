"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const guideItems = [
  {
    title: "Home",
    description:
      "Start here for a welcome to Vow & Venue, learn the promise of the platform, and jump to planning or exploring features.",
  },
  {
    title: "Login",
    description:
      "Sign in or create an account so we can save your weddings, sync collaborator access, and keep your data secure.",
  },
  {
    title: "Onboarding",
    description:
      "Create a new wedding by adding both partner names and your date. We set up your workspace and save it to your profile.",
  },
  {
    title: "Dashboard",
    description:
      "Track budget, guests, and the countdown to your day. Add checklist items and manage vendor or collaborator tasks from here.",
  },
  {
    title: "Invite Links",
    description:
      "Accept or share collaborator invitations so planners, partners, or family can help manage the wedding details together.",
  },
];

export function HowToGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-6 top-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:scale-105 hover:bg-primary/90"
      >
        <HelpCircle className="h-4 w-4" />
        How to
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white/95 p-8 shadow-2xl ring-1 ring-border">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Close how-to guide"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Quick Tour</p>
                <h2 className="text-2xl font-semibold text-foreground">How each page helps you plan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep this quick tour handy as you explore—each note explains what you will find on the main pages.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {guideItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">Guide</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
