import type { Metadata } from 'next'
import { Geist, Geist_Mono, Comfortaa } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const brandFont = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Lactate Pro - Back Office',
  description: 'Panel de administración para tu tienda de productos de lactato',
  generator: 'v0.app',
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={brandFont.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
