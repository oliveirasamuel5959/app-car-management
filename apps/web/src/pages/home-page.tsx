import Hero from './home/hero';
import Features from './home/features';
import Audiences from './home/audiences';
import HowItWorks from './home/how-it-works';
import FinalCta from './home/cta';

/**
 * Public landing page. The surrounding chrome (header/footer) is provided by
 * LandingLayout, wired up in App.tsx.
 */
const Home = () => (
  <>
    <Hero />
    <Features />
    <Audiences />
    <HowItWorks />
    <FinalCta />
  </>
);

export default Home;
