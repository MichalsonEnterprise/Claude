import React from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Microscope, ClipboardCheck,
  Handshake, PenLine, Zap, TrendingUp
} from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Zgłoszenie projektu',
    desc: 'Wypełniasz formularz zgłoszeniowy z podstawowymi informacjami o swoim projekcie, zespole i potrzebach.',
    color: 'gold',
  },
  {
    number: '02',
    icon: Microscope,
    title: 'Wstępna analiza',
    desc: 'Nasz zespół analizuje serwer, jego historię, społeczność, potencjał rynkowy i profil twórcy.',
    color: 'gold',
  },
  {
    number: '03',
    icon: ClipboardCheck,
    title: 'Audyt projektu',
    desc: 'Głęboki audyt modelu biznesowego, ekonomii gry, strony www, struktury przychodów i ryzyk operacyjnych.',
    color: 'crimson',
  },
  {
    number: '04',
    icon: Handshake,
    title: 'Propozycja współpracy',
    desc: 'Przedstawiamy indywidualną propozycję – zakres wsparcia, strukturę finansową, warunki i oczekiwania.',
    color: 'gold',
  },
  {
    number: '05',
    icon: PenLine,
    title: 'Podpisanie umowy',
    desc: 'Formalizujemy warunki. Umowa chroni obie strony i zapewnia przejrzystość na każdym etapie współpracy.',
    color: 'crimson',
  },
  {
    number: '06',
    icon: Zap,
    title: 'Wsparcie operacyjne',
    desc: 'Uruchamiamy wsparcie finansowe, marketingowe, technologiczne i operacyjne zgodnie z ustalonym planem.',
    color: 'gold',
  },
  {
    number: '07',
    icon: TrendingUp,
    title: 'Skalowanie projektu',
    desc: 'Razem rozwijamy projekt, optymalizujemy wyniki, wchodzimy na nowe rynki i budujemy długofalową wartość.',
    color: 'gold',
  },
]

export default function Process() {
  return (
    <section id="proces" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900 to-orient-800/50" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-gold-700/40 bg-gold-900/20 text-gold-400 text-xs font-medium tracking-widest uppercase">
            Droga do Partnerstwa
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Jak wygląda{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              nasz proces?
            </span>
          </h2>
          <p className="text-stone-400 text-base lg:text-lg max-w-2xl mx-auto">
            Każda współpraca zaczyna się od prostego formularza. Od tego momentu prowadzimy
            Cię przez każdy etap – transparentnie i krok po kroku.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold-600/50 via-gold-700/20 to-transparent" />

          <div className="space-y-8">
            {steps.map((step, i) => {
              const Icon = step.icon
              const isLeft = i % 2 === 0
              const isGold = step.color === 'gold'

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`relative flex items-start gap-6 sm:gap-0 ${
                    isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  {/* Step card */}
                  <div
                    className={`pl-20 sm:pl-0 w-full sm:w-[calc(50%-2.5rem)] ${
                      isLeft ? 'sm:pr-8' : 'sm:pl-8'
                    }`}
                  >
                    <div
                      className={`p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
                        isGold
                          ? 'border-gold-800/50 bg-orient-900/80 hover:border-gold-600/50'
                          : 'border-crimson-800/50 bg-orient-900/80 hover:border-crimson-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isGold
                              ? 'bg-gold-900/50 border border-gold-700/50'
                              : 'bg-crimson-900/50 border border-crimson-700/50'
                          }`}
                        >
                          <Icon
                            size={15}
                            className={isGold ? 'text-gold-400' : 'text-crimson-400'}
                          />
                        </div>
                        <span
                          className={`font-display font-black text-sm tracking-wider ${
                            isGold ? 'text-gold-600' : 'text-crimson-600'
                          }`}
                        >
                          KROK {step.number}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-white text-base mb-2">
                        {step.title}
                      </h3>
                      <p className="text-stone-400 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>

                  {/* Center node */}
                  <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 top-5 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg z-10 ${
                        isGold
                          ? 'border-gold-500 bg-orient-900 shadow-gold-700/40'
                          : 'border-crimson-500 bg-orient-900 shadow-crimson-700/40'
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isGold ? 'bg-gold-500' : 'bg-crimson-500'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-stone-400 text-sm mb-6">
            Cały proces trwa zazwyczaj od{' '}
            <span className="text-gold-400 font-semibold">7 do 21 dni</span> od zgłoszenia
            do podpisania umowy.
          </p>
          <a
            href="#formularz"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-display font-bold text-base rounded-xl shadow-lg shadow-gold-700/30 hover:shadow-gold-500/50 hover:-translate-y-1 transition-all duration-300"
          >
            <FileText size={18} />
            Zacznij od kroku 1
          </a>
        </motion.div>
      </div>
    </section>
  )
}
