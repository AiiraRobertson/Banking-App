import ResourcePageLayout from './ResourcePageLayout';

export default function PolicyPage() {
  return (
    <ResourcePageLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your information. Last updated: April 2026."
      icon="🔒"
    >
      <div className="space-y-6 text-t-secondary">
        <section>
          <h2 className="text-xl font-semibold text-t-primary">What we collect</h2>
          <p>To open and maintain your account, we collect: name, date of birth, address, nationality, government-issued ID, contact details, and transaction history. For login security we collect device fingerprints, IP addresses, and access logs.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Why we collect it</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To verify your identity (KYC) under banking regulations</li>
            <li>To detect fraud and protect your account</li>
            <li>To process transactions and send notifications</li>
            <li>To comply with anti-money-laundering (AML) and tax reporting laws</li>
            <li>To improve our products (anonymized analytics only)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Who we share it with</h2>
          <p>We only share data with: (a) regulators when required by law, (b) payment networks to settle transactions, (c) sub-processors under strict data-protection agreements (cloud hosting, identity verification, fraud detection). We <strong className="text-t-primary">never sell</strong> your data to advertisers.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">How we protect it</h2>
          <p>Data in transit: TLS 1.3. Data at rest: AES-256. Passwords: bcrypt with 12 rounds. We run quarterly penetration tests, maintain SOC 2 Type II certification, and conform to PCI-DSS Level 1.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Your rights</h2>
          <p>Under GDPR, CCPA, and equivalent laws, you have the right to: access your data, correct inaccuracies, request deletion (subject to regulatory retention), export your data, and withdraw consent. Email <strong className="text-t-primary">privacy@securebank.example</strong> to exercise any of these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Retention</h2>
          <p>Active accounts: data is kept while the account is open. Closed accounts: 7 years (regulatory requirement). Marketing data: deleted within 30 days of unsubscription.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Cookies</h2>
          <p>We use strictly-necessary cookies for login sessions and security. We do not use advertising or third-party tracking cookies.</p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
