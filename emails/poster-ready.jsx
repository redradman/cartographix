import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
  Row,
  Column,
  Preview,
} from "@react-email/components";
import React from "react";

export default function PosterReady({
  city = "{{city}}",
  theme = "{{theme}}",
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your map poster of {city} is ready to download</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Brand */}
          <Text style={brand}>Cartographix</Text>

          {/* Main card */}
          <Section style={card}>
            {/* Dark hero */}
            <Section style={hero}>
              <Text style={heroLabel}>Your poster is ready</Text>
              <Text style={heroCity}>{city}</Text>
              <Text style={heroTheme}>{theme} theme</Text>
            </Section>

            {/* Body */}
            <Section style={bodySection}>
              <Text style={paragraph}>
                Your custom map poster of{" "}
                <span style={bold}>{city}</span> has been generated
                and is attached to this email as a high-resolution PNG.
              </Text>

              {/* Details card — rows injected by Python via placeholder */}
              <div style={detailsCard} dangerouslySetInnerHTML={{ __html: "{{details_rows}}" }} />
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <Button href="https://cartographix.radman.dev" style={ctaButton}>
                Make another poster
              </Button>
            </Section>

            <Hr style={divider} />

            {/* Footer inside card */}
            <Section style={footerSection}>
              <Text style={footerText}>
                No tracking, no marketing &mdash; just your poster.
              </Text>
            </Section>
          </Section>

          {/* Bottom links */}
          <Section style={bottomLinks}>
            <Text style={bottomLinksText}>
              Made by{" "}
              <Link href="https://radman.dev" style={link}>
                Radman
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const body = {
  backgroundColor: "#f0f0f0",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  WebkitFontSmoothing: "antialiased",
};

const container = {
  margin: "0 auto",
  padding: "48px 16px",
  maxWidth: "560px",
};

const brand = {
  textAlign: "center",
  fontSize: "20px",
  fontWeight: "700",
  color: "#18181b",
  letterSpacing: "-0.03em",
  marginBottom: "32px",
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
};

const hero = {
  backgroundColor: "#18181b",
  padding: "40px 40px 36px",
  textAlign: "center",
};

const heroLabel = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: "500",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#a1a1aa",
};

const heroCity = {
  margin: "0",
  fontSize: "28px",
  fontWeight: "700",
  color: "#ffffff",
  letterSpacing: "-0.02em",
  lineHeight: "1.2",
};

const heroTheme = {
  margin: "8px 0 0",
  fontSize: "15px",
  color: "#71717a",
};

const bodySection = {
  padding: "36px 40px",
};

const paragraph = {
  margin: "0 0 20px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#3f3f46",
};

const bold = {
  color: "#18181b",
  fontWeight: "600",
};

const detailsCard = {
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  border: "1px solid #f4f4f5",
  padding: "16px 20px",
};

const detailLabel = {
  fontSize: "13px",
  color: "#a1a1aa",
};

const detailValue = {
  fontSize: "13px",
  color: "#18181b",
  fontWeight: "500",
  textAlign: "right",
};

const ctaSection = {
  padding: "0 40px 36px",
  textAlign: "center",
};

const ctaButton = {
  backgroundColor: "#18181b",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  borderRadius: "8px",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const divider = {
  borderColor: "#f4f4f5",
  margin: "0 40px",
};

const footerSection = {
  padding: "24px 40px 32px",
};

const footerText = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#a1a1aa",
};

const bottomLinks = {
  textAlign: "center",
  paddingTop: "32px",
};

const bottomLinksText = {
  margin: "0",
  fontSize: "12px",
  color: "#a1a1aa",
};

const link = {
  color: "#71717a",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
