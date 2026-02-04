import HeroSection from "@/app/components/HeroSection";
import IntroSection from "@/app/components/IntroSection";
import EquipmentSlider from "@/app/components/EquipmentSlider";
import CardioSection from "@/app/components/CardioSection";
import ProgramsSection from "@/app/components/ProgramsSection";
// import PricingSection from "@/components/PricingSection";
// import TestimonialsSection from "@/components/TestimonialsSection";

const Home = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <HeroSection />
      <IntroSection />
      <EquipmentSlider />
      <CardioSection />
      <ProgramsSection />
      {/* <PricingSection />
      <TestimonialsSection /> */}
    </main>
  );
};

export default Home;