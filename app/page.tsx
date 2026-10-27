import Header from "@/components/generator/Header";
import Hero from "@/components/generator/Hero";
import Generator from "@/components/generator/Generator";
import Footer from "@/components/generator/Footer";

export default function HomePage() {
  return (
    <main>
      <Header activeTab="generator" />
      <Hero />
      <Generator />
      <Footer />
    </main>
  );
}
