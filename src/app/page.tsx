import Link from "next/link";
import { ArrowRight, Heart, Users, CheckCircle2, ShieldCheck, Star, Calendar, BookUser } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/limits";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background text-center">

      {/* Hero Section */}
      <section className="w-full px-4 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="mx-auto max-w-4xl">
          {/* Trial Badge */}
          <div className="mx-auto mb-6 w-fit animate-in fade-in zoom-in duration-300">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary ring-1 ring-primary/20">
              ✨ Try Premium FREE for 14 Days
            </span>
          </div>

          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 animate-in fade-in zoom-in duration-500">
            <Heart className="h-10 w-10 fill-current" />
          </div>

          <h1 className="font-serif text-5xl font-bold text-foreground sm:text-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            Start Free,<br />Plan Premium
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            Get <span className="text-foreground font-bold">2 weeks of unlimited premium features</span> free.
            Plan weddings, manage vendors, and track budgets with elegance and ease. No credit card required.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90"
            >
              Start Your Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#packages"
              className="rounded-xl px-8 py-4 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Pricing
            </Link>
          </div>

          {/* Trust Badges */}
          <p className="mt-8 text-sm text-muted-foreground animate-in fade-in duration-500 delay-400">
            Join 1,000+ couples planning stress-free ✨ No credit card required
          </p>
        </div>
      </section>

      {/* Audience Split Section */}
      <section className="w-full px-4 py-16 bg-gray-50/50">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">

            {/* For Couples */}
            <div className="text-left space-y-6 p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">For Couples</h2>
              <p className="text-gray-600 leading-relaxed">
                Enjoy peace of mind knowing every detail is tracked. Keep your budget honest, your guest list organized, and your vendors in check. Use our free tools to plan your dream day without the stress.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Real-time Budget Tracker</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Guest List Management with RSVP</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Interactive Checklist</span>
                </li>
              </ul>
            </div>

            {/* For Planners */}
            <div className="text-left space-y-6 p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <BookUser className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">For Wedding Planners</h2>
              <p className="text-gray-600 leading-relaxed">
                Manage multiple weddings from a single dashboard. Maintain your own <strong>Global Vendor Directory</strong> and import your trusted network into any client project instantly.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <span>Multi-Wedding Dashboard</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <span>Global Vendor Directory (Master List)</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <span>Import Vendors to Client Weddings</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Packages / Pricing Section */}
      <section id="packages" className="w-full px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary ring-1 ring-primary/20 mb-4">
              🎁 14-Day Premium Trial • No Credit Card Required
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-500">Experience premium features free for 2 weeks, then choose your plan.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* Free Plan */}
            <div className="rounded-3xl p-8 border border-gray-200 bg-white text-left hover:border-gray-300 transition-colors">
              <h3 className="text-2xl font-bold text-gray-900">Free Starter</h3>
              <p className="text-gray-500 mt-2">Perfect for intimate gatherings or getting started.</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500"> / forever</span>
              </div>
              <Link href="/login" className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl text-center transition-colors">
                Start Free Trial
              </Link>
              <div className="mt-8 space-y-4">
                <p className="text-sm font-semibold text-gray-900">Includes:</p>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Up to <span>{PLAN_LIMITS.free.guests} Guests</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Up to <span>{PLAN_LIMITS.free.vendors} Vendors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Up to <span>{PLAN_LIMITS.free.budget_items} Budget Items</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Up to <span>{PLAN_LIMITS.free.checklist_items} Checklist Tasks</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-3xl p-8 border-2 border-primary bg-primary/5 text-left shadow-xl shadow-primary/5">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
              </div>
              <h3 className="text-2xl font-bold text-primary">Premium</h3>
              <p className="text-gray-600 mt-2">For full-scale weddings and professional planning.</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-gray-900">LKR 990</span>
                <span className="text-gray-500"> / one-time</span>
              </div>
              <Link href="/login" className="block w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-center shadow-lg shadow-primary/25 transition-all">
                Start Premium Trial
              </Link>
              <div className="mt-8 space-y-4">
                <p className="text-sm font-semibold text-gray-900">Everything in Free, plus:</p>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <strong>Unlimited</strong> Guests
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <strong>Unlimited</strong> Vendors
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <strong>Unlimited</strong> Budget & Checklist
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <strong>Team Collaboration</strong> (Invite Partners)
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Priority Support
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full px-4 py-16">
        <div className="mx-auto max-w-5xl text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center font-serif">Loved by Couples & Pros</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <blockquote className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex gap-1 mb-4 text-yellow-400">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-gray-600">
                "As a planner, the vendor directory is a lifesaver. I can spin up a new wedding for a client and import my team in seconds."
              </p>
              <footer className="mt-4 text-sm font-bold text-gray-900">— Sarah J., Wedding Planner</footer>
            </blockquote>
            <blockquote className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex gap-1 mb-4 text-yellow-400">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-gray-600">
                "We loved personalizing every detail together. Vow & Venue kept our budget honest and our families informed without endless spreadsheets."
              </p>
              <footer className="mt-4 text-sm font-bold text-gray-900">— Tasha & Morgan, Couples</footer>
            </blockquote>
            <blockquote className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex gap-1 mb-4 text-yellow-400">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-gray-600">
                "The premium upgrade was worth every cent. Managing 450 guests without this tool would have been a nightmare."
              </p>
              <footer className="mt-4 text-sm font-bold text-gray-900">— Michael R., Groom</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="w-full px-4 py-20 bg-primary/5">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Ready to plan the perfect day?</h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-4 text-base font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-gray-800"
          >
            Get Started for Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
