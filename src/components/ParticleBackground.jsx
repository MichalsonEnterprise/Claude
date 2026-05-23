import React, { useEffect, useRef } from 'react'

// Animated canvas particle system – golden embers rising through fog
export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Particle pool
    const COUNT = 80
    const particles = Array.from({ length: COUNT }, () => createParticle(canvas))

    function createParticle(canvas) {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height + canvas.height,
        radius: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.6 + 0.2,
        opacity: Math.random() * 0.6 + 0.1,
        drift: (Math.random() - 0.5) * 0.4,
        hue: Math.random() > 0.3 ? 42 : 0, // gold or crimson
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.y -= p.speed
        p.x += p.drift
        p.opacity -= 0.001

        if (p.y < -10 || p.opacity <= 0) {
          // Respawn at bottom
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
          p.opacity = Math.random() * 0.5 + 0.1
          p.speed = Math.random() * 0.6 + 0.2
          p.drift = (Math.random() - 0.5) * 0.4
          p.hue = Math.random() > 0.3 ? 42 : 0
        }

        // Glow effect
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
        gradient.addColorStop(0, `hsla(${p.hue}, 90%, 60%, ${p.opacity})`)
        gradient.addColorStop(1, `hsla(${p.hue}, 90%, 40%, 0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${p.opacity * 1.5})`
        ctx.fill()
      })

      animId = requestAnimationFrame(tick)
    }

    tick()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  )
}
