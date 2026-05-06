"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      setTime(`${hh}:${mm}`)
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const card = cardRef.current
    if (!root) return
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth
      const h = window.innerHeight
      root.style.setProperty("--mx", `${(e.clientX / w) * 100}%`)
      root.style.setProperty("--my", `${(e.clientY / h) * 100}%`)
      if (card) {
        const r = card.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const ry = Math.max(-2, Math.min(2, ((e.clientX - cx) / w) * 4))
        const rx = Math.max(-2, Math.min(2, -((e.clientY - cy) / h) * 4))
        card.style.setProperty("--ry", `${ry}deg`)
        card.style.setProperty("--rx", `${rx}deg`)
      }
    }
    const onLeave = () => {
      if (!card) return
      card.style.setProperty("--ry", "0deg")
      card.style.setProperty("--rx", "0deg")
    }
    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setIsSent(true)
      setIsLoading(false)
    }
  }

  return (
    <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden bg-[#1a0a0a] text-white antialiased">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/images/login-bg-track.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="kenburns hi-render object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_85%_at_28%_55%,transparent_0%,rgba(0,0,0,0.6)_80%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div aria-hidden="true" className="cursor-glow pointer-events-none absolute inset-0" />

      <div aria-hidden="true" className="pointer-events-none absolute inset-3 z-10">
        <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-white/15" />
        <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-white/15" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/15" />
        <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/15" />
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-3 z-10 flex items-center px-8 sm:px-10">
        <div className="hash-track flex-1" />
        <span className="ml-4 text-[9px] font-mono tracking-[0.4em] text-white/30">
          00 — 100 — 200 — 300
        </span>
      </div>

      <header className="anim-in absolute left-8 top-9 z-10 sm:left-10 sm:top-10" style={{ animationDelay: "120ms" }}>
        <p className="text-[22px] font-semibold tracking-tight text-white">e.lab</p>
        <p className="breathe mt-1 text-[10px] font-medium tracking-[0.34em] text-white/65">
          LACTATE ANALYZER
        </p>

        <div className="mt-3 w-[195px] sm:w-[215px]">
          <div className="flex items-center justify-between text-[8px] font-mono tracking-[0.26em] text-white/35">
            <span>BPM · 142</span>
            <span>LANE 04 / 08</span>
          </div>
          <svg
            viewBox="0 0 240 28"
            preserveAspectRatio="none"
            className="mt-1 h-3.5 w-full text-white/22"
            aria-hidden="true"
          >
            <defs>
              <filter id="ecg-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              id="ecg-path"
              d="M 0 14 H 36 L 39 11 L 42 10 L 45 11 L 48 14 H 72 L 74 17 L 77 4 L 80 24 L 83 12 H 132 L 135 11 L 138 10 L 141 11 L 144 14 H 168 L 170 17 L 173 4 L 176 24 L 179 12 H 240"
              stroke="currentColor"
              strokeWidth="0.9"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <circle r="1.4" fill="white" fillOpacity="0.85" filter="url(#ecg-glow)">
              <animateMotion dur="5.2s" repeatCount="indefinite">
                <mpath href="#ecg-path" />
              </animateMotion>
            </circle>
          </svg>
        </div>
      </header>

      <div
        className="anim-in absolute right-8 top-9 z-10 hidden text-right font-mono text-[10px] leading-relaxed tracking-[0.22em] text-white/40 sm:right-10 sm:top-10 sm:block"
        style={{ animationDelay: "240ms" }}
      >
        <p>2026.05.05 · {time ?? "··:··"} · BCN</p>
        <div className="my-1.5 ml-auto h-px w-12 bg-white/15" />
        <p className="flex items-center justify-end gap-1.5">
          <span className="status-dot inline-block h-1 w-1 rounded-full bg-white/80" />
          <span>SECURE · MAGIC LINK</span>
        </p>
      </div>

      <aside
        className="anim-in absolute bottom-16 left-8 z-10 hidden max-w-sm text-white lg:block"
        style={{ animationDelay: "520ms" }}
      >
        <p className="text-lg font-medium leading-snug text-white/95">
          &ldquo;The control room for team leads to see everything in one place.&rdquo;
        </p>
        <p className="mt-2 text-[12px] tracking-wide text-white/55">
          One dashboard. Full visibility. Faster decisions.
        </p>
      </aside>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-20 lg:justify-end lg:px-16 lg:py-12">
        <div
          className="anim-in w-full max-w-[360px]"
          style={{ animationDelay: "360ms", animationDuration: "900ms" }}
        >
          <div ref={cardRef} className="card-tilt relative">
            <div className="card-glow pointer-events-none absolute -inset-px rounded-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.025] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="px-7 pt-10 pb-8 sm:px-8">
                <div className="flex flex-col items-center text-center">
                  <p className="flex items-center gap-2 text-[26px] leading-none text-white sm:gap-2.5 sm:text-[31px]">
                    <svg
                      viewBox="0 0 32 22"
                      className="h-[1em] w-auto flex-none"
                      aria-hidden="true"
                    >
                      <g fill="white">
                        <rect x="2" y="4.8" height="1.3" rx="0.65" width="6">
                          <animate attributeName="width" values="4;7.5;4" dur="5.5s" repeatCount="indefinite"
                            calcMode="spline" keyTimes="0;0.5;1"
                            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                          <animate attributeName="opacity" values="0.45;0.8;0.45" dur="5.5s" repeatCount="indefinite" />
                        </rect>
                        <rect x="0" y="10.35" height="1.3" rx="0.65" width="9">
                          <animate attributeName="width" values="8;11;8" dur="7s" repeatCount="indefinite"
                            calcMode="spline" keyTimes="0;0.5;1"
                            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                          <animate attributeName="opacity" values="0.65;0.95;0.65" dur="7s" repeatCount="indefinite" />
                        </rect>
                        <rect x="3" y="15.9" height="1.3" rx="0.65" width="5">
                          <animate attributeName="width" values="3;5.5;3" dur="6.5s" repeatCount="indefinite"
                            calcMode="spline" keyTimes="0;0.5;1"
                            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                          <animate attributeName="opacity" values="0.35;0.7;0.35" dur="6.5s" repeatCount="indefinite" />
                        </rect>
                      </g>

                      <path
                        d="M 32 11 a 10 10 0 1 0 -20 0 a 10 10 0 1 0 20 0 M 28.5 11 a 6.5 6.5 0 1 1 -13 0 a 6.5 6.5 0 1 1 13 0"
                        fill="white"
                        fillRule="evenodd"
                      />

                      <g transform="translate(22 11)">
                        <g>
                          <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" />
                          <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" transform="rotate(72)" />
                          <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" transform="rotate(144)" />
                          <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" transform="rotate(216)" />
                          <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" transform="rotate(288)" />
                          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3.5s" repeatCount="indefinite" />
                        </g>
                        <circle r="1.9" fill="white" />
                      </g>
                    </svg>
                    <span
                      className="inline-flex items-baseline font-light tracking-[-0.04em]"
                      style={{ fontFamily: "var(--font-brand), system-ui, sans-serif" }}
                    >
                      <span className="hidden sm:inline">boxes</span>
                      <span className="sm:hidden">bxs</span>
                      <sup className="ml-[1px] text-[14px] font-light text-white/80 sm:text-[16px]">3</sup>
                    </span>
                  </p>

                  <p className="mt-3 whitespace-nowrap text-[8.5px] uppercase tracking-[0.18em] text-white/45 sm:text-[9.5px] sm:tracking-[0.2em]">
                    Operating system for endurance teams
                  </p>
                </div>

                <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                {!isSent ? (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <Field>
                      <FieldLabel
                        htmlFor="email"
                        className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55"
                      >
                        Correo electrónico
                      </FieldLabel>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 rounded-xl border-white/10 bg-white/[0.03] pl-10 text-[14px] text-white placeholder:text-white/35 focus-visible:border-white/30 focus-visible:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-white/15"
                        />
                      </div>
                    </Field>

                    {error && (
                      <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="group relative h-11 w-full overflow-hidden rounded-xl bg-white text-[13px] font-medium text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.45)] transition-all hover:bg-white/95 disabled:opacity-60"
                      disabled={isLoading || !email}
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Enviando…
                        </>
                      ) : (
                        <>
                          Continuar con Magic Link
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 py-2 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
                      <CheckCircle2 className="h-5 w-5 text-white/90" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold text-white">Revisa tu correo</h3>
                      <p className="text-[12px] text-white/55">
                        Enlace de acceso enviado a{" "}
                        <span className="text-white/85">{email}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[12px] text-white/50 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
                      onClick={() => {
                        setIsSent(false)
                        setEmail("")
                      }}
                    >
                      Usar otro correo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-6 text-center text-[9px] leading-relaxed tracking-wide text-white/30">
        <p>Private and confidential workspace · authorized team members only.</p>
      </footer>

      <style jsx>{`
        .kenburns {
          animation: kenburns 42s ease-in-out infinite alternate;
          transform-origin: 50% 55%;
          will-change: transform;
          filter: contrast(1.05) saturate(1.06);
        }

        .hi-render {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: high-quality;
          backface-visibility: hidden;
        }
        @keyframes kenburns {
          0% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          100% {
            transform: scale(1.06) translate3d(-1.2%, 1%, 0);
          }
        }

        .breathe {
          animation: breathe 5.4s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.95;
          }
        }

        .status-dot {
          animation: heartbeat 1.6s ease-in-out infinite;
        }
        @keyframes heartbeat {
          0%, 60%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          15% {
            transform: scale(1.7);
            opacity: 1;
          }
          30% {
            transform: scale(1.1);
            opacity: 0.85;
          }
          45% {
            transform: scale(1.5);
            opacity: 1;
          }
        }

        .anim-in {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hash-track {
          height: 6px;
          background-image: repeating-linear-gradient(
            to right,
            rgba(255, 255, 255, 0.22) 0,
            rgba(255, 255, 255, 0.22) 1px,
            transparent 1px,
            transparent 14px
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 12%,
            black 88%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 12%,
            black 88%,
            transparent 100%
          );
        }

        .cursor-glow {
          background: radial-gradient(
            560px circle at var(--mx, 50%) var(--my, 50%),
            rgba(255, 220, 195, 0.07),
            transparent 65%
          );
        }

        .card-tilt {
          transform: perspective(1400px) rotateY(var(--ry, 0deg)) rotateX(var(--rx, 0deg));
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .card-glow {
          background: radial-gradient(
            120% 60% at 50% 0%,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.025) 35%,
            transparent 70%
          );
          opacity: 0.45;
        }

        @media (prefers-reduced-motion: reduce) {
          .kenburns,
          .breathe,
          .status-dot,
          .anim-in {
            animation: none;
          }
          .anim-in {
            opacity: 1;
            transform: none;
          }
          .card-tilt {
            transform: none;
          }
          .cursor-glow {
            background: none;
          }
        }
      `}</style>
    </div>
  )
}
