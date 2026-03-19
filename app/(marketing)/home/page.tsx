import Image from 'next/image'
import EarlyAccessForm from './early-access-form'

const FEATURES = [
  {
    icon: '✦',
    title: 'AI-powered reports',
    description: 'Automated monthly reports written by AI, delivered to your client\'s inbox.',
  },
  {
    icon: '◎',
    title: 'Local opportunity insights',
    description: 'Surface local SEO gaps and competitor opportunities your clients can act on.',
  },
  {
    icon: '⬡',
    title: 'White-label ready',
    description: 'Your brand, your clients. Built for agencies to run as their own.',
  },
]

export default function LandingPage() {
  return (
    <div
      style={{ background: '#0f0f0f', color: '#F8F8F7' }}
      className='min-h-screen antialiased'
    >
      {/* ── Hero ── */}
      <section className='min-h-screen flex flex-col items-center justify-center px-6 text-center'>
        <Image
          src='/images/craftamp-dark.svg'
          alt='Craftamp'
          width={180}
          height={37}
          priority
          className='mb-10 h-8 w-auto'
        />

        <h1
          className='text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl'
          style={{ color: '#F8F8F7' }}
        >
          The client portal for agencies that care about craft.
        </h1>

        <p
          className='mt-6 text-base sm:text-lg max-w-xl leading-relaxed'
          style={{ color: '#A0A09E' }}
        >
          Give your clients a branded home for reports, insights, and local opportunities —
          generated automatically every month.
        </p>

        <div className='mt-8'>
          <span
            className='inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide'
            style={{
              background: 'rgba(80,70,228,0.15)',
              color: '#a5a0f5',
              border: '1px solid rgba(80,70,228,0.3)',
            }}
          >
            <span
              className='inline-block w-1.5 h-1.5 rounded-full'
              style={{ background: '#7c78ee' }}
            />
            Private beta — not accepting new studios
          </span>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className='px-6 pb-24'>
        <div className='max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className='rounded-xl p-6'
              style={{
                background: '#1F1F1E',
                border: '1px solid #2E2E2C',
              }}
            >
              <div
                className='text-2xl mb-4 w-10 h-10 flex items-center justify-center rounded-lg'
                style={{ background: 'rgba(80,70,228,0.15)', color: '#7c78ee' }}
              >
                {f.icon}
              </div>
              <h3
                className='text-sm font-semibold mb-2'
                style={{ color: '#F8F8F7' }}
              >
                {f.title}
              </h3>
              <p className='text-sm leading-relaxed' style={{ color: '#A0A09E' }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Early access ── */}
      <section className='px-6 pb-32 text-center'>
        <div className='max-w-lg mx-auto'>
          <h2
            className='text-2xl sm:text-3xl font-bold tracking-tight'
            style={{ color: '#F8F8F7' }}
          >
            Built for agencies like yours.
          </h2>
          <p className='mt-4 text-sm sm:text-base leading-relaxed' style={{ color: '#A0A09E' }}>
            We're currently in private beta with After Seven Studio. Want early access when we open up?
          </p>
          <EarlyAccessForm />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className='px-6 py-6'
        style={{ borderTop: '1px solid #2E2E2C' }}
      >
        <div className='max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs'
          style={{ color: '#A0A09E' }}
        >
          <span className='font-semibold tracking-tight' style={{ color: '#A0A09E' }}>
            craftamp
          </span>
          <span>Currently in private beta</span>
          <span>A product by After Seven Studio</span>
        </div>
      </footer>
    </div>
  )
}
