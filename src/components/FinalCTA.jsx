import React from 'react'
import { motion } from 'framer-motion'
import { Flame, ArrowRight } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="relative py-24 lg:py-36 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900 via-orient-800/60 to-orient-900" />

      {/* PODMIEŃ: /images/dragon-cta.png – dramatyczna grafika smoka lub wschodu słońca nad świątynią */}
      <div
        className="absolute inset-0 opacity-40 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/dragon-cta.svg')" }}
      />

      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-gradient-radial from-gold-700/20 via-transparent to-transparent pointer-events-none"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Ornament top */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-16 sm:w-32 h-px bg-gradient-to-r from-transparent to-gold-600/50" />
          <div className="text-gold-600 font-display text-base tracking-widest">⬦ 龍 ⬦</div>
          <div className="w-16 sm:w-32 h-px bg-gradient-to-l from-transparent to-gold-600/50" />
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-gold-600/40 bg-gold-900/20 backdrop-blur-sm text-gold-400 text-xs font-medium tracking-widest uppercase"
        >
          <Flame size={12} className="text-crimson-500" />
          Ostatnia szansa na zmiany
          <Flame size={12} className="text-crimson-500" />
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-display font-black text-3xl sm:text-4xl lg:text-6xl text-white mb-6 leading-tight text-shadow-gold"
        >
          Masz projekt Metin2{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500">
            z potencjałem?
          </span>
          <br />
          <span className="text-stone-300 text-2xl sm:text-3xl lg:text-4xl font-bold">
            Porozmawiajmy.
          </span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-stone-400 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Szukamy ambitnych twórców, którzy chcą zbudować coś{' '}
          <span className="text-gold-400 font-semibold">większego niż kolejny sezonowy serwer.</span>{' '}
          Mamy kapitał, struktury i ludzi. Czy masz projekt?
        </motion.p>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.a
            href="#formularz"
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="group relative px-10 py-5 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-display font-black text-lg rounded-xl overflow-hidden shadow-xl shadow-gold-700/40 hover:shadow-gold-500/60 transition-shadow duration-300 tracking-wide flex items-center gap-3"
          >
            <Flame size={20} />
            Zgłoś projekt teraz
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            <span className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.a>
        </motion.div>

        {/* Small print */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 text-stone-600 text-xs tracking-wide"
        >
          Bezpłatna wstępna analiza · Bez zobowiązań · Odpowiadamy w 2–5 dni roboczych
        </motion.p>

        {/* Bottom ornament */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex items-center justify-center gap-4 mt-10"
        >
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-gold-700/40" />
          <div className="text-gold-700/50 font-display text-xs tracking-[0.4em]">TOKENUJ.PL</div>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-gold-700/40" />
        </motion.div>
      </div>
    </section>
  )
}
