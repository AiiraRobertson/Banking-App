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
    icon: '\u{1F30E}',
    gradient: 'from-blue-500 to-indigo-600',
    countries: [
      { flag: '\u{1F1FA}\u{1F1F8}', name: 'United States' },
      { flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada' },
    ]
  },
  {
    name: 'Europe',
    icon: '\u{1F30D}',
    gradient: 'from-indigo-500 to-purple-600',
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
    icon: '\u{1F30D}',
    gradient: 'from-emerald-500 to-teal-600',
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

function GlobeSection() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-200/40 to-blue-200/40 blur-2xl animate-pulse" />

      {/* Globe SVG */}
      <svg viewBox="0 0 400 400" className="w-full h-full relative z-10">
        {/* Globe circle with gradient */}
        <defs>
          <radialGradient id="globeGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="50%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
          <radialGradient id="globeShine" cx="30%" cy="25%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="arcNA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="arcEU" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="arcAF" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Globe body */}
        <circle cx="200" cy="200" r="150" fill="url(#globeGrad)" opacity="0.15" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.3" />
        <circle cx="200" cy="200" r="150" fill="url(#globeShine)" />

        {/* Latitude lines */}
        <ellipse cx="200" cy="200" rx="150" ry="40" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" />
        <ellipse cx="200" cy="160" rx="130" ry="30" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.15" />
        <ellipse cx="200" cy="240" rx="130" ry="30" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.15" />

        {/* Longitude lines */}
        <ellipse cx="200" cy="200" rx="40" ry="150" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" />
        <ellipse cx="200" cy="200" rx="100" ry="150" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.15" />

        {/* Simplified continent outlines */}
        {/* North America */}
        <path d="M120 130 Q130 110 145 115 Q155 100 170 110 Q175 120 165 135 Q155 140 150 155 Q140 165 125 160 Q115 150 120 130Z" fill="#6366f1" opacity="0.3" />
        {/* Europe */}
        <path d="M220 120 Q235 110 250 115 Q260 120 255 135 Q250 145 240 140 Q230 145 220 140 Q215 130 220 120Z" fill="#8b5cf6" opacity="0.3" />
        {/* Africa */}
        <path d="M230 170 Q245 165 250 180 Q255 200 250 225 Q245 245 235 250 Q225 245 220 230 Q215 210 220 190 Q225 175 230 170Z" fill="#10b981" opacity="0.3" />

        {/* Connection arcs */}
        <path d="M150 140 Q200 80 240 125" fill="none" stroke="url(#arcNA)" strokeWidth="2" opacity="0.6" className="animate-dash-draw" />
        <path d="M240 135 Q245 160 240 175" fill="none" stroke="url(#arcEU)" strokeWidth="2" opacity="0.6" className="animate-dash-draw delay-300" />
        <path d="M150 145 Q180 200 225 185" fill="none" stroke="url(#arcAF)" strokeWidth="2" opacity="0.6" className="animate-dash-draw delay-500" />

        {/* Region dots with pulse — North America */}
        <circle cx="145" cy="135" r="6" fill="#6366f1" opacity="0.9" />
        <circle cx="145" cy="135" r="6" fill="#6366f1" className="animate-ping-slow" opacity="0.4" />

        {/* Europe */}
        <circle cx="240" cy="125" r="6" fill="#8b5cf6" opacity="0.9" />
        <circle cx="240" cy="125" r="6" fill="#8b5cf6" className="animate-ping-slow" opacity="0.4" style={{ animationDelay: '1s' }} />

        {/* Africa */}
        <circle cx="235" cy="200" r="6" fill="#10b981" opacity="0.9" />
        <circle cx="235" cy="200" r="6" fill="#10b981" className="animate-ping-slow" opacity="0.4" style={{ animationDelay: '2s' }} />

        {/* Orbiting ring */}
        <ellipse cx="200" cy="200" rx="175" ry="60" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.15" transform="rotate(-20 200 200)" />
      </svg>

      {/* Floating currency labels */}
      <div className="absolute top-4 left-4 animate-float">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg shadow-indigo-100/50 border border-indigo-100 text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
          <span className="text-base">{"\u{1F1FA}\u{1F1F8}"}</span> USD
        </div>
      </div>
      <div className="absolute top-12 right-6 animate-float-delayed">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg shadow-purple-100/50 border border-purple-100 text-xs font-semibold text-purple-700 flex items-center gap-1.5">
          <span className="text-base">{"\u{1F1EA}\u{1F1FA}"}</span> EUR
        </div>
      </div>
      <div className="absolute bottom-16 left-2 animate-float-delayed" style={{ animationDelay: '0.5s' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg shadow-green-100/50 border border-green-100 text-xs font-semibold text-green-700 flex items-center gap-1.5">
          <span className="text-base">{"\u{1F1F3}\u{1F1EC}"}</span> NGN
        </div>
      </div>
      <div className="absolute bottom-8 right-8 animate-float" style={{ animationDelay: '1.5s' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg shadow-blue-100/50 border border-blue-100 text-xs font-semibold text-blue-700 flex items-center gap-1.5">
          <span className="text-base">{"\u{1F1EC}\u{1F1E7}"}</span> GBP
        </div>
      </div>
      <div className="absolute top-1/2 right-0 animate-float" style={{ animationDelay: '2s' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg shadow-amber-100/50 border border-amber-100 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <span className="text-base">{"\u{1F1E8}\u{1F1ED}"}</span> CHF
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200 transition-transform duration-300 hover:scale-110">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">SecureBank</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-200">Sign In</Link>
            <Link to="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-300 shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-40 right-10 w-48 h-48 bg-purple-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-700 font-medium mb-6 animate-fade-in-up">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Supporting 28+ countries worldwide
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight animate-fade-in-up delay-100">
                International Banking<br />
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">Made Simple</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed animate-fade-in-up delay-200">
                Send and receive money across borders with competitive exchange rates, low fees, and bank-grade security. Your money, anywhere in the world.
              </p>
              <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 animate-fade-in-up delay-300">
                <Link to="/register" className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-300 shadow-lg shadow-indigo-200 text-lg animate-pulse-glow">
                  Open an Account
                </Link>
                <Link to="/login" className="px-8 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-indigo-200 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-lg">
                  Sign In
                </Link>
              </div>
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500 animate-fade-in-up delay-500">
                {['No monthly fees', '$1,000 welcome bonus', 'Instant setup'].map(text => (
                  <div key={text} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Globe visual on the right */}
            <div className="hidden lg:block animate-fade-in delay-300">
              <GlobeSection />
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
            {features.map((f, i) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-indigo-100/30 hover:-translate-y-1.5 hover:border-indigo-100 transition-all duration-300 group cursor-default" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors duration-200">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Reach — Countries with Globe */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-700 font-medium mb-4">
              <span className="text-base">{"\u{1F30D}"}</span> Global Coverage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Send money to 28+ countries</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Transfer funds across North America, Europe, and Africa with competitive rates.</p>
          </div>

          {/* Globe for mobile */}
          <div className="lg:hidden mb-12">
            <GlobeSection />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regions.map((r, ri) => (
              <div key={r.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-indigo-100/30 hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 group" style={{ animationDelay: `${ri * 150}ms` }}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform duration-300`}>
                    {r.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">{r.name}</h3>
                    <p className="text-xs text-gray-400">{r.countries.length} countries</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {r.countries.map(c => (
                    <div key={c.name} className="flex items-center gap-3 text-sm py-1 px-2 rounded-lg hover:bg-indigo-50/50 transition-colors duration-200">
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
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {[
              ['28+', 'Countries Supported'],
              ['20+', 'Currencies Available'],
              ['$0', 'Monthly Fees'],
              ['24/7', 'Account Access'],
            ].map(([val, label]) => (
              <div key={label} className="group hover:scale-110 transition-transform duration-300 cursor-default">
                <p className="text-4xl lg:text-5xl font-bold group-hover:drop-shadow-lg transition-all duration-300">{val}</p>
                <p className="mt-2 text-indigo-200 text-sm group-hover:text-white transition-colors duration-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-50/60 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-4 text-lg text-gray-600">Open your account in minutes and get a $1,000 welcome bonus. No hidden fees, no hassle.</p>
          <Link to="/register" className="inline-block mt-8 px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-200 transition-all duration-300 shadow-lg shadow-indigo-200 text-lg animate-pulse-glow">
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-gray-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
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
