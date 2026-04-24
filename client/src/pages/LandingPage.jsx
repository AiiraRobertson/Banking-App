import { Link } from 'react-router-dom';

const features = [
  { title: 'Secure Banking', desc: 'Bank-grade encryption and multi-layer security to keep your money safe.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'from-indigo-500 to-indigo-600' },
  { title: 'International Transfers', desc: 'Send money to 28+ countries across North America, Europe, and Africa.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-blue-500 to-blue-600' },
  { title: 'Bill Payments', desc: 'Pay your bills on time with scheduled payments and payee management.', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'from-green-500 to-green-600' },
  { title: 'Real-time Notifications', desc: 'Stay informed with instant alerts for every transaction and account activity.', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: 'from-amber-500 to-orange-500' },
  { title: 'Multi-Currency Support', desc: 'Convert between 20+ currencies with competitive exchange rates and low fees.', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-purple-500 to-purple-600' },
  { title: 'Loan Calculator', desc: 'Plan your finances with our built-in loan and mortgage calculators.', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'from-rose-500 to-pink-600' },
];

const regions = [
  {
    name: 'North America',
    countries: [
      { flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
      { flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
    ]
  },
  {
    name: 'Europe',
    countries: [
      { flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom' },
      { flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
      { flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
      { flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
      { flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain' },
      { flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy' },
      { flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal' },
      { flag: '\u{1F1E7}\u{1F1EA}', name: 'Belgium' },
      { flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland' },
      { flag: '\u{1F1E8}\u{1F1ED}', name: 'Switzerland' },
      { flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden' },
      { flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway' },
      { flag: '\u{1F1E9}\u{1F1F0}', name: 'Denmark' },
      { flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland' },
    ]
  },
  {
    name: 'Africa',
    countries: [
      { flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria' },
      { flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenya' },
      { flag: '\u{1F1FF}\u{1F1E6}', name: 'South Africa' },
      { flag: '\u{1F1EC}\u{1F1ED}', name: 'Ghana' },
      { flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt' },
      { flag: '\u{1F1F9}\u{1F1FF}', name: 'Tanzania' },
      { flag: '\u{1F1EA}\u{1F1F9}', name: 'Ethiopia' },
      { flag: '\u{1F1F7}\u{1F1FC}', name: 'Rwanda' },
      { flag: '\u{1F1FA}\u{1F1EC}', name: 'Uganda' },
      { flag: '\u{1F1E8}\u{1F1F2}', name: 'Cameroon' },
      { flag: '\u{1F1F8}\u{1F1F3}', name: 'Senegal' },
      { flag: '\u{1F1F2}\u{1F1E6}', name: 'Morocco' },
    ]
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">SecureBank</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Sign In</Link>
            <Link to="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-700 font-medium mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Supporting 28+ countries worldwide
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight">
            International Banking<br />
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Made Simple</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Send and receive money across borders with competitive exchange rates, low fees, and bank-grade security. Your money, anywhere in the world.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 text-lg">
              Open an Account
            </Link>
            <Link to="/login" className="px-8 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-lg">
              Sign In
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              No monthly fees
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              $1,000 welcome bonus
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Instant setup
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need to manage your money</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Powerful features designed for modern banking, accessible from anywhere in the world.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Countries */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Send money to 28+ countries</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Transfer funds across North America, Europe, and Africa with competitive rates.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {regions.map(r => (
              <div key={r.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">{r.name}</h3>
                <div className="space-y-2.5">
                  {r.countries.map(c => (
                    <div key={c.name} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-gray-700">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {[
              ['28+', 'Countries Supported'],
              ['20+', 'Currencies Available'],
              ['$0', 'Monthly Fees'],
              ['24/7', 'Account Access'],
            ].map(([val, label]) => (
              <div key={label}>
                <p className="text-4xl font-bold">{val}</p>
                <p className="mt-1 text-indigo-200 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-4 text-lg text-gray-600">Open your account in minutes and get a $1,000 welcome bonus. No hidden fees, no hassle.</p>
          <Link to="/register" className="inline-block mt-8 px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 text-lg">
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">SecureBank</span>
          </div>
          <p className="text-sm text-gray-500">&copy; 2026 SecureBank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
