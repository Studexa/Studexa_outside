import { useTranslation } from 'react-i18next'
import { isGuestMode } from './auth'
import { seedNotes, type Note } from './store'

type StarterDeck = { labels: Record<string, string>; cards: Record<string, string> }

const decks: Record<string, StarterDeck> = {
  'deck-algebra': {
    labels: { 'Algebra Essentials': 'មូលដ្ឋានពិជគណិត', Mathematics: 'គណិតវិទ្យា' },
    cards: {
      'Solve: 2x + 6 = 18': 'ដោះស្រាយសមីការ 2x + 6 = 18',
      'Slope of the line y = 3x + 2': 'មេគុណប្រាប់ទិសនៃបន្ទាត់ y = 3x + 2',
      'Factor x² − 9': 'បំបែក x² − 9 ជាផលគុណកត្តា',
      'Area of a circle': 'ក្រឡាផ្ទៃរង្វង់',
      'Solve: x² = 49': 'ដោះស្រាយសមីការ x² = 49',
      'Value of π to 2 decimal places': 'តម្លៃ π ត្រឹមខ្ទង់ទសភាគពីរខ្ទង់',
    },
  },
  'deck-khmer': {
    labels: { 'Khmer Literature': 'អក្សរសិល្ប៍ខ្មែរ', Khmer: 'ភាសាខ្មែរ' },
    cards: {
      'Who wrote “Tum Teav”?': 'តើអ្នកណាបាននិពន្ធរឿង «ទុំទាវ»?',
      'Preah Botumthera Som': 'ព្រះបទុមត្ថេរសោម',
      'What is a “Reamker”?': 'តើរឿង «រាមកេរ្តិ៍» ជាអ្វី?',
      'The Khmer version of the Ramayana': 'រឿងរាមាយណៈជាទម្រង់ខ្មែរ',
      '“ជើង” means…': 'តើពាក្យ «ជើង» ជាភាសាអង់គ្លេសមានន័យដូចម្តេច?',
      '“ស្រលាញ់” means…': 'តើពាក្យ «ស្រលាញ់» ជាភាសាអង់គ្លេសមានន័យដូចម្តេច?',
    },
  },
  'deck-biology': {
    labels: { 'Cell Biology': 'ជីវវិទ្យាកោសិកា', Biology: 'ជីវវិទ្យា' },
    cards: {
      'Powerhouse of the cell': 'ផ្នែកនៃកោសិកាដែលផលិតថាមពល',
      Mitochondria: 'មីតូកុងឌ្រី',
      'Process plants use to make food': 'ដំណើរការដែលរុក្ខជាតិប្រើដើម្បីបង្កើតអាហារ',
      Photosynthesis: 'រស្មីសំយោគ',
      'DNA base pairs': 'គូបាសនៃ DNA',
      'A–T and C–G': 'A–T និង C–G',
      'Largest organ in the human body': 'សរីរាង្គធំបំផុតក្នុងរាងកាយមនុស្ស',
      'The skin': 'ស្បែក',
      'Part of the cell that stores DNA': 'ផ្នែកនៃកោសិកាដែលរក្សាទុក DNA',
      'The nucleus': 'ណ្វៃយ៉ូ',
    },
  },
  'deck-english': {
    labels: { 'English Vocabulary': 'វាក្យសព្ទអង់គ្លេស', English: 'ភាសាអង់គ្លេស' },
    cards: {
      'Past tense of “go”': 'ទម្រង់អតីតកាលនៃពាក្យ “go”',
      'Synonym of “happy”': 'ពាក្យដែលមានន័យដូចពាក្យ “happy”',
      'Plural of “child”': 'ទម្រង់ពហុវចនៈនៃពាក្យ “child”',
      'Meaning of “brave”': 'អត្ថន័យនៃពាក្យ “brave”',
      'Courageous, not afraid': 'មានភាពក្លាហាន មិនភ័យខ្លាច',
    },
  },
  'deck-physics': {
    labels: { 'Physics Basics': 'មូលដ្ឋានរូបវិទ្យា', Physics: 'រូបវិទ្យា' },
    cards: {
      'Formula for speed': 'រូបមន្តល្បឿន',
      'distance ÷ time': 'ចម្ងាយ ÷ រយៈពេល',
      'Unit of force': 'ឯកតានៃកម្លាំង',
      'Newton (N)': 'ញូតុន (N)',
      'Gravity on Earth': 'សំទុះទំនាញផែនដី',
      'Energy stored in motion': 'ថាមពលនៃចលនា',
      'Kinetic energy': 'ថាមពលស៊ីនេទិច',
    },
  },
}

const notes: Record<string, Pick<Note, 'title' | 'subject' | 'content'>> = {
  'note-cells': {
    title: 'សង្ខេបជីវវិទ្យាកោសិកា',
    subject: 'ជីវវិទ្យា',
    content: '<h2>កោសិកា</h2><p>កោសិកាជាឯកតាតូចបំផុតនៃភាវៈរស់។ <strong>ណ្វៃយ៉ូ</strong> រក្សាទុក DNA ហើយ <strong>មីតូកុងឌ្រី</strong> បញ្ចេញថាមពល។</p><ul><li>ភ្នាសកោសិកាគ្រប់គ្រងសារធាតុដែលចូល។</li><li>ស៊ីតូប្លាសមានសរីរាង្គតូចៗរបស់កោសិកា។</li><li>កោសិការុក្ខជាតិក៏មានជញ្ជាំងកោសិកា និងក្លរ៉ូប្លាសផងដែរ។</li></ul><p>ចងចាំថារស្មីសំយោគកើតឡើងនៅក្នុងក្លរ៉ូប្លាស។</p>',
  },
  'note-algebra': {
    title: 'សន្លឹករូបមន្តពិជគណិត',
    subject: 'គណិតវិទ្យា',
    content: '<h2>រូបមន្តសំខាន់ៗ</h2><ul><li>មេគុណប្រាប់ទិស៖ <strong>m = (y₂ − y₁) / (x₂ − x₁)</strong></li><li>សមីការដឺក្រេទីពីរ៖ <strong>x = (−b ± √(b² − 4ac)) / 2a</strong></li><li>ក្រឡាផ្ទៃរង្វង់៖ <strong>πr²</strong></li></ul><p>ហាត់ប្រើរូបមន្តសមីការដឺក្រេទីពីរមុនថ្ងៃសុក្រ។</p>',
  },
  'note-khmer': {
    title: 'វាក្យសព្ទខ្មែរ — គ្រួសារ',
    subject: 'ភាសាខ្មែរ',
    content: '<h2>គ្រួសារ (Family)</h2><ul><li>ម្តាយ — mother</li><li>ឪពុក — father</li><li>បង — older sibling</li><li>ប្អូន — younger sibling</li></ul>',
  },
}

function lookup(catalog: Record<string, string> | undefined, source: string) {
  return catalog && Object.hasOwn(catalog, source) ? catalog[source] : source
}

const originalNotes = new Map(seedNotes.map((note) => [note.id, note]))

export function localizeStarterNote(note: Note, khmerGuest: boolean): Note {
  if (!khmerGuest) return note
  const original = originalNotes.get(note.id)
  if (!original || original.title !== note.title || original.content !== note.content || original.subject !== note.subject) return note
  return { ...note, ...notes[note.id] }
}

export function useLocalizedStarter() {
  const { i18n } = useTranslation()
  const khmerGuest = i18n.resolvedLanguage === 'km' && isGuestMode()
  return {
    deck: (id: string | undefined, value: string) => khmerGuest && id ? lookup(decks[id]?.labels, value) : value,
    card: (id: string | undefined, value: string) => khmerGuest && id ? lookup(decks[id]?.cards, value) : value,
    note: (note: Note) => localizeStarterNote(note, khmerGuest),
  }
}
