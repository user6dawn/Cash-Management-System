'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'What is CashIn?',
    answer:
      'CashIn is a personal cash management app. You add accounts, record income and expenses, transfer between accounts, and track investments—all with a clear ledger so balances and history stay consistent.',
  },
  {
    question: 'Is CashIn a bank or does it move real money?',
    answer:
      'No. CashIn does not hold funds or execute payments. It is a record-keeping tool: you log what happened in your real accounts so you can plan and review with confidence.',
  },
  {
    question: 'How do transfers work?',
    answer:
      'When you move money between two of your accounts, CashIn can create linked transfer records so the outgoing and incoming sides match. That helps avoid double-counting or gaps in your totals.',
  },
  {
    question: 'How are investments tracked?',
    answer:
      'You define assets (for example stocks or crypto), then log buys and sells with quantities, prices, and fees. Each trade can link to a transaction on an account, so your portfolio view stays tied to real cash flows.',
  },
  {
    question: 'Can I use CashIn on my phone?',
    answer:
      'CashIn runs in the browser and works on mobile and desktop. Sign in from any device with your account to access the same data.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Access is protected by your login. Follow good password habits and keep your credentials private. For product-specific security practices, refer to your host and authentication provider settings.',
  },
] as const

export function FaqSection() {
  return (
    <section
      id="faqs"
      className="scroll-mt-20 border-y border-slate-200/80 bg-slate-50 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
            FAQs
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Quick answers about how CashIn fits into your financial routine.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-12 w-full rounded-2xl border border-slate-200/90 bg-white px-4 shadow-sm sm:px-6">
          {faqs.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`item-${index}`}
              className="border-slate-200/90"
            >
              <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
