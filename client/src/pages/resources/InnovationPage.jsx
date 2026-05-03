import ResourcePageLayout from './ResourcePageLayout';

const initiatives = [
  { title: 'Live FX Engine', body: 'Sub-second mid-market exchange rates aggregated from six liquidity providers. Updated every 15 minutes with full audit trail.', stage: 'Live' },
  { title: 'Open Banking APIs', body: 'OAuth-secured APIs for fintech partners to initiate payments and read account data with customer consent.', stage: 'Live' },
  { title: 'Instant Settlement Network', body: 'Direct settlement rails with 12 partner banks, reducing wire delivery from days to under 60 seconds in supported corridors.', stage: 'Beta' },
  { title: 'AI Fraud Shield', body: 'Behavioral ML model that scores every transaction in <50ms. Catches account takeover and authorized push payment fraud in real time.', stage: 'Beta' },
  { title: 'Multi-Currency Wallets', body: 'Hold balances in any of our 21 supported currencies and convert on-demand without round-tripping through USD.', stage: 'Coming 2027' },
  { title: 'Programmable Payments', body: 'Conditional transfers triggered by webhooks, schedules, or smart-contract events. For payroll, escrow, and SaaS.', stage: 'Coming 2027' },
];

const stageColors = {
  'Live': 'bg-green-100 text-green-700',
  'Beta': 'bg-amber-100 text-amber-700',
  'Coming 2027': 'bg-indigo-100 text-indigo-700',
};

export default function InnovationPage() {
  return (
    <ResourcePageLayout
      title="Innovation"
      subtitle="The technology that makes Kapita the bank we wished existed."
      icon="🚀"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {initiatives.map(i => (
          <div key={i.title} className="bg-elevated rounded-xl p-5 border border-b-primary">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-t-primary text-lg">{i.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stageColors[i.stage]}`}>{i.stage}</span>
            </div>
            <p className="text-sm text-t-secondary leading-relaxed">{i.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-indigo-50 rounded-xl border border-indigo-200">
        <h3 className="font-semibold text-t-primary mb-2">Build with us</h3>
        <p className="text-sm text-t-secondary">We open-source our research and publish a quarterly engineering blog. Visit the Kapita GitHub or sign up for our developer newsletter.</p>
      </div>
    </ResourcePageLayout>
  );
}
