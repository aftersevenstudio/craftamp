export default function PortalOverviewPage({ params }: { params: { slug: string } }) {
  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <h1 className='text-2xl font-bold text-gray-900'>Portal: {params.slug}</h1>
      <p className='mt-2 text-gray-500'>Overview coming soon.</p>
    </div>
  )
}
