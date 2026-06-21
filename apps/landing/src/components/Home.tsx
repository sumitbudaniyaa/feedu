import { Nav } from './Nav.js';
import { Footer } from './Footer.js';
import { Hero } from './sections/Hero.js';
import { ValueProp } from './sections/ValueProp.js';
import { MultiOutput } from './sections/MultiOutput.js';
import { Bento } from './sections/Bento.js';
import { Enterprise } from './sections/Enterprise.js';
import { UseCases } from './sections/UseCases.js';
import { FinalCTA } from './sections/FinalCTA.js';

export function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        {/* <Logos /> */} 
        <ValueProp />
        <MultiOutput />
        <Bento />
        <Enterprise />
        <UseCases />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
