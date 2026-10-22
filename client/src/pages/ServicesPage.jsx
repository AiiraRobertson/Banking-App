import { Link } from 'react-router-dom';

const services = [
  {
    title: 'Buy Airtime',
    description: 'Recharge a mobile phone number in Nigeria or Ghana.',
    availability: 'Unavailable until a supported airtime provider is configured.',
    to: '/airtime',
    icon: 'M12 8v8m-4-4h8m7 0a11 11 0 11-22 0 11 11 0 0122 0z',
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    title: 'Buy Data',
    description: 'Explore mobile data purchases for supported networks.',
    availability: 'Unavailable until live provider plans are integrated.',
    to: '/data',
    icon: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm3 4h8m-8 4h8m-8 4h5',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Bill Payments',
    description: 'Manage saved bill-payee details and review existing schedule records.',
    availability: 'Provider-verified bill payments are not currently enabled.',
    to: '/bill-pay/payments',
    icon: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm2 5h6m-6 4h6m-6 4h4',
    color: 'text-purple-600 bg-purple-50',
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">Services</h1>
        <p className="text-t-tertiary">Choose a service to continue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((service) => (
          <section key={service.title} className="bg-surface rounded-xl shadow-sm border border-b-secondary p-6 flex flex-col">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${service.color}`} aria-hidden="true">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={service.icon} />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-t-primary">{service.title}</h2>
            <p className="text-sm text-t-tertiary mt-1">{service.description}</p>
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 mt-4 flex-1">{service.availability}</p>
            <Link
              to={service.to}
              className="inline-flex items-center justify-center mt-4 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
            >
              {service.title === 'Bill Payments' ? 'Manage Bill Payees' : `View ${service.title}`}
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
