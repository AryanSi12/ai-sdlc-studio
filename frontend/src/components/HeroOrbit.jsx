import { motion } from 'framer-motion'
import { BOTS } from '../data/constants'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const ORBIT = BOTS.filter((b) => b.id !== 'orchestrator')
const EVENTS = [
  { bot: 'requirement_gatherer', text: 'Quiz round opened' },
  { bot: 'designer', text: 'Design doc ready' },
  { bot: 'tester', text: 'Tests green' },
  { bot: 'deployer', text: 'Live URL published' },
]

export default function HeroOrbit() {
  const reduced = usePrefersReducedMotion()
  const orch = BOTS.find((b) => b.id === 'orchestrator')

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {/* soft rings */}
      {[1, 2, 3].map((r) => (
        <div
          key={r}
          className="absolute left-1/2 top-1/2 rounded-full border border-indigo-200/50"
          style={{
            width: `${28 + r * 22}%`,
            height: `${28 + r * 22}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* orbiting bots */}
      <motion.div
        className="absolute inset-[8%]"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 48, repeat: Infinity, ease: 'linear' }}
      >
        {ORBIT.map((bot, i) => {
          const angle = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2
          const x = 50 + Math.cos(angle) * 42
          const y = 50 + Math.sin(angle) * 42
          return (
            <motion.div
              key={bot.id}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              animate={reduced ? undefined : { rotate: -360 }}
              transition={reduced ? undefined : { duration: 48, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-indigo-100/80 ring-1 ring-zinc-200/80 sm:h-14 sm:w-14"
                style={{ boxShadow: `0 12px 28px -12px ${bot.hex}66` }}
              >
                <img src={bot.image} alt={bot.name} className="h-8 w-8" width={32} height={32} />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* center orchestrator */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white sm:h-28 sm:w-28"
          style={{ boxShadow: '0 20px 50px -16px rgba(124,58,237,0.45)' }}
          animate={reduced ? undefined : { scale: [1, 1.04, 1] }}
          transition={reduced ? undefined : { duration: 3.2, repeat: Infinity }}
        >
          {!reduced && (
            <motion.span
              className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.25)' }}
              animate={{ boxShadow: ['0 0 0 0px rgba(124,58,237,0.0)', '0 0 0 14px rgba(124,58,237,0.0)'] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          )}
          <img src={orch.image} alt="Orchestrator" className="h-14 w-14" width={56} height={56} />
        </motion.div>
      </div>

      {/* floating event cards */}
      {EVENTS.map((ev, i) => {
        const bot = BOTS.find((b) => b.id === ev.bot)
        const positions = [
          { top: '6%', left: '-4%' },
          { top: '10%', right: '-6%' },
          { bottom: '14%', left: '-8%' },
          { bottom: '8%', right: '-4%' },
        ]
        return (
          <motion.div
            key={ev.text}
            className="glass absolute z-20 hidden max-w-[160px] rounded-2xl px-3 py-2 shadow-lg sm:block"
            style={positions[i]}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }}
            transition={reduced ? undefined : { delay: 0.3 + i * 0.15, duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-2">
              <img src={bot.image} alt="" className="h-5 w-5 rounded" width={20} height={20} />
              <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold text-zinc-800">{bot.name}</div>
                <div className="truncate text-[10px] text-zinc-500">{ev.text}</div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
