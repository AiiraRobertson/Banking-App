import ResourcePageLayout from './ResourcePageLayout';

export default function MissionPage() {
  return (
    <ResourcePageLayout
      title="Our Mission"
      subtitle="Banking should be borderless, transparent, and built for the way people actually live."
      icon="🎯"
    >
      <div className="space-y-8 text-t-secondary">
        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-2">Why we exist</h2>
          <p>Sending $200 to family across an ocean used to cost $40 in fees, take a week, and arrive with no explanation of where the cut went. That's the world Kapita was built to replace. We believe a person in Lagos, London, or Lisbon deserves the same fast, fair, and fully-priced banking — without the fine print.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-2">What we promise</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-t-primary">Transparent pricing</strong> — every fee disclosed before you confirm. No FX markups hidden in the rate.</li>
            <li><strong className="text-t-primary">Real-time clarity</strong> — see your live exchange rate, fee, and recipient amount in one place.</li>
            <li><strong className="text-t-primary">Borderless access</strong> — one account that works across 27 countries and 21 currencies.</li>
            <li><strong className="text-t-primary">Customer-first support</strong> — a human responds within 24 hours. Complaints get a case officer.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-2">By the numbers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { n: '27', l: 'Countries' },
              { n: '21', l: 'Currencies' },
              { n: '$2B+', l: 'Moved annually' },
              { n: '99.99%', l: 'Uptime' },
            ].map(s => (
              <div key={s.l} className="bg-elevated rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">{s.n}</p>
                <p className="text-xs text-t-tertiary mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-2">What's next</h2>
          <p>By 2030, we want every cross-border transfer at Kapita to settle in under 60 seconds, at a true mid-market rate, with zero hidden fees. We're not there yet — but every release moves us closer.</p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
