import ResourcePageLayout from './ResourcePageLayout';

export default function TermsPage() {
  return (
    <ResourcePageLayout
      title="Terms and Conditions"
      subtitle="Last updated: April 2026. Please read these terms carefully before using Kapita services."
      icon="📜"
    >
      <div className="prose max-w-none text-t-secondary space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-t-primary">1. Acceptance of Terms</h2>
          <p>By opening an account or using any Kapita service, you agree to be bound by these Terms and Conditions, our Privacy Policy, and any additional terms applicable to specific products. If you do not agree, you may not use our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">2. Eligibility</h2>
          <p>You must be at least 18 years old and a legal resident of one of our supported countries (United States, Canada, United Kingdom, Germany, France, and 22 others). You must provide accurate identification and may be subject to identity verification (KYC) procedures.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">3. Account Security</h2>
          <p>You are responsible for safeguarding your login credentials. Kapita uses bank-grade encryption, but we cannot be held liable for losses arising from your failure to protect your password or device. Notify us immediately of any unauthorized access.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">4. Fees and Charges</h2>
          <p>Domestic transfers between Kapita accounts are free. International wire transfer fees are disclosed before each transaction (typically $5-25 + 0.5%-1.5% per region). Currency conversion uses live mid-market rates plus a small spread.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">5. Prohibited Activities</h2>
          <p>You agree not to use Kapita for money laundering, terrorism financing, fraud, or any unlawful purpose. We reserve the right to freeze accounts, reverse transactions, and report suspicious activity to authorities under AML/CFT regulations.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">6. Limitation of Liability</h2>
          <p>Kapita's liability is limited to direct damages and shall not exceed the fees paid by you in the 12 months preceding the event. We are not liable for indirect, consequential, or punitive damages.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">7. Account Termination</h2>
          <p>Either party may terminate the relationship with 30 days' written notice. Remaining balances will be returned to a verified account on file, less any outstanding obligations.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">8. Governing Law</h2>
          <p>These terms are governed by the laws of the jurisdiction in which your account was opened. Disputes will first be resolved through binding arbitration before resorting to courts.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-t-primary">9. Changes to Terms</h2>
          <p>We may update these terms from time to time. Material changes will be notified via email and in-app notification at least 30 days in advance.</p>
        </section>
      </div>
    </ResourcePageLayout>
  );
}
