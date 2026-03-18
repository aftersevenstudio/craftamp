export default async function PortalOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <h1 className='text-2xl font-bold text-gray-900'>Portal: {slug}</h1>
      <p className='mt-2 text-gray-500'>Overview coming soon.</p>
    </div>
  )
}
