import { useState } from 'react';
import ResourcePageLayout from './ResourcePageLayout';

const faqs = [
  { q: 'How do I open a Kapita account?', a: 'Click "Open Account" on the homepage, fill in your personal details, and accept our Terms. You\'ll receive an instant checking account with a $1,000 welcome bonus.' },
  { q: 'Which countries does Kapita support?', a: 'We currently serve 27 countries across North America (US, Canada), Europe (16 countries including UK, Germany, France), and Africa (10 countries including Nigeria, Kenya, South Africa, Ghana).' },
  { q: 'How long does an international wire transfer take?', a: 'North America: 1-2 business days. Europe: 2-4 business days. Africa: 3-5 business days. Cutoff times vary by recipient bank.' },
  { q: 'What are your fees?', a: 'Internal transfers between Kapita accounts are free. International wires: $5 + 0.5% (NA), $25 + 1.0% (EU), $20 + 1.5% (AF). No monthly maintenance fees.' },
  { q: 'How are exchange rates calculated?', a: 'We use live mid-market rates updated every 15 minutes from a regulated FX data provider. Rates are shown before you confirm any conversion.' },
  { q: 'Is my money safe?', a: 'Yes. Deposits are protected up to $250,000 per account by deposit insurance. We use AES-256 encryption, multi-factor authentication, and 24/7 fraud monitoring.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot password" on the login page. We\'ll send a reset link to your registered email. For security, the link expires after 30 minutes.' },
  { q: 'Can I have both checking and savings accounts?', a: 'Yes. From the Accounts page, you can open additional checking or savings accounts at any time. Savings accounts earn 4.5% APY.' },
  { q: 'How do I dispute a transaction?', a: 'Submit a complaint via the Complaint page or contact support. Disputes are usually resolved within 5-10 business days. Provisional credit may be issued during investigation.' },
  { q: 'Do you offer loans?', a: 'We currently offer a loan calculator to help you plan. Personal loans, mortgages, and business credit lines are launching in 2027.' },
  { q: 'Can I close my account?', a: 'Yes. Withdraw all funds, then contact support to close. There is no closing fee. Account history remains available for 7 years for regulatory compliance.' },
  { q: 'Is there a mobile app?', a: 'The web app is fully responsive and works on any modern browser. Native iOS and Android apps are in development.' },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);
  return (
    <ResourcePageLayout
      title="Frequently Asked Questions"
      subtitle="Quick answers to the questions our customers ask most."
      icon="❓"
    >
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="border border-b-primary rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-elevated transition-colors">
              <span className="font-medium text-t-primary">{f.q}</span>
              <svg className={`w-5 h-5 text-t-tertiary transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open === i && (
              <div className="px-5 pb-4 pt-1 text-t-secondary text-sm leading-relaxed">{f.a}</div>
            )}
          </div>
        ))}
      </div>
    </ResourcePageLayout>
  );
}
