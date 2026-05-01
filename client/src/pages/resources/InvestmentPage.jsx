import ResourcePageLayout from './ResourcePageLayout';

const portfolios = [
  { name: 'Conservative', risk: 'Low', target: '4-6% / yr', mix: '70% Bonds · 20% Equities · 10% Cash', desc: 'Capital preservation with steady, predictable returns. Best for retirees or short-horizon goals.' },
  { name: 'Balanced', risk: 'Medium', target: '6-9% / yr', mix: '50% Equities · 40% Bonds · 10% REITs', desc: 'Long-term growth with cushion against market downturns. The default for most savers.' },
  { name: 'Growth', risk: 'High', target: '9-12% / yr', mix: '80% Equities · 10% Bonds · 10% Alternatives', desc: 'Aggressive equity exposure for investors with 10+ year horizons and tolerance for volatility.' },
  { name: 'Sustainable', risk: 'Medium', target: '6-9% / yr', mix: 'ESG-screened global equities & green bonds', desc: 'Same expected return as Balanced, with companies that meet ESG standards.' },
];

export default function InvestmentPage() {
  return (
    <ResourcePageLayout
      title="Investment Strategy"
      subtitle="Diversified, low-fee portfolios built on academic research, not market timing."
      icon="📈"
    >
      <div className="space-y-8">
        <section className="text-t-secondary space-y-3">
          <h2 className="text-xl font-semibold text-t-primary">Our philosophy</h2>
          <p>We don't try to beat the market. Decades of evidence show that disciplined, low-cost, diversified portfolios outperform active stock-picking after fees. SecureBank Invest builds globally diversified portfolios using index ETFs, automatically rebalances them, and harvests tax losses where applicable.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-4">Portfolio options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map(p => (
              <div key={p.name} className="border border-b-primary rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-t-primary text-lg">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.risk === 'Low' ? 'bg-green-100 text-green-700' :
                    p.risk === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>{p.risk} risk</span>
                </div>
                <p className="text-sm font-medium text-indigo-600">{p.target}</p>
                <p className="text-xs text-t-tertiary mt-1 mb-3">{p.mix}</p>
                <p className="text-sm text-t-secondary">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-elevated rounded-xl p-6 text-sm text-t-secondary">
          <p className="font-semibold text-t-primary mb-2">Important disclosure</p>
          <p>Past performance does not guarantee future results. All investments carry risk including possible loss of principal. Target returns are long-term averages, not guarantees. Speak with a licensed advisor before investing. SecureBank Invest is launching in select markets in Q3 2026.</p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
