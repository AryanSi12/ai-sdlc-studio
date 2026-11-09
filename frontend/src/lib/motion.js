export const fadeUp = (reduced) =>
  reduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }

export const staggerContainer = (reduced) =>
  reduced
    ? { animate: { transition: { staggerChildren: 0 } } }
    : { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }

export const staggerItem = (reduced) =>
  reduced
    ? { initial: {}, animate: {} }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
      }
