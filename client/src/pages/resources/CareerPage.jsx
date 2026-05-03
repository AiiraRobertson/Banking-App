import ResourcePageLayout from './ResourcePageLayout';

const tracks = [
  { role: 'Engineering', growth: 'Engineer I → II → Senior → Staff → Principal', perks: 'Open-source time, conference budget, hardware of choice' },
  { role: 'Product', growth: 'PM → Senior PM → Group PM → Director', perks: 'Customer interview budget, prototype tooling, design partnership' },
  { role: 'Risk & Compliance', growth: 'Analyst → Senior Analyst → Manager → Head', perks: 'CAMS / CISA / FRM exam funding, annual conferences' },
  { role: 'Customer Operations', growth: 'Specialist → Lead → Manager → Director', perks: 'Multi-language support pay differential, certifications' },
];

const benefits = [
  { icon: '💰', title: 'Competitive comp', body: 'Top-quartile salary plus equity in every role.' },
  { icon: '🏥', title: 'Full health coverage', body: 'Medical, dental, vision, mental health — for you and dependents.' },
  { icon: '🌍', title: 'Remote-friendly', body: 'Work from any of our 14 offices or fully remote in supported countries.' },
  { icon: '📚', title: '$2,000 learning budget', body: 'Books, courses, conferences. Yours, every year.' },
  { icon: '🌱', title: '6 weeks paid leave', body: 'Plus 16 weeks parental leave for any parent.' },
  { icon: '⏸️', title: 'Sabbaticals', body: 'Four weeks paid sabbatical at year four and every five years after.' },
];

export default function CareerPage() {
  return (
    <ResourcePageLayout
      title="Career Growth"
      subtitle="Build the bank you wish existed. With people who'll make you better at your craft."
      icon="🌱"
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-4">Career tracks</h2>
          <div className="space-y-3">
            {tracks.map(t => (
              <div key={t.role} className="border border-b-primary rounded-xl p-5 hover:border-indigo-300 transition-colors">
                <h3 className="font-semibold text-t-primary text-lg">{t.role}</h3>
                <p className="text-sm text-indigo-600 mt-1 font-mono">{t.growth}</p>
                <p className="text-sm text-t-secondary mt-2">{t.perks}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary mb-4">Benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map(b => (
              <div key={b.title} className="bg-elevated rounded-xl p-4">
                <div className="text-2xl mb-2">{b.icon}</div>
                <p className="font-semibold text-t-primary">{b.title}</p>
                <p className="text-sm text-t-secondary mt-1">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h3 className="font-semibold text-t-primary mb-2">Open roles</h3>
          <p className="text-sm text-t-secondary">We have 40+ open positions across engineering, product, risk, ops, and design. Visit our jobs portal at <strong className="text-indigo-700">jobs.kapita.example</strong> or email <strong className="text-indigo-700">careers@kapita.example</strong> with your CV.</p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
