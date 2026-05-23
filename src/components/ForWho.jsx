import React from 'react'
import { motion } from 'framer-motion'
import { Users, Rocket, TrendingUp, Briefcase, BarChart3 } from 'lucide-react'

const targets = [
  {
    icon: Users,
    title: 'Właściciele działających serwerów',
    desc: 'Masz serwer z lojalną społecznością, ale potrzebujesz kapitału, żeby go skalować, opłacić infrastrukturę lub wejść na wyższy poziom marketingu?',
    glow: 'gold',
  },
  {
    icon: Rocket,
    title: 'Zespoły planujące start',
    desc: 'Przygotowujesz premierę serwera i potrzebujesz finansowania startu, kampanii reklamowej i profesjonalnego wsparcia od pierwszego dnia?',
    glow: 'crimson',
  },
  {
    icon: TrendingUp,
    title: 'Projekty z potencjałem bez kapitału',
    desc: 'Masz świetny pomysł, silną społeczność i zaangażowany zespół, ale brakuje Ci środków na realizację pełnego potencjału projektu?',
    glow: 'gold',
  },
  {
    icon: Briefcase,
    title: 'Twórcy chcący działać legalnie',
    desc: 'Chcesz prowadzić serwer profesjonalnie, w ramach legalnej struktury, z umowami, rozliczeniami i prawdziwą firmą za plecami?',
    glow: 'gold',
  },
  {
    icon: BarChart3,
    title: 'Serwery wymagające restrukturyzacji',
    desc: 'Twój projekt utknął – ekonomia jest zaburzona, społeczność maleje, marketing nie działa? Potrzebujesz audytu i głębokiej restrukturyzacji?',
    glow: 'crimson',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: 'easeOut' },
  }),
}

export default function ForWho() {
  return (
    <section id="dla-kogo" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Section background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900 via-orient-800/50 to-orient-900" />

      {/* PODMIEŃ: /images/oriental-warrior.png – sylwetka wojownika lub mgła świątyni w tle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/2 opacity-5 bg-cover bg-right bg-no-repeat"
        style={{ backgroundImage: "url('/images/oriental-warrior.png')" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-crimson-700/40 bg-crimson-900/20 text-crimson-400 text-xs font-medium tracking-widest uppercase">
            Profil Partnera
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Dla kogo jest{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              ta oferta?
            </span>
          </h2>
          <p className="text-stone-400 text-base lg:text-lg max-w-2xl mx-auto">
            Nie szukamy serwerów – szukamy twórców gotowych budować coś więcej niż kolejny
            sezonowy projekt. Sprawdź, czy Twoje ambicje pasują do naszego programu.
          </p>

          {/* Ornament */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent to-gold-600/50" />
            <div className="text-gold-600 font-display text-sm tracking-widest">⬦ ⬦ ⬦</div>
            <div className="w-24 h-px bg-gradient-to-l from-transparent to-gold-600/50" />
          </div>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targets.map((item, i) => {
            const Icon = item.icon
            const isGold = item.glow === 'gold'
            return (
              <motion.div
                key={item.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`card-hover relative group p-6 lg:p-8 rounded-2xl border backdrop-blur-sm ${
                  isGold
                    ? 'border-gold-800/40 bg-gradient-to-br from-orient-900/80 to-gold-900/10'
                    : 'border-crimson-800/40 bg-gradient-to-br from-orient-900/80 to-crimson-900/10'
                } ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                {/* Corner ornament */}
                <div
                  className={`absolute top-3 right-3 w-8 h-8 opacity-20 font-display text-2xl leading-none text-center ${
                    isGold ? 'text-gold-400' : 'text-crimson-400'
                  }`}
                >
                  龍
                </div>

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                    isGold
                      ? 'bg-gold-900/40 border border-gold-700/40'
                      : 'bg-crimson-900/40 border border-crimson-700/40'
                  }`}
                >
                  <Icon
                    size={22}
                    className={isGold ? 'text-gold-400' : 'text-crimson-400'}
                  />
                </div>

                <h3 className="font-display font-bold text-white text-lg mb-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-stone-400 text-sm leading-relaxed">{item.desc}</p>

                {/* Bottom accent line */}
                <div
                  className={`absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    isGold
                      ? 'bg-gradient-to-r from-transparent via-gold-500 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-crimson-500 to-transparent'
                  }`}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-stone-500 text-sm">
            Rozpoznajesz siebie w powyższych opisach?{' '}
            <a href="#formularz" className="text-gold-400 hover:text-gold-300 underline underline-offset-4 transition-colors">
              Zgłoś projekt
            </a>{' '}
            i umówmy się na analizę.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
