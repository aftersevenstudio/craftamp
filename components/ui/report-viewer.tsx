import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Section {
  section_type: string
  ai_content: string | null
  display_order: number
}

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  website_performance: 'Website Performance',
  local_presence: 'Local Opportunity',
  recommendations: 'Recommendations',
}

const SECTION_ICONS: Record<string, string> = {
  executive_summary: '📋',
  website_performance: '📈',
  local_presence: '🌐',
  recommendations: '🎯',
}

interface Props {
  sections: Section[]
  periodLabel: string
  businessName: string
}

export default function ReportViewer({ sections, periodLabel, businessName }: Props) {
  return (
    <div className='space-y-6'>
      <div className='border-b pb-4'>
        <h1 className='text-2xl font-bold text-gray-900'>{businessName}</h1>
        <p className='text-sm text-gray-500 mt-1'>{periodLabel} · Monthly Performance Report</p>
      </div>

      {sections.map((section) => (
        <Card key={section.section_type} className='overflow-hidden'>
          <CardHeader className='bg-gray-50 border-b py-3 px-5'>
            <CardTitle className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
              <span>{SECTION_ICONS[section.section_type] ?? '📄'}</span>
              {SECTION_LABELS[section.section_type] ?? section.section_type}
            </CardTitle>
          </CardHeader>
          <CardContent className='px-5 py-2'>
            <div className='prose prose-sm prose-gray max-w-none'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.ai_content ?? ''}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
