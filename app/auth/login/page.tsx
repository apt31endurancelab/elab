"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[40%_60%]">
        <aside className="relative hidden lg:block">
          <img
            src="/images/login-athlete.png"
            alt="Athlete on track"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/30" />
          <div className="absolute left-8 top-8">
            <img
              src="https://www.endurancelab.cc/cdn/shop/files/elab_white_logo.png?height=36&v=1759948221"
              alt="Endurance Lab"
              className="h-8 w-auto"
            />
          </div>
          <div className="absolute inset-x-8 bottom-10 text-white">
            <p className="max-w-md text-3xl font-semibold leading-tight">
              "The control room for team leads to see everything in one place."
            </p>
            <p className="mt-3 text-sm text-white/80">
              One dashboard. Full visibility. Faster decisions.
            </p>
          </div>
        </aside>

        <section className="relative flex items-center justify-center p-6 pb-16 lg:p-12 lg:pb-18">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <svg
              viewBox="0 0 900 700"
              className="h-full w-full opacity-[0.3]"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="neural-warm" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f04d3a" />
                  <stop offset="52%" stopColor="#ff7a2f" />
                  <stop offset="100%" stopColor="#ffd15a" />
                </linearGradient>
                <radialGradient id="neuron-node" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#ffe08a" />
                  <stop offset="60%" stopColor="#ff9a3e" />
                  <stop offset="100%" stopColor="#f04d3a" />
                </radialGradient>
                <filter id="warm-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="electric-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g className="neural-web" stroke="url(#neural-warm)" fill="none" filter="url(#warm-glow)">
                <path className="fiber-thick" d="M20 32 C160 10, 294 74, 430 34 S700 8, 890 58" />
                <path className="fiber-medium" d="M0 86 C148 52, 286 132, 446 96 S712 62, 900 132" />
                <path className="fiber-thick" d="M48 112 C156 64, 242 174, 368 130 S620 58, 852 152" />
                <path className="fiber-medium" d="M30 262 C176 228, 258 320, 414 286 S656 214, 874 298" />
                <path className="fiber-thick" d="M24 392 C170 338, 286 448, 438 404 S670 348, 882 470" />
                <path className="fiber-medium" d="M60 566 C218 510, 280 644, 454 582 S700 522, 856 632" />
                <path className="fiber-thin" d="M180 94 C250 192, 208 300, 262 396 S362 576, 330 660" />
                <path className="fiber-thin" d="M470 78 C442 192, 520 286, 496 414 S548 572, 604 660" />
                <path className="fiber-medium" d="M82 178 C210 158, 302 212, 418 196 S650 146, 808 210" />
                <path className="fiber-thin" d="M94 468 C216 448, 322 510, 448 492 S686 444, 846 520" />
                <path className="fiber-thick" d="M136 316 C260 264, 318 370, 466 334 S698 278, 834 358" />
                <path className="fiber-thin" d="M320 84 C354 176, 354 290, 334 384 S350 562, 426 650" />
                <path className="fiber-medium" d="M640 96 C580 202, 642 302, 620 430 S670 566, 760 658" />
              </g>

              <g className="neuron-nodes">
                <circle cx="124" cy="44" r="7" fill="url(#neuron-node)" />
                <circle cx="404" cy="40" r="8" fill="url(#neuron-node)" />
                <circle cx="742" cy="74" r="7.5" fill="url(#neuron-node)" />
                <circle cx="154" cy="102" r="7" fill="url(#neuron-node)" />
                <circle cx="362" cy="134" r="8" fill="url(#neuron-node)" />
                <circle cx="646" cy="220" r="7.5" fill="url(#neuron-node)" />
                <circle cx="260" cy="398" r="7" fill="url(#neuron-node)" />
                <circle cx="500" cy="408" r="8" fill="url(#neuron-node)" />
                <circle cx="716" cy="528" r="7" fill="url(#neuron-node)" />
              </g>

              <g fill="#8ed7ff" filter="url(#electric-glow)">
                <circle r="2.2" className="electric-pulse pulse-d">
                  <animateMotion
                    dur="7.8s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M0 86 C148 52, 286 132, 446 96 S712 62, 900 132"
                  />
                </circle>
                <circle r="2.6" className="electric-pulse pulse-a">
                  <animateMotion
                    dur="7s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M30 262 C176 228, 258 320, 414 286 S656 214, 874 298"
                  />
                </circle>
                <circle r="2.3" className="electric-pulse pulse-b">
                  <animateMotion
                    dur="8.4s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M24 392 C170 338, 286 448, 438 404 S670 348, 882 470"
                  />
                </circle>
                <circle r="2" className="electric-pulse pulse-c">
                  <animateMotion
                    dur="9.8s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M470 78 C442 192, 520 286, 496 414 S548 572, 604 660"
                  />
                </circle>
              </g>

              <g fill="#ff5a3d" filter="url(#warm-glow)">
                <circle r="3" className="blood-pulse blood-c">
                  <animateMotion
                    dur="6.9s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M20 32 C160 10, 294 74, 430 34 S700 8, 890 58"
                  />
                </circle>
                <circle r="3.2" className="blood-pulse blood-a">
                  <animateMotion
                    dur="6.4s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M48 112 C156 64, 242 174, 368 130 S620 58, 852 152"
                  />
                </circle>
                <circle r="2.8" className="blood-pulse blood-b">
                  <animateMotion
                    dur="7.1s"
                    repeatCount="indefinite"
                    rotate="auto"
                    path="M136 316 C260 264, 318 370, 466 334 S698 278, 834 358"
                  />
                </circle>
              </g>
            </svg>
          </div>

          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute -inset-1 rounded-[30px] bg-gradient-to-br from-white/25 via-white/5 to-transparent opacity-60 blur-md" />
            <Card className="relative w-full overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.06] shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_32%,rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.08)_100%)]" />
              <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-[130%] -translate-x-1/2 rounded-full bg-white/12 blur-3xl" />
              <CardHeader className="space-y-2 pb-2 text-left">
                <img
                  src="https://www.endurancelab.cc/cdn/shop/files/elab_white_logo.png?height=36&v=1759948221"
                  alt="Endurance Lab"
                  className="h-8 w-auto invert dark:invert-0"
                />
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Welcome back
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Accede con magic link para entrar al panel.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!isSent ? (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <Field>
                      <FieldLabel htmlFor="email" className="text-sm font-medium">
                        Correo electrónico
                      </FieldLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 rounded-xl border-white/20 bg-white/[0.04] pl-10 backdrop-blur-md placeholder:text-muted-foreground/70 focus-visible:border-white/35 focus-visible:ring-white/20"
                        />
                      </div>
                    </Field>

                    {error && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl border border-white/25 bg-white/80 font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_24px_rgba(255,255,255,0.18)] transition-all hover:bg-white/90"
                      disabled={isLoading || !email}
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Continuar con Magic Link
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 py-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Revisa tu correo</h3>
                      <p className="text-sm text-muted-foreground">
                        Hemos enviado un enlace de acceso a{" "}
                        <span className="font-medium text-foreground">{email}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-sm"
                      onClick={() => {
                        setIsSent(false)
                        setEmail("")
                      }}
                    >
                      Usar otro correo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/45 py-2 text-center text-[9px] leading-tight text-muted-foreground/70 backdrop-blur-sm">
            <p>Private and confidential workspace for authorized team members only.</p>
            <p>If you do not have access rights, please exit immediately and do not disclose any information.</p>
          </div>
        </section>
      </div>
      <style jsx>{`
        .neural-web {
          opacity: 0.62;
          animation: organic-drift 18s ease-in-out infinite alternate;
          transform-origin: center;
        }
        .fiber-thick {
          stroke-width: 2.1;
          animation: vessel-throb-strong 3.8s ease-in-out infinite;
        }
        .fiber-medium {
          stroke-width: 1.45;
          animation: vessel-throb-mid 4.4s ease-in-out infinite;
        }
        .fiber-thin {
          stroke-width: 0.95;
          opacity: 0.9;
          animation: vessel-throb-thin 5.2s ease-in-out infinite;
        }
        .neuron-nodes {
          opacity: 0.66;
          filter: drop-shadow(0 0 6px rgba(255, 132, 64, 0.35));
          animation: node-breath 6.8s ease-in-out infinite;
        }
        .electric-pulse {
          opacity: 0.82;
          animation: electric-flicker 1.7s linear infinite;
        }
        .blood-pulse {
          opacity: 0.9;
          animation: blood-beat 1.2s ease-in-out infinite;
        }
        .blood-a {
          animation-delay: 0.05s;
        }
        .blood-b {
          animation-delay: 0.45s;
        }
        .blood-c {
          animation-delay: 0.8s;
        }
        .pulse-a {
          animation-delay: 0s;
        }
        .pulse-b {
          animation-delay: 0.45s;
        }
        .pulse-c {
          animation-delay: 0.9s;
        }
        .pulse-d {
          animation-delay: 0.2s;
        }
        @keyframes organic-drift {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-4px, 3px, 0) scale(1.01);
          }
        }
        @keyframes node-breath {
          0%, 100% {
            opacity: 0.45;
          }
          50% {
            opacity: 0.62;
          }
        }
        @keyframes vessel-throb-strong {
          0%, 100% { stroke-width: 1.8; opacity: 0.78; }
          50% { stroke-width: 2.6; opacity: 1; }
        }
        @keyframes vessel-throb-mid {
          0%, 100% { stroke-width: 1.2; opacity: 0.72; }
          50% { stroke-width: 1.75; opacity: 0.96; }
        }
        @keyframes vessel-throb-thin {
          0%, 100% { stroke-width: 0.85; opacity: 0.58; }
          50% { stroke-width: 1.15; opacity: 0.82; }
        }
        @keyframes electric-flicker {
          0%, 100% {
            opacity: 0.35;
          }
          48% {
            opacity: 0.92;
          }
          52% {
            opacity: 0.4;
          }
          80% {
            opacity: 0.72;
          }
        }
        @keyframes blood-beat {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.62;
          }
          40% {
            transform: scale(1.25);
            opacity: 1;
          }
          60% {
            transform: scale(1.05);
            opacity: 0.88;
          }
        }
      `}</style>
    </div>
  )
}
