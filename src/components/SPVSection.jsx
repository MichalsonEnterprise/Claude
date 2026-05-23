import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Scale, Banknote, Users2, ArrowUpRight, Shield } from 'lucide-react'

const features = [
  {
    icon: Building2,
    title: 'Dedykowana Struktura Prawna',
    desc: 'Tworzymy spółkę celową skrojoną pod konkretny projekt – z właściwym podziałem udziałów, odpowiedzialnością i przejrzystością.',
  },
  {
    icon: Banknote,
    title: 'Zarządzanie Finansowaniem',
    desc: 'Spółka celowa odpowiada za przepływ kapitału, rozliczenia z partnerami, fakturowanie i rozliczenia podatkowe.',
  },
  {
    icon: Scale,
    title: 'Umowy i Prawo',
    desc: 'Wszystkie relacje oparte są na formalnych umowach – nie ma tutaj "handshake deals". Działa prawo, nie tylko zaufanie.',
  },
  {
    icon: Users2,
    title: 'Współpraca z Partnerami',
    desc: 'SPV umożliwia transparentną współpracę z agencjami, influencerami, dostawcami i inwestorami na profesjonalnych warunkach.',
  },
  {
    icon: ArrowUpRight,
    title: 'Skalowalność i Exit',
    desc: 'Struktura spółki celowej umożliwia pozyskanie zewnętrznych inwestorów, przejęcie lub sprzedaż projektu w przyszłości.',
  },
  {
    icon: Shield,
    title: 'Ochrona Projektu',
    desc: 'Wydzielenie projektu do SPV chroni twórców przed ryzykiem osobistym i separuje aktywa projektu od majątku prywatnego.',
  },
]

export default function SPVSection() {
  return (
    <section id="spolki" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-800/60 via-orient-900 to-orient-900" />

      {/* PODMIEŃ: /images/fantasy-gate.png – orientalna brama/świątynia jako tło sekcji */}
      <div
        className="absolute inset-0 opacity-25 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/fantasy-gate.svg')" }}
      />

      {/* Glow accent */}
      <motion.div
        animate={{ opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-3/4 rounded-full bg-gold-700/20 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-column layout: text + features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-gold-700/40 bg-gold-900/20 text-gold-400 text-xs font-medium tracking-widest uppercase">
              Struktura Biznesowa
            </div>

            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-6 leading-tight">
              Spółki celowe{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
                pod Twój projekt
              </span>
            </h2>

            {/* Ornament */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-px bg-gold-600" />
              <div className="text-gold-600 font-display text-sm">⬦ 龍 ⬦</div>
              <div className="w-12 h-px bg-gold-600/50" />
            </div>

            <div className="space-y-5 text-stone-300 text-base leading-relaxed">
              <p>
                Dla wybranych projektów{' '}
                <span className="text-gold-400 font-semibold">tworzymy dedykowaną strukturę prawną</span>{' '}
                – spółkę celową (SPV), która odpowiada za całokształt projektu: rozwój,
                finansowanie, rozliczenia, marketing i relacje z partnerami.
              </p>
              <p>
                To rozwiązanie dla twórców, którzy chcą prowadzić serwer jako{' '}
                <span className="text-gold-400 font-semibold">realny biznes gamingowy</span> –
                a nie tylko hobby. Ze strukturą, strategią i możliwością skalowania.
              </p>

              {/* Quote block */}
              <div className="relative pl-6 border-l-2 border-gold-600/60 py-2">
                <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-500 to-transparent" />
                <p className="text-gold-300 font-medium italic text-lg leading-relaxed">
                  „Nie traktujemy serwerów jako jednorazowych projektów. Budujemy strukturę,
                  która może rozwijać się jak realny biznes gamingowy."
                </p>
                <div className="mt-3 text-gold-600 text-sm font-semibold tracking-wide">
                  — Tokenuj.pl
                </div>
              </div>
            </div>

            <div className="mt-10">
              <a
                href="#formularz"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-display font-bold text-sm rounded-xl shadow-lg shadow-gold-700/30 hover:shadow-gold-500/50 hover:-translate-y-0.5 transition-all duration-300"
              >
                <Building2 size={16} />
                Chcę strukturę SPV
              </a>
            </div>
          </motion.div>

          {/* Right: Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-4 rounded-xl border border-gold-900/50 bg-orient-900/70 hover:border-gold-700/50 hover:bg-gold-900/10 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-900/40 border border-gold-800/50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-gold-600/60 transition-colors">
                      <Icon size={15} className="text-gold-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-white text-sm mb-1">
                        {feat.title}
                      </h4>
                      <p className="text-stone-500 text-xs leading-relaxed group-hover:text-stone-400 transition-colors">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
