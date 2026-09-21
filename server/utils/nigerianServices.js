const electricityProviders = [
  { id: 'ikeja-electric', name: 'Ikeja Electric' },
  { id: 'eko-electric', name: 'Eko Electricity' },
  { id: 'abuja-electric', name: 'Abuja Electricity (AEDC)' },
  { id: 'ibadan-electric', name: 'Ibadan Electricity (IBEDC)' },
  { id: 'enugu-electric', name: 'Enugu Electricity (EEDC)' },
  { id: 'kano-electric', name: 'Kano Electricity (KEDCO)' },
  { id: 'kaduna-electric', name: 'Kaduna Electricity (KAEDCO)' },
  { id: 'jos-electric', name: 'Jos Electricity (JED)' },
  { id: 'benin-electric', name: 'Benin Electricity (BEDC)' },
  { id: 'yola-electric', name: 'Yola Electricity (YEDC)' },
  { id: 'portharcourt-electric', name: 'Port Harcourt Electricity (PHED)' },
  { id: 'joselectric', name: 'Jos Electricity (JED)' }
];

const waterProviders = [
  { id: 'lagos-water', name: 'Lagos Water Corporation' },
  { id: 'abuja-water', name: 'Abuja Water Board' },
  { id: 'kano-water', name: 'Kano State Water Board' },
  { id: 'kaduna-water', name: 'Kaduna State Water Corporation' },
  { id: 'oyo-water', name: 'Oyo State Water Corporation' }
];

const mobileProviders = [
  { id: 'mtn-ng', name: 'MTN Nigeria' },
  { id: 'airtel-ng', name: 'Airtel Nigeria' },
  { id: 'glo-ng', name: 'Glo Nigeria' },
  { id: '9mobile-ng', name: '9mobile Nigeria' }
];

const dataBundles = {
  'mtn-ng': [{ code: 'mtn-1gb-30d', name: '1 GB - 30 days', amount: 500 }, { code: 'mtn-3gb-30d', name: '3 GB - 30 days', amount: 1500 }, { code: 'mtn-10gb-30d', name: '10 GB - 30 days', amount: 3000 }],
  'airtel-ng': [{ code: 'airtel-1gb-30d', name: '1 GB - 30 days', amount: 500 }, { code: 'airtel-3gb-30d', name: '3 GB - 30 days', amount: 1500 }, { code: 'airtel-10gb-30d', name: '10 GB - 30 days', amount: 3000 }],
  'glo-ng': [{ code: 'glo-1gb-30d', name: '1 GB - 30 days', amount: 500 }, { code: 'glo-3gb-30d', name: '3 GB - 30 days', amount: 1500 }, { code: 'glo-10gb-30d', name: '10 GB - 30 days', amount: 3000 }],
  '9mobile-ng': [{ code: '9mobile-1gb-30d', name: '1 GB - 30 days', amount: 500 }, { code: '9mobile-3gb-30d', name: '3 GB - 30 days', amount: 1500 }, { code: '9mobile-10gb-30d', name: '10 GB - 30 days', amount: 3000 }]
};

module.exports = { electricityProviders, waterProviders, mobileProviders, dataBundles };
