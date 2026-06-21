import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const UPDATED = 'June 21, 2026';
const CONTACT_EMAIL = 'sumit.k.budaniya@gmail.com';
const CONTACT_PHONE = '+91 82093 33127';
const CONTACT_PHONE_TEL = '+918209333127';
const INSTAGRAM = 'https://www.instagram.com/orderwithfeedu/';

function LegalLayout({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  // Legal pages are reached via direct links — start at the top.
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-black italic tracking-tight">feedu</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-6 sm:px-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{intro}</p>

        {children}

        <div className="mt-12 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          Questions about this page? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline underline-offset-2">{CONTACT_EMAIL}</a>,{' '}
          call{' '}
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="text-foreground underline underline-offset-2">{CONTACT_PHONE}</a>{' '}
          or message us on{' '}
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">Instagram</a>.
        </div>
      </main>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <>
          Feedu provides a QR-based ordering, payments and restaurant-management platform (the “Service”). This
          policy explains what personal information we collect when you order through the Feedu customer app, or when
          a restaurant uses our owner, kitchen and waiter tools — and how we use and protect it.
        </>
      }
    >
      <Sec title="1. Information we collect">
        <List
          items={[
            <><strong className="text-foreground">Account &amp; contact.</strong> Your phone number (used to sign you in with a one-time password), and your name where you provide it.</>,
            <><strong className="text-foreground">Order information.</strong> The items you order, your table, order history, special instructions, dietary preferences (e.g. veg filter) and loyalty/reward activity.</>,
            <><strong className="text-foreground">Payment information.</strong> Payments are processed by our payment provider (such as Razorpay). We do not store your full card, UPI or bank details — we only receive a payment status and reference.</>,
            <><strong className="text-foreground">Restaurant &amp; staff data.</strong> For restaurant users: name, role, branch and login credentials of staff accounts.</>,
            <><strong className="text-foreground">Technical data.</strong> Device and browser type, IP address, and basic usage and diagnostic data.</>,
          ]}
        />
      </Sec>

      <Sec title="2. How we use your information">
        <List
          items={[
            'Sign you in securely using a one-time password (OTP).',
            'Place your order and route it live to the kitchen, waiter and owner apps.',
            'Process payments and issue receipts through our payment provider.',
            'Run loyalty and rewards programmes you choose to take part in.',
            'Give the restaurant analytics about its own orders, sales and operations.',
            'Operate, secure, troubleshoot and improve the Service.',
            'Send you service messages related to your orders.',
          ]}
        />
      </Sec>

      <Sec title="3. How we share information">
        <p>We do not sell your personal information. We share it only as needed to run the Service:</p>
        <List
          items={[
            <>With the <strong className="text-foreground">restaurant (and its branches)</strong> whose QR code you order from, so they can prepare and fulfil your order.</>,
            <>With our <strong className="text-foreground">payment provider</strong> to process your payment.</>,
            <>With <strong className="text-foreground">infrastructure and hosting providers</strong> that help us operate the Service.</>,
            'When required by law, regulation, or to protect our rights and users.',
          ]}
        />
      </Sec>

      <Sec title="4. Cookies &amp; local storage">
        <p>
          We use cookies and local storage to keep you signed in, remember your cart and table, and understand basic
          usage so we can improve the Service. You can clear these from your browser at any time.
        </p>
      </Sec>

      <Sec title="5. Data retention">
        <p>
          We keep account and order data for as long as needed to provide the Service and to meet legal, tax and
          accounting obligations. After that, we delete or anonymise it.
        </p>
      </Sec>

      <Sec title="6. Security">
        <p>
          We protect your data with encryption in transit, access controls and hashed credentials. No method of
          transmission or storage is completely secure, but we work to keep your information safe.
        </p>
      </Sec>

      <Sec title="7. Your rights">
        <p>
          You can ask us to access, correct or delete your personal information, or withdraw consent where processing
          relies on it. Contact us using the details below and we’ll respond within a reasonable time.
        </p>
      </Sec>

      <Sec title="8. Children">
        <p>
          The Service is not directed at children under 13, and we do not knowingly collect their personal information.
        </p>
      </Sec>

      <Sec title="9. Changes to this policy">
        <p>
          We may update this policy from time to time. When we do, we’ll revise the “Last updated” date at the top of
          this page.
        </p>
      </Sec>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro={
        <>
          These Terms govern your use of Feedu — a platform that connects diners with restaurants for QR ordering,
          payments, loyalty and operations. By using the Service, you agree to these Terms.
        </>
      }
    >
      <Sec title="1. The Service">
        <p>
          Feedu provides the technology that lets you scan a restaurant’s QR code to browse its menu, place orders, pay
          and earn rewards, and lets restaurants manage those orders across their owner, kitchen and waiter apps.
        </p>
        <p>
          <strong className="text-foreground">Feedu is not the restaurant.</strong> The restaurant is solely responsible
          for its menu, pricing, food preparation, quality, safety and fulfilment of your order.
        </p>
      </Sec>

      <Sec title="2. Your account">
        <p>
          You sign in with a one-time password (OTP) sent to your phone number. Keep your phone and number secure — you
          are responsible for activity that happens under your account.
        </p>
      </Sec>

      <Sec title="3. Orders &amp; payments">
        <List
          items={[
            'An order placed through the app is a request sent to the restaurant, which may accept or decline it.',
            'Prices, taxes, packaging and other charges are set by the restaurant and shown before you confirm.',
            'Payments are handled by our payment provider (such as Razorpay). Online and cash options may be offered by the restaurant.',
            'Refunds, cancellations and modifications are subject to the restaurant’s policies.',
          ]}
        />
      </Sec>

      <Sec title="4. Loyalty &amp; rewards">
        <p>
          Where a restaurant offers loyalty points or rewards, they have no cash value, may expire, and are subject to
          the restaurant’s terms. They can be changed or withdrawn at any time.
        </p>
      </Sec>

      <Sec title="5. Acceptable use">
        <p>You agree not to misuse the Service. In particular, you will not:</p>
        <List
          items={[
            'Use the Service for fraud or any unlawful purpose.',
            'Place fake, abusive or disruptive orders.',
            'Attempt to access, scrape, interfere with or disrupt the Service or its security.',
            'Impersonate others or misrepresent your identity.',
          ]}
        />
      </Sec>

      <Sec title="6. Restaurant responsibilities">
        <p>
          If you use Feedu as a restaurant, you are responsible for the accuracy of your menu and pricing, food safety
          and quality, fulfilling orders, complying with applicable law, and for the staff accounts and data within
          your organisation.
        </p>
      </Sec>

      <Sec title="7. Intellectual property">
        <p>
          Feedu and all related software, design and content are owned by us and protected by law. We grant you a
          limited, non-exclusive, non-transferable right to use the Service as intended.
        </p>
      </Sec>

      <Sec title="8. Disclaimers">
        <p>
          The Service is provided “as is” and “as available”. We do not guarantee that it will be uninterrupted or
          error-free. Food, service and order fulfilment are the responsibility of the restaurant, not Feedu.
        </p>
      </Sec>

      <Sec title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Feedu is not liable for any indirect, incidental or consequential
          damages, or for issues arising from a restaurant’s food, service or fulfilment.
        </p>
      </Sec>

      <Sec title="10. Termination">
        <p>
          We may suspend or terminate access to the Service if these Terms are breached or to protect the Service and
          its users.
        </p>
      </Sec>

      <Sec title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after changes take effect means you
          accept the updated Terms.
        </p>
      </Sec>

      <Sec title="12. Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-law principles.
        </p>
      </Sec>
    </LegalLayout>
  );
}
