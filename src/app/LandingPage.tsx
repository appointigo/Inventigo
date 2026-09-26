"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  BarChartOutlined,
  BarcodeOutlined,
  CheckOutlined,
  CloseOutlined,
  CustomerServiceOutlined,
  MenuOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import styles from "./LandingPage.module.css";
import type { PublicPricingCatalog } from "@/modules/marketing/pricingCatalog";

const benefitIcons = [<BarcodeOutlined key="billing" />, <ShoppingCartOutlined key="catalog" />, <ShopOutlined key="stock" />, <SwapOutlined key="returns" />, <CustomerServiceOutlined key="customers" />, <BarChartOutlined key="reports" />];
const industries = [
  {
    name: "Clothing & Apparel",
    status: "Available now",
    image: "/images/landing/industry-clothing.png",
    available: true,
  },
  { name: "Accessories", status: "Planned", image: "/images/landing/industry-accessories.png" },
  { name: "Footwear", status: "Planned", image: "/images/landing/industry-footwear.png" },
  { name: "Electronics", status: "Planned", image: "/images/landing/industry-electronics.png" },
];
const faqs = [
  [
    "What is Stockiva?",
    "Stockiva is a web-based retail operations platform that brings billing, inventory, products, customers, returns and reporting into one workspace.",
  ],
  [
    "Is Stockiva only for clothing stores?",
    "Clothing retail is the first supported focus. The platform is designed to expand to other retail industries, but those industry-specific experiences are still planned.",
  ],
  [
    "Do I need special hardware?",
    "Stockiva runs in a modern web browser. Barcode workflows can use compatible scanning hardware, but exact requirements depend on your store setup.",
  ],
  [
    "What changes with Growth?",
    "Growth adds multi-store visibility, employee roles, purchasing, expenses, attendance, customer follow-ups and unmet-demand capture. Direct atomic stock transfers between stores are not currently included.",
  ],
  ["Does Business use different software?", "No. Business includes Growth and is a tailored commercial rollout for larger chains, with proposed store and user scale agreed during the sales conversation."],
  ["Are WhatsApp messaging charges included?", "No. Meta bills the merchant separately for Meta messaging charges. Stockiva’s optional add-on covers its software and management layer, subject to live account validation."],
  ["Are analytics included?", "Essential daily sales and stock reporting is included in every core plan. Deeper margin, sell-through, stock-cover, diagnostic and demand analysis is an optional add-on."],
  [
    "Can I try Stockiva before subscribing?",
    "You can explore the public simulated demo or request a guided demonstration. Commercial trial terms have not yet been finalized.",
  ],
  [
    "How does a demo work?",
    "Tell us about your store and we’ll arrange a practical walkthrough focused on the workflows relevant to you.",
  ],
  [
    "How do I get pricing information?",
    "Request pricing for the setup that fits your business. Published package prices and entitlements are not yet final.",
  ],
];

function Logo() {
  return (
    <span className={styles.logo}>
      <span className={styles.logoMark} aria-hidden="true" />
      Stockiva
    </span>
  );
}

export function DashboardMock() {
  return (
    <div className={styles.device} aria-label="Stockiva product dashboard preview">
      <div className={styles.deviceTop}>
        <Logo />
        <span>Demo Store</span>
      </div>
      <div className={styles.dashboardBody}>
        <aside className={styles.mockNav}>
          {["Overview", "Billing", "Products", "Inventory", "Customers", "Reports"].map(
            (item, i) => (
              <span className={i === 0 ? styles.mockActive : ""} key={item}>
                {item}
              </span>
            )
          )}
        </aside>
        <div className={styles.mockMain}>
          <div className={styles.mockSearch}>Search products, customers or invoices…</div>
          <div className={styles.metrics}>
            {[
              ["Today’s sales", "₹24,680", "+12%"],
              ["Orders", "48", "+8"],
              ["Low stock", "12", "Review"],
              ["Customers", "7", "+16%"],
            ].map(([label, value, meta]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
                <em>{meta}</em>
              </div>
            ))}
          </div>
          <div className={styles.chartPanel}>
            <div>
              <strong>Sales trend</strong>
              <small>This week</small>
            </div>
            <div className={styles.bars}>
              {[34, 48, 39, 72, 58, 84, 66, 78].map((height, i) => (
                <i key={i} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className={styles.orders}>
            <strong>Recent orders</strong>
            {[
              ["INV-0042", "Aman Verma", "₹2,499"],
              ["INV-0041", "Priya Singh", "₹1,299"],
              ["INV-0040", "Walk-in", "₹3,799"],
            ].map((row) => (
              <div key={row[0]}>
                <span>{row[0]}</span>
                <span>{row[1]}</span>
                <b>{row[2]}</b>
                <em>Completed</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ pricingCatalog }: { pricingCatalog: PublicPricingCatalog }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");
  const nav = useMemo(
    () =>
      [
        ["Product", "#product"],
        ["Industries", "#industries"],
        ["Pricing", "#pricing"],
        ["Demo", "/demo"],
        ["FAQ", "#faq"],
      ] as const,
    []
  );
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  async function submitDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("sending");
    setFormMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/demo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (response?.ok) {
      form.reset();
      setFormState("success");
      setFormMessage("Thanks — your request has been sent. We’ll be in touch.");
    } else {
      setFormState("error");
      setFormMessage(payload.error || "We couldn’t send your request. Please try again later.");
    }
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Stockiva home">
          <Logo />
        </Link>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          aria-controls="primary-navigation"
        >
          {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
        <nav
          id="primary-navigation"
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}
          aria-label="Primary navigation"
        >
          {nav.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login">Login</Link>
          <a className={styles.darkButton} href="#book-demo">
            Book a Free Demo <ArrowRightOutlined />
          </a>
        </div>
      </header>
      <section className={styles.hero}>
        <Image
          className={styles.heroPhoto}
          src="/images/landing/hero-retail.png"
          alt="A warm, contemporary retail interior"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Retail POS for modern businesses</span>
          <h1>
            One Platform.
            <br />
            <em>Smarter</em> Retail.
          </h1>
          <p>
            Meet Stockiva, your everyday partner for billing, inventory, customers and everything
            that keeps your store moving.
          </p>
          <p className={styles.heroNote}>
            Built for clothing retailers today, with more retail solutions on the way.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.primaryButton} href="#book-demo">
              Book a Free Demo <ArrowRightOutlined />
            </a>
            <Link className={styles.secondaryButton} href="/demo">
              Explore Interactive Demo
            </Link>
          </div>
          <div className={styles.trustLine}>
            {["No credit card required", "Personalised demo", "Setup conversation"].map((item) => (
              <span key={item}>
                <CheckOutlined />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.heroProduct}>
          <DashboardMock />
        </div>
      </section>
      <section className={styles.industryStrip} id="industries">
        <div className={styles.industryIntro}>
          <span className={styles.eyebrow}>Built for retail</span>
          <h2>Starting with fashion.</h2>
        </div>
        <div className={styles.industryGrid}>
          {industries.map((item) => (
            <article
              className={`${styles.industryCard} ${item.available ? styles.availableCard : ""}`}
              key={item.name}
            >
              <div className={styles.industryImage}>
                <Image
                  src={item.image}
                  alt={`${item.name} retail display`}
                  fill
                  sizes="(max-width: 700px) 70vw, 22vw"
                />
              </div>
              <div>
                <h3>{item.name}</h3>
                <span className={item.available ? styles.available : styles.planned}>
                  {item.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.featureSection} id="product">
        <div className={styles.featureLead}>
          <span className={styles.eyebrowLight}>Designed for real stores</span>
          <h2>
            Everything your store needs.
            <br />
            Nothing it doesn’t.
          </h2>
          <p>Spend less time switching between tools and more time running your business.</p>
          <Link className={styles.lightButton} href="/demo">
            Explore the product <ArrowRightOutlined />
          </Link>
        </div>
        <div className={styles.featureGrid}>
          {pricingCatalog.featureGroups.filter((group) => group.public !== false).slice(0, 8).map((group, index) => (
            <article key={group.id}>
              <i>{benefitIcons[index % benefitIcons.length]}</i>
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.workflowSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>See it in action</span>
          <h2>From setup to your first sale.</h2>
          <p>Three practical steps bring your everyday retail work into one clear system.</p>
        </div>
        <div className={styles.workflowGrid}>
          <div className={styles.steps}>
            {[
              [
                "01",
                "Set up your store",
                "Create your store profile and configure the essentials.",
              ],
              ["02", "Bring in your products", "Add categories, variants, prices and stock."],
              ["03", "Start selling", "Create bills and understand everyday business activity."],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
          <DashboardMock />
        </div>
      </section>
      <section className={styles.showcaseSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>A clearer view</span>
          <h2>Know what’s happening across your business.</h2>
        </div>
        <div className={styles.showcaseGrid}>
          {[
            ["Products", "Organise styles, variants and pricing."],
            ["Inventory", "See size-wise stock and low-stock signals."],
            ["Billing", "Move from product search to a clear bill."],
            ["Customers", "Keep purchase history and customer details together."],
            ["Reports", "Review sales and inventory information in context."],
          ].map(([title, text], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.demoBanner}>
        <div>
          <span className={styles.eyebrowLight}>Simulated. Safe. Yours to explore.</span>
          <h2>
            Don’t just take our word for it.
            <br />
            Explore Stockiva yourself.
          </h2>
          <p>
            Try a representative clothing catalogue, size-wise stock and a simulated cart without
            touching production data.
          </p>
        </div>
        <Link className={styles.lightButton} href="/demo">
          Explore Interactive Demo <ArrowRightOutlined />
        </Link>
      </section>
      <section className={styles.pricingSection} id="pricing">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Pricing</span>
          <h2>A plan for every stage of your business.</h2>
          <p>
            Essential retail operations stay in every plan. Pricing and limits are commercial
            proposals, so we’ll recommend the right setup after learning about your store.
          </p>
        </div>
        {pricingCatalog.mode === "draft-preview" && (
          <p className={styles.previewNotice}>Draft preview · package placement is under commercial review</p>
        )}
        <div className={styles.pricingGrid}>
          {pricingCatalog.plans.slice().sort((a, b) => a.order - b.order).map((plan) => (
            <article className={plan.highlighted ? styles.featuredPrice : ""} key={plan.id}>
              {plan.highlighted && <span className={styles.popular}>Best for growing retail</span>}
              <span className={styles.planEyebrow}>{plan.eyebrow}</span>
              <h3>{plan.name}</h3>
              <strong>{plan.price.displayMode === "contact-sales" ? "Contact sales" : pricingCatalog.priceDisplayFallback}</strong>
              <p>{plan.target}</p>
              {pricingCatalog.mode === "draft-preview" ? (
                <ul className={styles.planFeatures}>{plan.headlineFeatures.map((feature) => <li key={feature}><CheckOutlined /> {feature}</li>)}</ul>
              ) : (
                <p className={styles.publicationHold}>Package contents are under commercial review. Request a demo for the currently available workflow.</p>
              )}
              {plan.legalNote && <small className={styles.planLegal}>{plan.legalNote}</small>}
              <a className={styles.planCta} href={plan.cta.href}>
                {plan.cta.label} <ArrowRightOutlined />
              </a>
            </article>
          ))}
        </div>
        <div className={styles.addOnHeading}>
          <span className={styles.eyebrow}>Optional add-ons</span>
          <h2>Add deeper communication or analysis to any plan.</h2>
        </div>
        <div className={styles.addOnGrid}>
          {pricingCatalog.addOns.map((addOn) => (
            <article key={addOn.id}>
              <span className={styles.addOnBadge}>Available with every plan</span>
              <h3>{addOn.name}</h3>
              <strong>{pricingCatalog.priceDisplayFallback}</strong>
              {pricingCatalog.mode === "draft-preview" ? <ul className={styles.planFeatures}>{addOn.highlights.map((item) => <li key={item}><CheckOutlined /> {item}</li>)}</ul> : <p className={styles.publicationHold}>Preview package · not yet publicly launched.</p>}
              {(addOn.billingDisclosure || addOn.disclosure) && <p className={styles.addOnDisclosure}>{addOn.billingDisclosure || addOn.disclosure}</p>}
              <a className={styles.planCta} href="#book-demo">Discuss this add-on <ArrowRightOutlined /></a>
            </article>
          ))}
        </div>
        <div className={styles.comparison} id="compare-plans">
          <div className={styles.comparisonIntro}>
            <span className={styles.eyebrow}>Compare plans</span>
            <h2>Explore what fits your operation.</h2>
            <p>Open a category to compare customer-facing capabilities. Internal platform tooling is never shown here.</p>
          </div>
          {pricingCatalog.featureGroups.filter((group) => group.public !== false).map((group) => {
            const rows = group.featureIds.map((id) => pricingCatalog.featureCatalog.find((feature) => feature.id === id)).filter(Boolean);
            if (!rows.length) return null;
            return (
              <details className={styles.comparisonGroup} key={group.id}>
                <summary><span><strong>{group.title}</strong><small>{group.subtitle}</small></span><span aria-hidden="true">+</span></summary>
                <div className={styles.comparisonRows}>
                  {rows.map((feature) => feature && (
                    <article key={feature.id}>
                      <div><strong>{feature.name}</strong><p>{feature.summary}</p></div>
                      <div className={styles.planStates}>
                        {pricingCatalog.plans.map((plan) => {
                          const planRank = pricingCatalog.planOrder.indexOf(plan.id);
                          const minimumRank = feature.minimumPlan ? pricingCatalog.planOrder.indexOf(feature.minimumPlan) : -1;
                          const state = feature.addOn ? "Requires add-on" : feature.marketingVisibility === "roadmap" || !feature.publishAsAvailable ? "Planned" : minimumRank >= 0 && planRank >= minimumRank ? "Included" : "Not included";
                          return <span data-state={state} key={plan.id}><b>{plan.name}</b>{state}</span>;
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
      <section className={styles.bookingSection} id="book-demo">
        <div className={styles.bookingCopy}>
          <span className={styles.eyebrowLight}>A practical walkthrough</span>
          <h2>See what Stockiva can do for your store.</h2>
          <p>
            Tell us a little about your business. We’ll show you how Stockiva works and answer your
            questions.
          </p>
          <ul>
            <li>
              <CheckOutlined /> Focused on your store’s workflow
            </li>
            <li>
              <CheckOutlined /> No pressure or payment details
            </li>
            <li>
              <CheckOutlined /> Honest answers about what’s available
            </li>
          </ul>
        </div>
        <form className={styles.demoForm} onSubmit={submitDemo}>
          <div className={styles.formGrid}>
            <label>
              Full name
              <input name="fullName" autoComplete="name" required minLength={2} />
            </label>
            <label>
              Business name
              <input name="businessName" autoComplete="organization" required minLength={2} />
            </label>
            <label>
              Mobile number
              <input
                name="mobile"
                inputMode="tel"
                autoComplete="tel"
                required
                pattern="[0-9+ ()-]{8,18}"
              />
            </label>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              City
              <input name="city" autoComplete="address-level2" required />
            </label>
            <label>
              Business type
              <select name="businessType" required defaultValue="">
                <option value="" disabled>
                  Select type
                </option>
                <option>Clothing & Apparel</option>
                <option>Accessories</option>
                <option>Footwear</option>
                <option>Electronics</option>
                <option>Other retail</option>
              </select>
            </label>
            <label>
              Number of stores
              <select name="storeCount" required defaultValue="1">
                <option value="1">1 store</option>
                <option value="2-5">2–5 stores</option>
                <option value="6-20">6–20 stores</option>
                <option value="21+">21+ stores</option>
              </select>
            </label>
            <label className={styles.fullField}>
              Optional message
              <textarea name="message" rows={4} maxLength={1000} />
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <button className={styles.primaryButton} disabled={formState === "sending"}>
            {formState === "sending" ? "Sending…" : "Book My Free Demo"} <ArrowRightOutlined />
          </button>
          <p className={styles.privacyNote}>
            No pressure. Just a conversation about your store. Your details are used only to respond
            to this request.
          </p>
          {formMessage && (
            <p role="status" className={formState === "success" ? styles.success : styles.error}>
              {formMessage}
            </p>
          )}
        </form>
      </section>
      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Questions, answered</span>
          <h2>Before you get started.</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.finalCta}>
        <h2>
          Your store has enough to handle.
          <br />
          Let Stockiva make things simpler.
        </h2>
        <p>See how your everyday operations can come together in one place.</p>
        <a className={styles.lightButton} href="#book-demo">
          Book a Free Demo <ArrowRightOutlined />
        </a>
      </section>
      <footer className={styles.footer}>
        <div>
          <Logo />
          <p>
            One platform for everyday retail operations.
            <br />
            Built for retail. Starting with fashion.
          </p>
        </div>
        <div>
          <strong>Product</strong>
          <a href="#product">Features</a>
          <Link href="/demo">Interactive demo</Link>
          <a href="#pricing">Pricing</a>
        </div>
        <div>
          <strong>Industries</strong>
          <a href="#industries">Clothing & Apparel</a>
          <a href="#industries">Planned industries</a>
        </div>
        <div>
          <strong>Company</strong>
          <a href="#book-demo">Book a demo</a>
          <Link href="/login">Login</Link>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Stockiva.</span>
          <span>Privacy and legal policy pages are not yet published.</span>
        </div>
      </footer>
    </main>
  );
}
