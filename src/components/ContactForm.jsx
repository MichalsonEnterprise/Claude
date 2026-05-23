import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, MessageSquare, Server, Link2, Users,
  HelpCircle, FileText, DollarSign, UsersRound, Send, CheckCircle2
} from 'lucide-react'

const supportOptions = [
  'Finansowanie startu serwera',
  'Sponsoring działającego serwera',
  'Marketing i kampanie reklamowe',
  'Audyt projektu / ekonomii gry',
  'Spółka celowa (SPV)',
  'Strategia biznesowa i monetyzacja',
  'Wsparcie technologiczne',
  'Konsultacje Web3 / tokenizacja',
  'Kompleksowe wsparcie 360°',
]

function FormField({ icon: Icon, label, children, required }) {
  return (
    <div className="group">
      <label className="flex items-center gap-2 text-xs font-semibold text-stone-400 tracking-wider uppercase mb-2">
        <Icon size={12} className="text-gold-500" />
        {label}
        {required && <span className="text-crimson-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`form-input w-full px-4 py-3 bg-orient-900/60 border border-gold-900/50 rounded-xl text-stone-200 text-sm placeholder-stone-600 hover:border-gold-800/70 transition-colors duration-200 ${className}`}
      {...props}
    />
  )
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`form-input w-full px-4 py-3 bg-orient-900/60 border border-gold-900/50 rounded-xl text-stone-200 text-sm hover:border-gold-800/70 transition-colors duration-200 appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`form-input w-full px-4 py-3 bg-orient-900/60 border border-gold-900/50 rounded-xl text-stone-200 text-sm placeholder-stone-600 hover:border-gold-800/70 transition-colors duration-200 resize-none ${className}`}
      {...props}
    />
  )
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState([])

  const toggleSupport = (opt) => {
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Miejsce na integrację z backendem / formularzem (np. Formspree, EmailJS, własne API)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id="formularz" className="relative py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-orient-800/50 to-orient-900" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-12 rounded-3xl border border-gold-700/40 bg-orient-900/80"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-gold-900/40 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 size={36} className="text-gold-400" />
            </motion.div>
            <h3 className="font-display font-black text-3xl text-white mb-4">
              Zgłoszenie wysłane!
            </h3>
            <p className="text-stone-300 text-base leading-relaxed mb-6">
              Dziękujemy za przesłanie projektu. Nasz zespół przeanalizuje zgłoszenie
              i skontaktuje się z Tobą w ciągu{' '}
              <span className="text-gold-400 font-semibold">2-5 dni roboczych</span>.
            </p>
            <div className="text-gold-600 font-display text-2xl tracking-widest">⬦ 龍 ⬦</div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section id="formularz" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orient-800/50 via-orient-900 to-orient-900" />

      {/* Glow effects */}
      <motion.div
        animate={{ opacity: [0.06, 0.14, 0.06] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-gold-600/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.04, 0.10, 0.04] }}
        transition={{ duration: 9, repeat: Infinity, delay: 3 }}
        className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-crimson-700/15 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-gold-700/40 bg-gold-900/20 text-gold-400 text-xs font-medium tracking-widest uppercase">
            Zacznij Współpracę
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
            Formularz{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              zgłoszeniowy
            </span>
          </h2>
          <p className="text-stone-400 text-base max-w-xl mx-auto">
            Wypełnij formularz – im więcej szczegółów podasz, tym dokładniej możemy
            ocenić potencjał Twojego projektu.
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative p-6 sm:p-10 rounded-3xl border border-gold-800/40 bg-orient-900/70 backdrop-blur-sm overflow-hidden"
        >
          {/* Top decorative border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

          {/* Corner ornament */}
          <div className="absolute top-4 right-6 font-display text-6xl text-gold-800/10 select-none">龍</div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField icon={User} label="Imię i nazwisko" required>
                <Input type="text" placeholder="Jan Kowalski" required />
              </FormField>
              <FormField icon={Mail} label="Adres e-mail" required>
                <Input type="email" placeholder="kontakt@twojdomain.pl" required />
              </FormField>
            </div>

            {/* Row 2: Discord + Project name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField icon={MessageSquare} label="Discord / Telegram" required>
                <Input type="text" placeholder="NazwaUżytkownika#0001" required />
              </FormField>
              <FormField icon={Server} label="Nazwa projektu / serwera" required>
                <Input type="text" placeholder="np. MetinLegends, DragonHell" required />
              </FormField>
            </div>

            {/* Row 3: Server status + Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField icon={CheckCircle2} label="Czy serwer już działa?">
                <Select defaultValue="">
                  <option value="" disabled>Wybierz opcję</option>
                  <option value="tak">Tak, jest aktywny</option>
                  <option value="beta">W fazie beta/testowej</option>
                  <option value="planowany">Planowany – jeszcze nie startował</option>
                  <option value="przerwa">Był aktywny, teraz na przerwie</option>
                </Select>
              </FormField>
              <FormField icon={Link2} label="Link do strony / Discorda">
                <Input type="url" placeholder="https://twojserwer.pl" />
              </FormField>
            </div>

            {/* Row 4: Player count + Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField icon={Users} label="Liczba graczy / rozmiar społeczności">
                <Select defaultValue="">
                  <option value="" disabled>Wybierz zakres</option>
                  <option value="0">Dopiero startuję (0 graczy)</option>
                  <option value="1-100">1 – 100 graczy</option>
                  <option value="101-500">101 – 500 graczy</option>
                  <option value="501-2000">501 – 2000 graczy</option>
                  <option value="2001+">Powyżej 2000 graczy</option>
                </Select>
              </FormField>
              <FormField icon={UsersRound} label="Czy posiadasz zespół?">
                <Select defaultValue="">
                  <option value="" disabled>Wybierz opcję</option>
                  <option value="solo">Działam solo</option>
                  <option value="2-3">Mam 2–3 osoby</option>
                  <option value="4-10">Zespół 4–10 osób</option>
                  <option value="10+">Powyżej 10 osób</option>
                </Select>
              </FormField>
            </div>

            {/* Support type: multi-select chips */}
            <FormField icon={HelpCircle} label="Jakiego wsparcia potrzebujesz?" required>
              <div className="flex flex-wrap gap-2 mt-1">
                {supportOptions.map((opt) => {
                  const active = selected.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleSupport(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                        active
                          ? 'bg-gold-600/20 border-gold-500 text-gold-300'
                          : 'bg-orient-900/50 border-gold-900/50 text-stone-500 hover:border-gold-700/50 hover:text-stone-400'
                      }`}
                    >
                      {active && <span className="mr-1">✓</span>}
                      {opt}
                    </button>
                  )
                })}
              </div>
            </FormField>

            {/* Project description */}
            <FormField icon={FileText} label="Opis projektu" required>
              <Textarea
                rows={5}
                placeholder="Opisz swój serwer: historia, unikalność, technologia, obecny stan, plany na przyszłość, co wyróżnia Twój projekt..."
                required
              />
            </FormField>

            {/* Budget */}
            <FormField icon={DollarSign} label="Szacowany budżet potrzebny do rozwoju">
              <Select defaultValue="">
                <option value="" disabled>Wybierz zakres budżetu</option>
                <option value="do-5k">Do 5 000 PLN</option>
                <option value="5k-20k">5 000 – 20 000 PLN</option>
                <option value="20k-50k">20 000 – 50 000 PLN</option>
                <option value="50k-100k">50 000 – 100 000 PLN</option>
                <option value="100k+">Powyżej 100 000 PLN</option>
                <option value="do-ustalenia">Do ustalenia</option>
              </Select>
            </FormField>

            {/* Divider */}
            <div className="section-divider" />

            {/* Consent + Submit */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input type="checkbox" required className="sr-only peer" />
                  <div className="w-5 h-5 rounded border border-gold-700/50 bg-orient-900/60 peer-checked:bg-gold-600 peer-checked:border-gold-500 transition-all duration-200 flex items-center justify-center">
                    <svg className="w-3 h-3 text-orient-900 opacity-0 peer-checked:opacity-100" viewBox="0 0 10 8" fill="currentColor">
                      <path d="M9 1L4 7 1 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <span className="text-stone-400 text-sm leading-relaxed group-hover:text-stone-300 transition-colors">
                  Akceptuję kontakt ze strony{' '}
                  <span className="text-gold-400 font-medium">Tokenuj.pl</span> w sprawie
                  analizy mojego projektu i wyrażam zgodę na przetwarzanie moich danych
                  kontaktowych w tym celu.{' '}
                  <span className="text-crimson-500">*</span>
                </span>
              </label>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 text-orient-900 font-display font-bold text-base rounded-xl shadow-lg shadow-gold-700/30 hover:shadow-gold-500/50 transition-shadow duration-300 flex items-center justify-center gap-3 tracking-wide"
              >
                <Send size={18} />
                Wyślij zgłoszenie
              </motion.button>

              <p className="text-center text-stone-600 text-xs">
                Odpowiadamy w ciągu 2–5 dni roboczych. Wszystkie informacje traktujemy poufnie.
              </p>
            </div>
          </form>

          {/* Bottom decorative border */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
