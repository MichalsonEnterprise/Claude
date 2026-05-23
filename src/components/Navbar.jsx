import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Dla kogo?', href: '#dla-kogo' },
  { label: 'Oferta', href: '#oferta' },
  { label: 'Spółki celowe', href: '#spolki' },
  { label: 'Wymagania', href: '#wymagania' },
  { label: 'Proces', href: '#proces' },
  { label: 'Formularz', href: '#formularz' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-orient-900/95 backdrop-blur-md border-b border-gold-700/30 shadow-lg shadow-black/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-orient-900 font-display font-black text-lg shadow-lg shadow-gold-700/30 group-hover:shadow-gold-500/50 transition-shadow duration-300">
              龍
            </div>
            <div>
              <span className="font-display font-bold text-gold-400 text-lg leading-none tracking-wider">
                Tokenuj
              </span>
              <span className="font-display font-bold text-white text-lg leading-none">.pl</span>
              <div className="text-[10px] text-gold-600 tracking-[0.2em] uppercase leading-none mt-0.5">
                Gaming Investment
              </div>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-sm font-medium text-stone-300 hover:text-gold-400 transition-colors duration-200 relative group"
              >
                {l.label}
                <span className="absolute bottom-0 left-4 right-4 h-px bg-gold-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
              </a>
            ))}
          </nav>

          {/* CTA button */}
          <div className="hidden lg:block">
            <a
              href="#formularz"
              className="px-5 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-semibold text-sm rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all duration-300 shadow-lg shadow-gold-700/30 hover:shadow-gold-500/40 font-display tracking-wide"
            >
              Zgłoś projekt
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-gold-400 p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden bg-orient-900/98 backdrop-blur-md border-b border-gold-700/30"
          >
            <nav className="px-4 py-4 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-stone-300 hover:text-gold-400 hover:bg-gold-900/20 rounded-lg transition-colors duration-200 text-sm font-medium border border-transparent hover:border-gold-800/50"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#formularz"
                onClick={() => setMenuOpen(false)}
                className="mt-2 px-4 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-orient-900 font-semibold text-sm rounded-lg text-center font-display tracking-wide"
              >
                Zgłoś projekt
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
