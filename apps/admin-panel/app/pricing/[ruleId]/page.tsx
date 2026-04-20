import { PricingRuleLoader } from "../../../components/pricing-rule-loader";

type PricingRulePageProps = {
  params: Promise<{
    ruleId: string;
  }>;
};

export default async function PricingRulePage({ params }: PricingRulePageProps) {
  const { ruleId } = await params;

  return <PricingRuleLoader ruleId={ruleId} />;
}
