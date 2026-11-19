const khmerMonths = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
]
const khmerWeekdays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍']
const khmerNumbers = new Intl.NumberFormat('en', { numberingSystem: 'khmr', useGrouping: false })
const khmerDatesSupported = Intl.DateTimeFormat.supportedLocalesOf(['km']).length > 0
type DateStyle = 'full' | 'medium' | 'month' | 'monthDay'
const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { dateStyle: 'full' },
  medium: { dateStyle: 'medium' },
  month: { month: 'long', year: 'numeric' },
  monthDay: { month: 'short', day: 'numeric' },
}
const formatters = new Map<string, Intl.DateTimeFormat>()

export function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function formatStudyDate(date: Date, language: string, style: DateStyle) {
  if (language === 'km' && !khmerDatesSupported) {
    const month = khmerMonths[date.getMonth()]
    const year = khmerNumbers.format(date.getFullYear())
    if (style === 'month') return month + ' ' + year

    const day = khmerNumbers.format(date.getDate())
    if (style === 'monthDay') return day + ' ' + month
    if (style === 'medium') return day + ' ' + month + ' ' + year

    return 'ថ្ងៃ' + khmerWeekdays[date.getDay()] + ' ទី' + day + ' ខែ' + month + ' ឆ្នាំ' + year
  }

  const key = language + ':' + style
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, dateOptions[style])
    formatters.set(key, formatter)
  }
  return formatter.format(date)
}
