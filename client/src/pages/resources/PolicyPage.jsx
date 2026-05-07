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
          <p>Under GDPR, CCPA, and equivalent laws, you have the right to: access your data, correct inaccuracies, request deletion (subject to regulatory retention), export your data, and withdraw consent. Email <strong className="text-t-primary">privacy@kapita.example</strong> to exercise any of these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Retention</h2>
          <p>Active accounts: data is kept while the account is open. Closed accounts: 7 years (regulatory requirement). Marketing data: deleted within 30 days of unsubscription.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">Cookies</h2>
          <p>We use strictly-necessary cookies for login sessions and security. We do not use advertising or third-party tracking cookies.</p>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-semibold text-amber-900 flex items-center gap-2">🔒 Savings Maturity Lock Policy</h2>
          <p className="text-amber-900 mt-2">
            Funds held in a Kapita savings account are placed under a maturity lock for a period of <strong>15 to 30 days</strong> (extendable up to 365 days). The lock is designed to encourage disciplined saving and to allow Kapita to allocate balances toward yield-bearing instruments on your behalf.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-3 text-amber-900">
            <li><strong>Default lock window:</strong> 30 days from the most recent qualifying credit. The minimum permitted window is 15 days.</li>
            <li><strong>Auto-renewal on deposit:</strong> Every deposit, internal transfer, or incoming wire that credits a savings account resets the maturity date to <em>now + lock window</em> — or extends it, whichever is later. Your savings stay productive only while locked.</li>
            <li><strong>Restricted operations during lock:</strong> withdrawals, outgoing transfers, outgoing wires, and bill payments from a locked savings account are blocked and will return an HTTP 423 (<code>SAVINGS_LOCKED</code>) response. Incoming credits are always permitted.</li>
            <li><strong>Maturity:</strong> when the lock expires, the account becomes a normal demand-savings account. The next deposit will start a fresh lock cycle automatically.</li>
            <li><strong>Visibility:</strong> the dashboard, accounts list, and account-detail page each surface the current lock status, days remaining, and the maturity date so you always know when funds become available.</li>
            <li><strong>Hardship requests:</strong> emergency early-release is reviewed case-by-case via <strong>support@kapita.example</strong>. Approval may incur an early-release adjustment.</li>
          </ul>
          <p className="text-xs text-amber-900 mt-3">
            By opening a Kapita savings account you accept this maturity-lock policy. The full mechanics (status codes, extension rules, and override conditions) are restated in the Terms of Service.
          </p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
