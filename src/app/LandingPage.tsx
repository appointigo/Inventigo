"use client";

import { useEffect, useRef } from "react";
import {
  LandingGlobalStyles,
  REVEAL_CLASS,
  REVEAL_R_CLASS,
  VISIBLE_CLASS,
  Page,
  ProgBar,
  Header,
  LogoAnchor,
  LogoIconBox,
  NavBar,
  NavRegLink,
  NavLoginLink,
  HeroSection,
  HeroEyebrow,
  LiveDot,
  HeroTitle,
  HeroSub,
  HeroBtnRow,
  BtnTeal,
  BtnGlass,
  StatFloat,
  StatValue,
  StatLabel,
  MiniBarsRow,
  MiniBar,
  FeaturesGrid,
  FeatCard,
  FeatIconBox,
  Section,
  Inner,
  SectionTag,
  SectionTitle,
  SectionDesc,
  AboutGrid,
  AboutCardsGrid,
  AboutCard,
  AcIcon,
  AcTitle,
  AcDesc,
  BigStatCard,
  BigStatNum,
  BigStatLbl,
  AboutVisualPanel,
  ScreenWidget,
  ScreenWidgetTitle,
  MetricsRow,
  MetricTile,
  MtVal,
  MtLbl,
  MtChg,
  StockRowsList,
  StockRow,
  StockBadge,
  PricingSection,
  PricingGrid,
  PricingCard,
  PcPlanName,
  PcPrice,
  PcPeriod,
  PcDescText,
  PcFeatsList,
  PcFeatsItem,
  CheckMark,
  PcButton,
  PcButtonLink,
  ContactGrid,
  ContactLeft,
  ContactDetail,
  CIco,
  CLabel,
  CVal,
  ContactFormCard,
  FormRow,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  SendBtn,
  FooterSection,
  FooterInner,
  FooterTopGrid,
  FooterLogo,
  FooterDesc,
  FooterColHeader,
  FooterLinks,
  FooterBottomRow,
  FooterCopy,
  FooterSocials,
  SocialLink,
  FooterLegal,
} from "./LandingPage.styled";

const LandingPage = () => {
  const progRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      if (progRef.current) progRef.current.style.width = pct + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add(VISIBLE_CLASS), i * 80);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(`.${REVEAL_CLASS}, .${REVEAL_R_CLASS}`).forEach((el) => obs.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  return (
    <Page>
      <LandingGlobalStyles />
      <ProgBar ref={progRef} />

      {/* HEADER */}
      <Header>
        <LogoAnchor href="/">
          <LogoIconBox>📦</LogoIconBox>
          Stockiva
        </LogoAnchor>
        <NavBar>
            <NavRegLink href="/login?tab=signup">Register a new business</NavRegLink>
            <NavLoginLink href="/login">Login (for existing users)</NavLoginLink>
        </NavBar>
      </Header>

      {/* HERO */}
      <HeroSection>
        <StatFloat $pos="left">
          <StatValue style={{ color: "#fbbf24" }}>12</StatValue>
          <StatLabel>Low stock items</StatLabel>
          <div style={{ marginTop: "0.5rem", fontSize: "1rem" }}>🔔</div>
        </StatFloat>

        <StatFloat $pos="right-top">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem" }}>
            <div>
              <StatValue>248</StatValue>
              <StatLabel>Products tracked</StatLabel>
            </div>
            <MiniBarsRow>
              {[8, 14, 10, 18, 12, 20].map((h, i) => (
                <MiniBar key={i} $h={h} />
              ))}
            </MiniBarsRow>
          </div>
        </StatFloat>

        <StatFloat $pos="right-bottom">
          <StatValue style={{ color: "#06b6d4" }}>₹2.4L</StatValue>
          <StatLabel>Revenue today</StatLabel>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, marginTop: "0.3rem", color: "#10b981" }}>
            ↑ 14% vs yesterday
          </div>
        </StatFloat>

        <HeroEyebrow>
          <LiveDot />
          Live inventory intelligence
        </HeroEyebrow>

        <HeroTitle>
          Smart Inventory.<br />
          <span>Zero Guesswork.</span>
        </HeroTitle>

        <HeroSub>
          Stockiva is your central command for business maintenance. Effortlessly manage
          inventory records and gain real-time insights through an elegant interface.
        </HeroSub>

        <HeroBtnRow>
          <NavRegLink href="/login?tab=signup">Register Your Business Free</NavRegLink>
          <BtnGlass href="#about">See How It Works</BtnGlass>
        </HeroBtnRow>

        <FeaturesGrid>
          {[
            { ico: "🏢", title: "Register Business", desc: "Set up in minutes" },
            { ico: "📦", title: "Maintain Inventory", desc: "Detailed records" },
            { ico: "📊", title: "Analyse Performance", desc: "Real-time metrics" },
          ].map(({ ico, title, desc }) => (
            <FeatCard key={title}>
              <FeatIconBox>{ico}</FeatIconBox>
              <h3>{title}</h3>
              <p>{desc}</p>
            </FeatCard>
          ))}
        </FeaturesGrid>
      </HeroSection>

      {/* ABOUT */}
      <Section id="about">
        <Inner>
          <AboutGrid>
            <div className={REVEAL_CLASS}>
              <SectionTag>About Stockiva</SectionTag>
              <SectionTitle>
                Built for businesses<br />that mean business
              </SectionTitle>
              <SectionDesc>
                From a single boutique to a multi-store enterprise, Stockiva scales with you.
                Track stock in real time, manage suppliers, automate reorders, and get insights
                that drive smart decisions every day.
              </SectionDesc>

              <AboutCardsGrid>
                {[
                  { ico: "⚡", title: "Real-time Updates", desc: "Every sale and adjustment reflected instantly across all stores." },
                  { ico: "🔔", title: "Smart Alerts", desc: "Automated reorder notifications before you ever run out." },
                  { ico: "👥", title: "Team Roles", desc: "Fine-grained access for owners, managers, and staff." },
                  { ico: "🏪", title: "Multi-Store", desc: "Manage every location from a single unified dashboard." },
                ].map(({ ico, title, desc }) => (
                  <AboutCard key={title}>
                    <AcIcon>{ico}</AcIcon>
                    <AcTitle>{title}</AcTitle>
                    <AcDesc>{desc}</AcDesc>
                  </AboutCard>
                ))}
                <BigStatCard>
                  <BigStatNum>500+</BigStatNum>
                  <BigStatLbl>businesses across India trust Stockiva</BigStatLbl>
                </BigStatCard>
              </AboutCardsGrid>
            </div>

            <AboutVisualPanel className={REVEAL_R_CLASS}>
              <ScreenWidget>
                <ScreenWidgetTitle>Dashboard — Live View</ScreenWidgetTitle>
                <MetricsRow>
                  {[
                    { val: "248", lbl: "Products", chg: "+12 this week", color: "#06b6d4", up: true },
                    { val: "₹2.4L", lbl: "Revenue today", chg: "↑ 14%", color: "#fbbf24", up: true },
                    { val: "12", lbl: "Low stock", chg: "Needs attention", color: "#ef4444", up: false },
                  ].map(({ val, lbl, chg, color, up }) => (
                    <MetricTile key={lbl}>
                      <MtVal style={{ color }}>{val}</MtVal>
                      <MtLbl>{lbl}</MtLbl>
                      <MtChg $up={up}>{chg}</MtChg>
                    </MetricTile>
                  ))}
                </MetricsRow>

                <ScreenWidgetTitle style={{ marginTop: "1rem" }}>Stock Alerts</ScreenWidgetTitle>
                <StockRowsList>
                  {[
                    { name: "White Kurta Set (S)", badge: "Critical", status: "critical" as const },
                    { name: "Blue Denim Jacket (M)", badge: "4 left", status: "low" as const },
                    { name: "Oud Noir 100ml", badge: "3 left", status: "low" as const },
                    { name: "Silk Saree — Red", badge: "In stock", status: "ok" as const },
                  ].map(({ name, badge, status }) => (
                    <StockRow key={name}>
                      <span>{name}</span>
                      <StockBadge $status={status}>{badge}</StockBadge>
                    </StockRow>
                  ))}
                </StockRowsList>
              </ScreenWidget>

              <div style={{
                marginTop: "1rem", padding: "1rem", borderRadius: "0.75rem",
                background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.2)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.2rem" }}>
                    ACTIVE STORES
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>3 stores synced</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                  ))}
                </div>
              </div>
            </AboutVisualPanel>
          </AboutGrid>
        </Inner>
      </Section>

      {/* PRICING */}
      <PricingSection id="pricing">
        <Inner>
          <div className={REVEAL_CLASS} style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
            <SectionTag>Pricing</SectionTag>
            <SectionTitle>Simple, honest pricing</SectionTitle>
            <SectionDesc style={{ margin: "0 auto" }}>
              No hidden fees. Start free and scale as your business grows.
            </SectionDesc>
          </div>

          <PricingGrid className={REVEAL_CLASS}>
            <PricingCard>
              <PcPlanName>Starter</PcPlanName>
              <PcPrice>Free</PcPrice>
              <PcPeriod>Forever free</PcPeriod>
              <PcDescText>Perfect for solo entrepreneurs and small shops getting started.</PcDescText>
              <PcFeatsList>
                {["1 store", "100 products", "2 team members", "Basic stock tracking", "Email support"].map((f) => (
                  <PcFeatsItem key={f}><CheckMark>✓</CheckMark>{f}</PcFeatsItem>
                ))}
              </PcFeatsList>
              <PcButtonLink href="/login?tab=signup&plan=free">Get Started Free</PcButtonLink>
            </PricingCard>

            <PricingCard $featured>
              <PcPlanName $teal>Growth</PcPlanName>
              <PcPrice>₹2,499</PcPrice>
              <PcPeriod>per month</PcPeriod>
              <PcDescText>Everything you need to run a multi-store retail business efficiently.</PcDescText>
              <PcFeatsList>
                {["Unlimited stores", "Unlimited products", "10 team members", "Advanced analytics", "Barcode scanning", "Reorder automation"].map((f) => (
                  <PcFeatsItem key={f}><CheckMark>✓</CheckMark>{f}</PcFeatsItem>
                ))}
              </PcFeatsList>
              <PcButtonLink href="/login?tab=signup&plan=pro" $primary>Start Free Trial</PcButtonLink>
            </PricingCard>

            <PricingCard>
              <PcPlanName>Enterprise</PcPlanName>
              <PcPrice>Custom</PcPrice>
              <PcPeriod>Tailored for you</PcPeriod>
              <PcDescText>For large teams, custom integrations, and compliance needs.</PcDescText>
              <PcFeatsList>
                {["Everything in Growth", "Unlimited members", "Custom integrations", "Dedicated manager", "99.9% SLA"].map((f) => (
                  <PcFeatsItem key={f}><CheckMark>✓</CheckMark>{f}</PcFeatsItem>
                ))}
              </PcFeatsList>
              <PcButton href="#contact">Contact Sales</PcButton>
            </PricingCard>
          </PricingGrid>
        </Inner>
      </PricingSection>

      {/* CONTACT */}
      <Section id="contact">
        <Inner>
          <ContactGrid>
            <ContactLeft className={REVEAL_CLASS}>
              <SectionTag>Contact</SectionTag>
              <h2>Get in Touch</h2>
              <p>Have questions or want a personalised demo? Our team responds within one business day.</p>
              {[
                { ico: "📍", label: "Office Location", val: "Bengaluru, Karnataka · India" },
                { ico: "📞", label: "Sales Phone", val: "+91 (800) 555 0123" },
                { ico: "✉️", label: "Email", val: "hello@stockiva.in" },
              ].map(({ ico, label, val }) => (
                <ContactDetail key={label}>
                  <CIco>{ico}</CIco>
                  <div>
                    <CLabel>{label}</CLabel>
                    <CVal>{val}</CVal>
                  </div>
                </ContactDetail>
              ))}
            </ContactLeft>

            <ContactFormCard className={REVEAL_R_CLASS}>
              <FormRow>
                <FormGroup>
                  <FormLabel>Full Name</FormLabel>
                  <FormInput type="text" placeholder="Your full name" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Company</FormLabel>
                  <FormInput type="text" placeholder="Your business" />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <FormLabel>Business Email</FormLabel>
                <FormInput type="email" placeholder="you@business.com" />
              </FormGroup>
              <FormGroup>
                <FormLabel>Message</FormLabel>
                <FormTextarea placeholder="Tell us how we can help..." />
              </FormGroup>
              <SendBtn type="button">Send Inquiry</SendBtn>
            </ContactFormCard>
          </ContactGrid>
        </Inner>
      </Section>

      {/* FOOTER */}
      <FooterSection>
        <FooterInner>
          <FooterTopGrid>
            <div>
              <FooterLogo>Stock<span>iva</span></FooterLogo>
              <FooterDesc>Smart inventory and business management for modern retail teams.</FooterDesc>
            </div>
            <div>
              <FooterColHeader>Product</FooterColHeader>
              <FooterLinks>
                <li><a href="#about">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#">Changelog</a></li>
              </FooterLinks>
            </div>
            <div>
              <FooterColHeader>Company</FooterColHeader>
              <FooterLinks>
                <li><a href="#about">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#contact">Contact Sales</a></li>
              </FooterLinks>
            </div>
            <div>
              <FooterColHeader>Legal</FooterColHeader>
              <FooterLinks>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Security</a></li>
              </FooterLinks>
            </div>
          </FooterTopGrid>

          <FooterBottomRow>
            <FooterCopy>© 2026 Stockiva. All rights reserved.</FooterCopy>
            <FooterLegal>
              <a href="#about">About Us</a>
              <a href="#">Careers</a>
              <a href="#contact">Contact Sales</a>
              <a href="#">Terms</a>
              <a href="#">Privacy Policy</a>
            </FooterLegal>
            <FooterSocials>
              {["in", "𝕏", "🔗"].map((icon) => (
                <SocialLink key={icon} href="#">{icon}</SocialLink>
              ))}
            </FooterSocials>
          </FooterBottomRow>
        </FooterInner>
      </FooterSection>
    </Page>
  );
};

export default LandingPage;
