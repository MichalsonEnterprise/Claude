import React from 'react'
import { motion } from 'framer-motion'
import {
  Coins, TrendingUp, Building2, Layers, Target, Search,
  Megaphone, Globe, Cpu, Gem
} from 'lucide-react'

const services = [
  {
    icon: Coins,
    title: 'Sponsoring Projektu',
    desc: 'Bezpośrednie finansowanie wybranych projektów, które spełniają nasze kryteria jakości i potencjału rynkowego.',
    tag: 'Finansowe',
  },
  {
    icon: TrendingUp,
    title: 'Finansowanie Startu i Rozwoju',
    desc: 'Kapitał na premierę serwera, opłacenie infrastruktury, licencji, narzędzi marketingowych i wynagrodzenia zespołu.',
    tag: 'Finansowe',
  },
  {
    icon: Building2,
    title: 'Spółki Celowe',
    desc: 'Tworzymy dedykowane struktury prawne pod konkretny projekt – by biznes był legalny, skalowalny i gotowy na inwestorów.',
    tag: 'Prawne',
  },
  {
    icon: Layers,
    title: 'Alternatywne Finansowanie',
    desc: 'Niestandardowe modele finansowania dostosowane do specyfiki projektu – crowdfunding, przychody z tokenów, revenue share.',
    tag: 'Finansowe',
  },
  {
    icon: Target,
    title: 'Strategia Biznesowa',
    desc: 'Budujemy model monetyzacji, plan działania i roadmapę dla projektu – od startu po skalowanie i exit.',
    tag: 'Strategiczne',
  },
  {
    icon: Search,
    title: 'Audyt Projektu',
    desc: 'Kompleksowy audyt serwera: ekonomia gry, strona www, jakość community, potencjał przychodów, ryzyka operacyjne.',
    tag: 'Analityczne',
  },
  {
    icon: Megaphone,
    title: 'Zespół Marketingowy',
    desc: 'Dedykowany zespół marketingowy przygotowujący kreacje, kampanie, content i strategię obecności w sieci.',
    tag: 'Marketing',
  },
  {
    icon: Globe,
    title: 'Kampanie Reklamowe',
    desc: 'Wsparcie przy planowaniu i realizacji kampanii na YouTube, TikTok, Facebook, forach i portalach gamingowych.',
    tag: 'Marketing',
  },
  {
    icon: Cpu,
    title: 'Wsparcie Technologiczne',
    desc: 'Doradztwo techniczne, pomoc w doborze infrastruktury, optymalizacja wydajności i bezpieczeństwo projektu.',
    tag: 'Tech',
  },
  {
    icon: Gem,
    title: 'Konsultacje Web3 & Tokenizacja',
    desc: 'Dla projektów gotowych na kolejny krok – systemy lojalnościowe, tokeny, NFT, DAO i nowoczesna monetyzacja gamingowa.',
    tag: 'Innowacje',
  },
]

const tagColors = {
  Finansowe: 'text-gold-400 bg-gold-900/30 border-gold-700/40',
  Prawne: 'text-sky-400 bg-sky-900/30 border-sky-700/40',
  Strategiczne: 'text-violet-400 bg-violet-900/30 border-violet-700/40',
  Analityczne: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
  Marketing: 'text-crimson-400 bg-crimson-900/30 border-crimson-700/40',
  Tech: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40',
  Innowacje: 'text-fuchsia-400 bg-fuchsia-900/30 border-fuchsia-700/40',
}

export default function Services() {
  return (
    <section id="oferta" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900 to-orient-800/60" />

      {/* Decorative large rune */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[20rem] text-gold-900/5 select-none pointer-events-none leading-none">
        龍
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-gold-700/40 bg-gold-900/20 text-gold-400 text-xs font-medium tracking-widest uppercase">
            Zakres Współpracy
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Co{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              oferujemy?
            </span>
          </h2>
          <p className="text-stone-400 text-base lg:text-lg max-w-2xl mx-auto">
            Kompleksowe wsparcie – od kapitału po marketing, od struktury prawnej po
            nowoczesne technologie. Wszystko pod jednym dachem.
          </p>
        </motion.div>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {services.map((svc, i) => {
            const Icon = svc.icon
            return (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="card-hover group relative p-5 rounded-2xl border border-gold-900/40 bg-orient-900/60 backdrop-blur-sm hover:border-gold-600/40"
              >
                {/* Top gradient bar */}
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gold-600/30 to-transparent" />

                {/* Tag */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mb-4 ${
                    tagColors[svc.tag]
                  }`}
                >
                  {svc.tag}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-gold-900/30 border border-gold-800/40 flex items-center justify-center mb-4 group-hover:border-gold-600/60 transition-colors duration-300">
                  <Icon size={18} className="text-gold-400" />
                </div>

                <h3 className="font-display font-bold text-white text-base mb-2 leading-snug">
                  {svc.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-400 transition-colors duration-300">
                  {svc.desc}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 p-6 rounded-2xl border border-gold-700/30 bg-gold-900/10 text-center max-w-3xl mx-auto"
        >
          <p className="text-stone-300 text-sm leading-relaxed">
            <span className="text-gold-400 font-semibold">Zakres wsparcia dobierany jest indywidualnie</span>{' '}
            do potrzeb i etapu rozwoju każdego projektu. Nie oferujemy szablonów – tworzymy
            dedykowane strategie.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
