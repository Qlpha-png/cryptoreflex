import { fetchPrices } from "@/lib/coingecko";
import GlobalMetricsBar from "@/components/GlobalMetricsBar";
import Hero from "@/components/Hero";
import PriceTicker from "@/components/PriceTicker";
import ReassuranceSection from "@/components/ReassuranceSection";
import MarketTable from "@/components/MarketTable";
import Top10CryptosSection from "@/components/Top10CryptosSection";
import HiddenGemsSection from "@/components/HiddenGemsSection";
import PlatformsSection from "@/components/PlatformsSection";
import BlogPreview from "@/components/BlogPreview";
import ToolsTeaser from "@/components/ToolsTeaser";

export const revalidate = 60;

export default async function HomePage() {
  const prices = await fetchPrices();

  return (
    <>
      <GlobalMetricsBar />
      <PriceTicker initial={prices} />
      <Hero />
      <ReassuranceSection />
      <MarketTable limit={20} />
      <Top10CryptosSection />
      <HiddenGemsSection />
      <PlatformsSection />
      <BlogPreview />
      <ToolsTeaser />
    </>
  );
}
