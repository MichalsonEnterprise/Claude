import React from 'react'
import { motion } from 'framer-motion'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-gold-900/40 bg-orient-900">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-600/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-orient-900 font-display font-black text-lg shadow-lg shadow-gold-700/20">
                龍
              </div>
              <div>
                <span className="font-display font-bold text-gold-400 text-lg leading-none">Tokenuj</span>
                <span className="font-display font-bold text-white text-lg leading-none">.pl</span>
                <div className="text-[10px] text-gold-700 tracking-[0.2em] uppercase leading-none mt-0.5">
                  Gaming Investment
                </div>
              </div>
            </div>
            <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
              Platforma inwestycyjna dla prywatnych serwerów Metin2. Finansowanie, spółki celowe,
              marketing i profesjonalne wsparcie biznesowe.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-gold-500 text-sm tracking-widest uppercase mb-4">
              Nawigacja
            </h4>
            <ul className="space-y-2">
              {[
                ['Dla kogo?', '#dla-kogo'],
                ['Oferta', '#oferta'],
                ['Spółki celowe', '#spolki'],
                ['Wymagania', '#wymagania'],
                ['Proces', '#proces'],
                ['Formularz', '#formularz'],
              ].map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-stone-500 hover:text-gold-400 text-sm transition-colors duration-200"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-gold-500 text-sm tracking-widest uppercase mb-4">
              Kontakt
            </h4>
            <ul className="space-y-2 text-sm text-stone-500">
              <li>
                <span className="text-stone-600 text-xs block mb-0.5">E-mail</span>
                {/* PODMIEŃ: wstaw docelowy adres e-mail */}
                <a href="mailto:kontakt@tokenuj.pl" className="hover:text-gold-400 transition-colors">
                  kontakt@tokenuj.pl
                </a>
              </li>
              <li className="pt-2">
                {/* PODMIEŃ: dodaj linki do Discord / Telegrama jeśli dostępne */}
                <span className="text-stone-600 text-xs block mb-1">Social</span>
                <span className="text-stone-600">Discord · Telegram</span>
              </li>
            </ul>

            {/* Legal note */}
            <div className="mt-6 p-3 rounded-xl border border-gold-900/40 bg-gold-900/10">
              <p className="text-stone-600 text-xs leading-relaxed">
                Tokenuj.pl działa w ramach legalnych struktur biznesowych.
                Wszystkie umowy zawierane są zgodnie z prawem polskim.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gold-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-stone-600 text-xs">
            © {year} Tokenuj.pl – Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-stone-600 text-xs">
            {/* PODMIEŃ: dodaj linki do regulaminu i polityki prywatności */}
            <a href="#" className="hover:text-gold-500 transition-colors">Polityka prywatności</a>
            <span>·</span>
            <a href="#" className="hover:text-gold-500 transition-colors">Regulamin</a>
          </div>
        </div>

        <div className="text-center mt-6 text-gold-800/30 font-display text-xs tracking-[0.4em]">
          ⬦ TOKENUJ.PL · GAMING INVESTMENT PLATFORM ⬦
        </div>
      </div>
    </footer>
  )
}
