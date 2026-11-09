import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Pause, Play } from 'lucide-react'
import { BOTS } from '../data/constants'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const INTERVAL = 5500

export default function BotSlideshow() {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reduced || paused) return undefined
    setProgress(0)
    const start = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / INTERVAL)
      setProgress(p)
      if (p >= 1) setIndex((i) => (i + 1) % BOTS.length)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, paused, reduced])

  const bot = BOTS[index]

  return (
    <section
      className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_30px_60px_-36px_rgba(79,70,229,0.35)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="How the seven bots work"
    >
      {/* thumbnail rail */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50/80 px-3 py-2.5" role="tablist">
        {BOTS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => { setIndex(i); setProgress(0) }}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
              i === index ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'
            }`}
          >
            <img src={b.image} alt="" className="h-5 w-5 rounded" width={20} height={20} />
            <span className="hidden sm:inline">{b.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600"
          aria-pressed={paused}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>

      <div className="relative min-h-[340px] sm:min-h-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={bot.id}
            initial={reduced ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -30 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-0 lg:grid-cols-2"
            role="group"
            aria-label={`${index + 1} of ${BOTS.length}: ${bot.name}`}
          >
            {/* scene */}
            <div className="relative overflow-hidden bg-zinc-50 lg:min-h-[380px]">
              <motion.img
                src={bot.scene}
                alt=""
                className="h-full w-full object-cover"
                initial={reduced ? false : { scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={{ duration: 5.5, ease: 'linear' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-white/30" />
              <div
                className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-md"
                style={{ background: bot.hex }}
              >
                {bot.role}
              </div>
            </div>

            {/* copy */}
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <div className="mb-3 flex items-center gap-3">
                <img src={bot.image} alt="" className="h-11 w-11 rounded-2xl shadow-md ring-1 ring-zinc-200" width={44} height={44} />
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-zinc-900">{bot.name}</h3>
                  <p className="text-sm text-zinc-500">{bot.blurb}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5">
                {bot.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-zinc-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${bot.hex}18`, color: bot.hex }}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                  In: {bot.io.input}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-300" />
                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: `${bot.hex}55`, background: `${bot.hex}12`, color: bot.hex }}>
                  Out: {bot.io.output}
                </span>
              </div>

              <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <motion.div className="h-full rounded-full" style={{ background: bot.hex, width: `${(reduced ? 0 : progress) * 100}%` }} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
