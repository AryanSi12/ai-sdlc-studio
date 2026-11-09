import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BOTS } from '../data/constants'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { Pause, Play } from 'lucide-react'

const INTERVAL = 4200

export default function BotSlideshow() {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduced || paused) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % BOTS.length), INTERVAL)
    return () => clearInterval(t)
  }, [paused, reduced])

  const bot = BOTS[index]

  return (
    <section
      className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8 glow-ring"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="How the seven bots work"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The crew</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Seven bots. One pipeline.</h2>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-white"
          aria-pressed={paused}
          aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>

      <div className="relative min-h-[200px] sm:min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={bot.id}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -18 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-5 sm:flex-row sm:items-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${BOTS.length}: ${bot.name}`}
          >
            <div
              className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl sm:mx-0"
              style={{
                background: `linear-gradient(145deg, ${bot.hex}22, ${bot.hex}08)`,
                boxShadow: `0 12px 40px -16px ${bot.hex}66`,
              }}
            >
              {!reduced && (
                <motion.span
                  className="absolute inset-0 rounded-3xl"
                  style={{ boxShadow: `0 0 0 1px ${bot.hex}33` }}
                  animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <img src={bot.image} alt="" className="relative h-16 w-16" width={64} height={64} />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: bot.hex }} />
                {bot.role}
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{bot.name}</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">{bot.blurb}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Bot slides">
        {BOTS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${b.name}`}
            onClick={() => setIndex(i)}
            className="group relative h-2.5 rounded-full transition-all focus-visible:outline-none"
            style={{ width: i === index ? 28 : 10 }}
          >
            <span
              className="absolute inset-0 rounded-full transition"
              style={{
                background: i === index ? b.hex : '#d4d4d8',
                opacity: i === index ? 1 : 0.7,
              }}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
