import { PlaceholderPage } from "@/components/ui/placeholder-page";

export default function PoliciesPage() {
  return (
    <PlaceholderPage
      eyebrow="Policies"
      title="Policy and legal pages"
      description="A clean area for privacy policy, terms, cookie details, and internal business policy links."
      bullets={[
        "Privacy policy and terms surfaces.",
        "Cookie and data handling references.",
        "Internal links for moderation or compliance docs.",
        "Simple content layout matching the new dashboard style.",
      ]}
    />
  );
}
