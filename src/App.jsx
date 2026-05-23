import React from 'react'
import ParticleBackground from './components/ParticleBackground'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ForWho from './components/ForWho'
import Services from './components/Services'
import SPVSection from './components/SPVSection'
import Requirements from './components/Requirements'
import Process from './components/Process'
import ContactForm from './components/ContactForm'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="relative min-h-screen bg-orient-900 text-stone-200 overflow-x-hidden">
      {/* Global particle canvas – fixed behind everything */}
      <ParticleBackground />

      {/* Navigation */}
      <Navbar />

      <main>
        {/* 1. Hero */}
        <Hero />

        {/* Section separator */}
        <div className="section-divider" />

        {/* 2. For who */}
        <ForWho />

        <div className="section-divider" />

        {/* 3. Services */}
        <Services />

        <div className="section-divider" />

        {/* 4. SPV / Special Purpose Vehicles */}
        <SPVSection />

        <div className="section-divider" />

        {/* 5. Requirements */}
        <Requirements />

        <div className="section-divider" />

        {/* 6. Process */}
        <Process />

        <div className="section-divider" />

        {/* 7. Contact form */}
        <ContactForm />

        <div className="section-divider" />

        {/* 8. Final CTA */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  )
}
