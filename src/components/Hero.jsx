import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Flame, Shield } from 'lucide-react'

// Floating rune ornament
function Rune({ char, className }) {
  return (
    <motion.span
      animate={{ y: [0, -12, 0], opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute font-display text-gold-600/40 select-none pointer-events-none ${className}`}
    >
      {char}
    </motion.span>
  )
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background image layer */}
      {/* PODMIEŃ: /images/dragon-bg.png – klimatyczne tło z mgłą, smokiem lub świątynią */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/dragon-bg.svg')" }}
      />

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900/60 via-orient-900/50 to-orient-900/90" />

      {/* Radial glow center */}
      <div className="absolute inset-0 bg-gradient-radial from-gold-700/10 via-transparent to-transparent" />

      {/* Animated crimson/gold glow blobs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-crimson-800/30 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-gold-700/20 blur-3xl pointer-events-none"
      />

      {/* Floating oriental runes – decorative */}
      <Rune char="龍" className="text-7xl top-16 left-[8%]" />
      <Rune char="金" className="text-5xl top-24 right-[10%]" />
      <Rune char="武" className="text-6xl bottom-32 left-[6%]" />
      <Rune char="力" className="text-4xl bottom-40 right-[8%]" />
      <Rune char="道" className="text-5xl top-1/2 left-[3%]" />

      {/* Top ornament line */}
      <div className="absolute top-24 left-0 right-0 flex items-center px-8 gap-4 pointer-events-none">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold-600/30" />
        <div className="text-gold-600/50 font-display text-xs tracking-[0.3em] uppercase">
          Tokenuj.pl
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold-600/30" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 sm:px-8 max-w-5xl mx-auto pt-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-gold-600/40 bg-gold-900/20 backdrop-blur-sm text-gold-400 text-xs font-medium tracking-widest uppercase"
        >
          <Flame size={12} className="text-crimson-500" />
          Gaming Investment Platform
          <Flame size={12} className="text-crimson-500" />
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-display font-black text-4xl sm:text-5xl lg:text-7xl leading-tight mb-6 text-shadow-gold"
        >
          <span className="text-white">Finansowanie</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500">
            i Sponsoring
          </span>
          <br />
          <span className="text-white text-3xl sm:text-4xl lg:text-5xl">
            dla prywatnych serwerów
          </span>
          <br />
          <span className="text-crimson-400 text-3xl sm:text-4xl lg:text-5xl">Metin2</span>
        </motion.h1>

        {/* Divider ornament */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent to-gold-500" />
          <div className="text-gold-500 text-lg">⬦</div>
          <div className="w-4 h-px bg-gold-500" />
          <div className="text-gold-400 font-display text-sm tracking-widest">龍</div>
          <div className="w-4 h-px bg-gold-500" />
          <div className="text-gold-500 text-lg">⬦</div>
          <div className="w-16 sm:w-24 h-px bg-gradient-to-l from-transparent to-gold-500" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-stone-300 text-base sm:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed mb-12"
        >
          <strong className="text-gold-400">Tokenuj.pl</strong> wspiera ambitne projekty gamingowe,
          zapewniając{' '}
          <span className="text-gold-300">finansowanie, spółki celowe, marketing, audyt</span>,
          zespół specjalistów oraz alternatywne modele monetyzacji.
          <span className="block mt-2 text-stone-400 text-sm sm:text-base">
            Zamieniamy wizję twórców serwerów w realny, skalowalny biznes gamingowy.
          </span>
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="#formularz"
            className="group relative px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-display font-bold text-base rounded-xl overflow-hidden shadow-lg shadow-gold-700/40 hover:shadow-gold-500/60 transition-all duration-300 hover:-translate-y-1 tracking-wide"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Flame size={18} />
              Zgłoś swój projekt
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>

          <a
            href="#dla-kogo"
            className="group px-8 py-4 border border-gold-600/50 text-gold-400 font-display font-semibold text-base rounded-xl hover:bg-gold-900/20 hover:border-gold-500 transition-all duration-300 hover:-translate-y-1 tracking-wide flex items-center gap-2"
          >
            <Shield size={18} />
            Dowiedz się więcej
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto"
        >
          {[
            { value: '100%', label: 'Legalnie' },
            { value: 'B2B', label: 'Umowy biznesowe' },
            { value: '360°', label: 'Wsparcie' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display font-black text-2xl sm:text-3xl text-gold-400 text-shadow-gold">
                {stat.value}
              </div>
              <div className="text-stone-500 text-xs tracking-wider uppercase mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-gold-600/60 text-xs tracking-widest uppercase">Przewiń</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} className="text-gold-600/60" />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orient-900 to-transparent pointer-events-none" />
    </section>
  )
}
