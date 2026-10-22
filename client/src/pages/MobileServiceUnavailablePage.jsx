import { Link } from 'react-router-dom';

const serviceInfo = {
  airtime: {
    title: 'Buy Airtime',
    description: 'Airtime purchases are unavailable because no verified airtime provider is configured.',
  },
  data: {
    title: 'Buy Data',
    description: 'Data purchases are unavailable because no provider-backed data plans are configured.',
  },
};

export default function MobileServiceUnavailablePage({ service }) {
  const details = serviceInfo[service];

  if (!details) {
    return (
      <div role="alert" className="max-w-2xl mx-auto p-6 bg-surface border border-b-secondary rounded-xl">
        <h1 className="text-xl font-semibold text-t-primary">Service unavailable</h1>
        <p className="text-sm text-t-tertiary mt-2">This service is not supported.</p>
        <Link to="/bill-pay" className="inline-flex mt-4 text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t-primary">{details.title}</h1>
        <p className="text-t-tertiary mt-1">Nigeria and Ghana</p>
      </div>
      <div role="status" className="p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
        <h2 className="font-semibold">Temporarily unavailable</h2>
        <p className="text-sm mt-1">{details.description}</p>
        <p className="text-sm mt-2">No mobile operators, plans, or purchase requests are enabled. No payment has been taken.</p>
      </div>
      <Link
        to="/bill-pay"
        className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
      >
        Back to Services
      </Link>
    </div>
  );
}
