import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Layers,
  LineChart,
  Lock,
  Repeat,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FaqSection } from '@/components/landing/faq-section'
import ogPreview from '@/images/og default png.png'

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#181818]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#181818]/90">
    </header>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#181818]">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href="/"
          aria-label="CashIn home"
        >
          <img src="cashin.svg" alt="CashIn" className="h-9 w-auto" />
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          <Button variant="ghost" size="sm" className="text-slate-200 dark:text-slate-200" asChild>
            <a href="#how-it-works">How it works</a>
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-200 dark:text-slate-200" asChild>
            <a href="#features">Features</a>
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-200 dark:text-slate-200" asChild>
            <a href="#faqs">FAQs</a>
          </Button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="hidden text-slate-200 hover:bg-[#87E64B] hover:text-slate-900 sm:inline-flex" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" className="rounded-full px-4 shadow-sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
      {/* Material-style secondary bar: quick jumps on small screens */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 bg-[#141414] py-2.5 text-sm font-medium text-slate-300 md:hidden">
        <a href="#how-it-works" className="transition hover:text-primary">
          How it works
        </a>
        <a href="#features" className="transition hover:text-primary">
          Features
        </a>
        <a href="#faqs" className="transition hover:text-primary">
          FAQs
        </a>
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 lg:gap-x-16">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-0 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Clarity for every naira
            </p>
            <h1 className="text-balance text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Your money, organized accounts, spending, and investments in one calm place.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg lg:mx-0">
              CashIn helps you record income and expenses, move money between accounts, and track
              investments with linked transactions so you always know where you stand.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button size="lg" className="h-12 min-w-[10rem] rounded-full px-8 shadow-md" asChild>
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>

          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl"
              aria-hidden
            />
            <div className=''>
              <Image
                src={ogPreview}
                alt="CashIn — preview of balances, activity, and insights in the app"
                className="h-auto w-full rounded-xl"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-slate-500 text-center text-white pt-4 font-medium font">
        No spreadsheets required. Built for people who want control without complexity.
            </p>
      </div>
    </section>
  )
}

const steps = [
  {
    step: '01',
    title: 'Create your accounts',
    description:
      'Add bank, cash, or custom accounts—each with a clear balance so your picture of cash is always accurate.',
    icon: Building2,
  },
  {
    step: '02',
    title: 'Log every flow',
    description:
      'Record income and expenses, or use transfers to mirror money moving between accounts. Everything stays dated and categorized.',
    icon: Layers,
  },
  {
    step: '03',
    title: 'Link investments',
    description:
      'Buy and sell assets with transactions tied to real accounts. See holdings, averages, and profit or loss over time.',
    icon: LineChart,
  },
  {
    step: '04',
    title: 'Review on the dashboard',
    description:
      'Open the dashboard for a snapshot of totals and trends—so decisions are based on facts, not memory.',
    icon: BarChart3,
  },
] as const

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-slate-200/60 bg-white py-20 dark:border-slate-800 dark:bg-slate-950 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
            Four straightforward steps—from empty slate to a full view of your finances.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {steps.map(({ step, title, description, icon: Icon }) => (
            <li
              key={step}
              className="group relative flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {step}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/signup">Start with step one</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: 'Multi-account ledger',
    body: 'Keep separate balances for every wallet or institution. Your net position is always one tap away.',
    icon: Wallet,
  },
  {
    title: 'Transactions & categories',
    body: 'Income, expenses, and rich details—category, source, and remarks when you need them later.',
    icon: CheckCircle2,
  },
  {
    title: 'Transfers that stay in sync',
    body: 'Move funds between accounts with paired transfer records so nothing disappears in the math.',
    icon: Repeat,
  },
  {
    title: 'Investment tracking',
    body: 'Link buys and sells to accounts, view units held, averages, and profit or loss per asset.',
    icon: LineChart,
  },
  {
    title: 'Dashboard insights',
    body: 'Summaries and visuals help you spot trends without exporting to a spreadsheet.',
    icon: BarChart3,
  },
  {
    title: 'Secure access',
    body: 'Sign in with your account; your data stays tied to you. Built for everyday privacy-minded use.',
    icon: Lock,
  },
] as const

function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-y border-white/10 bg-[#181818] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl">
            Features
          </h2>
          <p className="mt-3 text-lg text-slate-400">
            Everything you need to run your personal finances—clear, connected, and ready when you are.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, body, icon: Icon }) => (
            <li
              key={title}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-sm ring-1 ring-white/5 transition hover:border-primary/30 hover:ring-primary/20"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <div>
      {/* <section className="border-y border-white/10 bg-[#181818] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-6 px-4 sm:flex-row sm:gap-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-slate-200">
            <Shield className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium">Designed for clarity first</span>
          </div>
          <div className="hidden h-8 w-px bg-white/15 sm:block" aria-hidden />
          <p className="max-w-xl text-center text-sm text-slate-400 sm:text-left">
            CashIn is built around your real workflow: record, reconcile, and review—without fighting the tool.
          </p>
        </div>
      </section> */}
      </div>
  )
}

function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-slate-100 via-white to-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lg ring-1 ring-slate-200/50 sm:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
              Ready to see your cash clearly?
            </h2>
            <p className="mt-3 text-slate-600">
              Create an account in minutes. No credit card required to explore how CashIn fits your routine.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="h-12 rounded-full px-8 shadow-md" asChild>
                <Link href="/signup">Create free account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-slate-300 dark:border-slate-600"
                asChild
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#181818] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-slate-200">
          <img src="cashin.svg" alt="CashIn" className="h-9 w-auto " />
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
          <a href="#how-it-works" className="transition hover:text-primary">
            How it works
          </a>
          <a href="#features" className="transition hover:text-primary">
            Features
          </a>
          <a href="#faqs" className="transition hover:text-primary">
            FAQs
          </a>
          <Link href="/login" className="transition hover:text-primary">
            Log in
          </Link>
          <Link href="/signup" className="transition hover:text-primary">
            Sign up
          </Link>
        </nav>
        <p className="text-center text-xs text-slate-500 sm:text-right">
          © {new Date().getFullYear()} CashIn. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <FaqSection />
        <TrustStrip />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
