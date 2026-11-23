type StarterQuestion = { starterDeckId?: string; front: string; back: string }
type Explanation = [question: string, answer: string, english: string, khmer: string]

const explanations: Record<string, Explanation[]> = {
  'deck-algebra': [
    ['Solve: 2x + 6 = 18', 'x = 6', 'Subtract 6 from both sides, then divide 12 by 2.', 'ដក 6 ពីអង្គទាំងពីរ រួចចែក 12 នឹង 2។'],
    ['Slope of the line y = 3x + 2', '3', 'In y = mx + b, the coefficient m is the slope.', 'ក្នុង y = mx + b មេគុណ m ជាមេគុណប្រាប់ទិស។'],
    ['Factor x² − 9', '(x − 3)(x + 3)', 'Since 9 = 3², use the difference of squares formula.', 'ដោយសារ 9 = 3² សូមប្រើរូបមន្តផលដកការេ។'],
    ['Area of a circle', 'πr²', 'Multiply π by the square of the radius r.', 'គុណ π នឹងការេនៃកាំ r។'],
    ['Solve: x² = 49', 'x = ±7', 'Both 7 and −7 give 49 when squared.', 'ទាំង 7 និង −7 មានការេស្មើ 49។'],
    ['Value of π to 2 decimal places', '3.14', 'The third decimal digit of π is 1, so the hundredths digit stays 4.', 'ខ្ទង់ទសភាគទីបីនៃ π គឺ 1 ដូច្នេះខ្ទង់ភាគរយនៅតែជា 4។'],
  ],
  'deck-khmer': [
    ['Who wrote “Tum Teav”?', 'Preah Botumthera Som', 'This deck uses the version attributed to Preah Botumthera Som.', 'កម្រងកាតនេះប្រើកំណែដែលគេចាត់ទុកថានិពន្ធដោយព្រះបទុមត្ថេរសោម។'],
    ['What is a “Reamker”?', 'The Khmer version of the Ramayana', 'The Reamker retells the Ramayana in the Khmer literary tradition.', 'រាមកេរ្តិ៍ជាការនិទានរឿងរាមាយណៈឡើងវិញតាមប្រពៃណីអក្សរសិល្ប៍ខ្មែរ។'],
    ['“ជើង” means…', 'Foot / leg', 'Depending on context, ជើង refers to the foot or the leg.', 'ពាក្យ «ជើង» សំដៅលើប្រអប់ជើង ឬជើងទាំងមូល អាស្រ័យលើបរិបទ។'],
    ['“ស្រលាញ់” means…', 'To love', 'The verb ស្រលាញ់ expresses affection for someone or something.', 'កិរិយាសព្ទ «ស្រលាញ់» បង្ហាញពីអារម្មណ៍ស្រឡាញ់ចំពោះមនុស្ស ឬវត្ថុណាមួយ។'],
  ],
  'deck-biology': [
    ['Powerhouse of the cell', 'Mitochondria', 'Mitochondria produce much of the ATP that cells use for energy.', 'មីតូកុងឌ្រីផលិត ATP ភាគច្រើនដែលកោសិកាប្រើជាថាមពល។'],
    ['Process plants use to make food', 'Photosynthesis', 'Photosynthesis uses light energy to make sugars.', 'រស្មីសំយោគប្រើថាមពលពន្លឺដើម្បីបង្កើតជាតិស្ករ។'],
    ['DNA base pairs', 'A–T and C–G', 'In DNA, adenine pairs with thymine, and cytosine pairs with guanine.', 'ក្នុង DNA អាដេនីនចាប់គូជាមួយទីមីន ហើយស៊ីតូស៊ីនចាប់គូជាមួយហ្គានីន។'],
    ['Largest organ in the human body', 'The skin', 'The skin covers the outside of the body and forms its largest organ.', 'ស្បែកគ្របដណ្ដប់ផ្នែកខាងក្រៅនៃរាងកាយ និងជាសរីរាង្គធំបំផុត។'],
    ['Part of the cell that stores DNA', 'The nucleus', 'The nucleus houses most of the DNA in a eukaryotic cell.', 'ណ្វៃយ៉ូផ្ទុក DNA ភាគច្រើនក្នុងកោសិកាអឺការីយ៉ូត។'],
  ],
  'deck-english': [
    ['Past tense of “go”', 'went', '“Go” is irregular, as in “Yesterday I went to school.”', '“Go” ជាកិរិយាសព្ទមិនទៀងទាត់ ដូចក្នុងប្រយោគ “Yesterday I went to school.”'],
    ['Synonym of “happy”', 'joyful', 'Both words describe feeling pleasure or happiness.', 'ពាក្យទាំងពីរពិពណ៌នាពីអារម្មណ៍រីករាយ។'],
    ['Plural of “child”', 'children', '“Child” has an irregular plural, “children.”', '“Child” មានទម្រង់ពហុវចនៈមិនទៀងទាត់ គឺ “children”។'],
    ['Meaning of “brave”', 'Courageous, not afraid', 'A brave person shows courage when facing difficulty or danger.', 'មនុស្សក្លាហានបង្ហាញភាពក្លាហានពេលប្រឈមនឹងការលំបាក ឬគ្រោះថ្នាក់។'],
  ],
  'deck-physics': [
    ['Formula for speed', 'distance ÷ time', 'Speed measures the distance traveled per unit of time.', 'ល្បឿនវាស់ចម្ងាយដែលបានធ្វើដំណើរក្នុងមួយឯកតាពេល។'],
    ['Unit of force', 'Newton (N)', 'One newton accelerates one kilogram at one meter per second squared.', 'មួយញូតុនធ្វើឱ្យម៉ាសមួយគីឡូក្រាមមានសំទុះមួយម៉ែត្រក្នុងមួយវិនាទីការេ។'],
    ['Gravity on Earth', '9.8 m/s²', 'Near Earth’s surface, the acceleration due to gravity is about 9.8 m/s².', 'នៅជិតផ្ទៃផែនដី សំទុះទំនាញមានប្រហែល 9.8 m/s²។'],
    ['Energy stored in motion', 'Kinetic energy', 'An object has kinetic energy when it is moving.', 'វត្ថុមានថាមពលស៊ីនេទិចនៅពេលវាកំពុងធ្វើចលនា។'],
  ],
}

export function starterQuizExplanation(item: StarterQuestion, language: string | undefined) {
  const match = item.starterDeckId && explanations[item.starterDeckId]
    ?.find(([front, back]) => item.front === front && item.back === back)
  return match ? match[language === 'km' ? 3 : 2] : null
}
