import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'

const requirements = [
  'Podpisanie formalnej umowy współpracy',
  'Działanie z najwyższą starannością i profesjonalizmem',
  'Regularne raportowanie postępów (tygodniowo / miesięcznie)',
  'Pełna transparentność finansowa i techniczna projektu',
  'Dbanie o społeczność graczy i reputację serwera',
  'Przestrzeganie wszystkich ustalonych zasad biznesowych',
  'Gotowość do działania w ramach legalnych struktur',
  'Traktowanie projektu jak realnego przedsięwzięcia biznesowego',
]

const dealbreakers = [
  'Ukrywanie informacji finansowych lub technicznych',
  'Działanie na szkodę projektu lub społeczności',
  'Brak zaangażowania lub profesjonalizmu',
  'Nieprzestrzeganie umowy lub ustaleń',
]

export default function Requirements() {
  return (
    <section id="wymagania" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-orient-900 via-orient-800/40 to-orient-900" />

      {/* Background rune watermark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[30rem] text-crimson-900/5 select-none pointer-events-none leading-none">
        道
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-crimson-700/40 bg-crimson-900/20 text-crimson-400 text-xs font-medium tracking-widest uppercase">
            Kodeks Partnera
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Nasze wymagania{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson-400 to-gold-400">
              wobec partnera
            </span>
          </h2>
          <p className="text-stone-400 text-base lg:text-lg max-w-2xl mx-auto">
            Inwestujemy w ludzi, nie tylko w projekty. Dlatego mamy jasne oczekiwania wobec
            każdego, z kim podejmujemy współpracę.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Requirements list */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-3 p-8 rounded-2xl border border-gold-800/40 bg-gradient-to-br from-orient-900/80 to-gold-900/5"
          >
            <h3 className="font-display font-bold text-gold-400 text-xl mb-6 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-gold-500" />
              Czego oczekujemy od Ciebie
            </h3>
            <ul className="space-y-3">
              {requirements.map((req, i) => (
                <motion.li
                  key={req}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-gold-900/50 border border-gold-700/50 flex items-center justify-center flex-shrink-0 group-hover:border-gold-500 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                  </div>
                  <span className="text-stone-300 text-sm leading-relaxed">{req}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right column: dealbreakers + quote */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Dealbreakers */}
            <div className="p-6 rounded-2xl border border-crimson-800/40 bg-gradient-to-br from-orient-900/80 to-crimson-900/10">
              <h3 className="font-display font-bold text-crimson-400 text-lg mb-4 flex items-center gap-2">
                <XCircle size={18} />
                Czego nie tolerujemy
              </h3>
              <ul className="space-y-3">
                {dealbreakers.map((d) => (
                  <li key={d} className="flex items-start gap-3">
                    <div className="mt-1 w-1 h-1 rounded-full bg-crimson-500 flex-shrink-0 mt-2" />
                    <span className="text-stone-400 text-sm leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commitment quote */}
            <div className="p-6 rounded-2xl border border-gold-700/30 bg-gradient-to-br from-gold-900/15 to-orient-900/80 relative overflow-hidden">
              {/* Decorative rune */}
              <div className="absolute top-2 right-4 font-display text-5xl text-gold-700/10 select-none">武</div>

              <div className="relative">
                <div className="text-gold-500 text-2xl mb-3 font-display">"</div>
                <p className="text-stone-300 text-sm leading-relaxed italic mb-4">
                  Współpraca z Tokenuj.pl oznacza{' '}
                  <span className="text-gold-400 font-semibold not-italic">odpowiedzialność, transparentność</span>{' '}
                  i pełne zaangażowanie. Finansowanie otrzymują tylko projekty, które mają
                  realny potencjał i są prowadzone przez osoby gotowe działać profesjonalnie.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-gold-600" />
                  <span className="text-gold-600 text-xs font-semibold tracking-widest uppercase">
                    Tokenuj.pl
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'Umowa', label: 'Formalna współpraca' },
                { value: '100%', label: 'Transparentność' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-xl border border-gold-900/50 bg-orient-900/60 text-center"
                >
                  <div className="font-display font-black text-xl text-gold-400">{s.value}</div>
                  <div className="text-stone-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
