export interface CountryOption {
  id: string;
  name: string;
  code: string;
  region: 'Americas' | 'Europe' | 'Asia Pacific' | 'Middle East & Africa' | 'Remote';
  keywords: string[];
}

export const GLOBAL_COUNTRIES: CountryOption[] = [
  // Remote
  {
    id: 'remote',
    name: 'Remote / Anywhere',
    code: 'REMOTE',
    region: 'Remote',
    keywords: ['remote', 'virtual', 'work from home', 'anywhere', 'telecommute']
  },

  // North America & Americas
  {
    id: 'us',
    name: 'United States',
    code: 'US',
    region: 'Americas',
    keywords: ['united states', 'usa', 'us', 'u.s.', 'san francisco', 'new york', 'seattle', 'chicago', 'austin', 'sunnyvale', 'mountain view', 'menlo park', 'cupertino', 'palo alto', 'cambridge, ma', 'boston', 'california', 'texas', 'washington', 'berkeley', 'los angeles', 'redmond', 'nyc']
  },
  {
    id: 'canada',
    name: 'Canada',
    code: 'CA',
    region: 'Americas',
    keywords: ['canada', 'toronto', 'vancouver', 'waterloo', 'montreal', 'ottawa', 'calgary']
  },
  {
    id: 'mexico',
    name: 'Mexico',
    code: 'MX',
    region: 'Americas',
    keywords: ['mexico', 'mexico city', 'guadalajara', 'monterrey']
  },
  {
    id: 'brazil',
    name: 'Brazil',
    code: 'BR',
    region: 'Americas',
    keywords: ['brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'curitiba']
  },
  {
    id: 'argentina',
    name: 'Argentina',
    code: 'AR',
    region: 'Americas',
    keywords: ['argentina', 'buenos aires', 'cordoba']
  },
  {
    id: 'colombia',
    name: 'Colombia',
    code: 'CO',
    region: 'Americas',
    keywords: ['colombia', 'bogota', 'medellin']
  },
  {
    id: 'chile',
    name: 'Chile',
    code: 'CL',
    region: 'Americas',
    keywords: ['chile', 'santiago']
  },

  // Europe
  {
    id: 'uk',
    name: 'United Kingdom',
    code: 'GB',
    region: 'Europe',
    keywords: ['uk', 'united kingdom', 'london', 'england', 'cambridge', 'edinburgh', 'oxford', 'manchester', 'bristol', 'birmingham', 'scotland']
  },
  {
    id: 'ireland',
    name: 'Ireland',
    code: 'IE',
    region: 'Europe',
    keywords: ['ireland', 'dublin', 'cork', 'galway', 'limerick']
  },
  {
    id: 'germany',
    name: 'Germany',
    code: 'DE',
    region: 'Europe',
    keywords: ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg', 'stuttgart', 'walldorf', 'cologne']
  },
  {
    id: 'switzerland',
    name: 'Switzerland',
    code: 'CH',
    region: 'Europe',
    keywords: ['switzerland', 'zurich', 'geneva', 'lausanne', 'basel']
  },
  {
    id: 'netherlands',
    name: 'Netherlands',
    code: 'NL',
    region: 'Europe',
    keywords: ['netherlands', 'amsterdam', 'rotterdam', 'utrecht', 'eindhoven', 'the hague']
  },
  {
    id: 'france',
    name: 'France',
    code: 'FR',
    region: 'Europe',
    keywords: ['france', 'paris', 'lyon', 'toulouse', 'grenoble', 'sophia antipolis']
  },
  {
    id: 'sweden',
    name: 'Sweden',
    code: 'SE',
    region: 'Europe',
    keywords: ['sweden', 'stockholm', 'gothenburg', 'malmo']
  },
  {
    id: 'poland',
    name: 'Poland',
    code: 'PL',
    region: 'Europe',
    keywords: ['poland', 'warsaw', 'krakow', 'wroclaw', 'gdansk', 'poznan']
  },
  {
    id: 'spain',
    name: 'Spain',
    code: 'ES',
    region: 'Europe',
    keywords: ['spain', 'madrid', 'barcelona', 'valencia', 'malaga']
  },
  {
    id: 'italy',
    name: 'Italy',
    code: 'IT',
    region: 'Europe',
    keywords: ['italy', 'milan', 'rome', 'turin']
  },
  {
    id: 'denmark',
    name: 'Denmark',
    code: 'DK',
    region: 'Europe',
    keywords: ['denmark', 'copenhagen', 'aarhus']
  },
  {
    id: 'norway',
    name: 'Norway',
    code: 'NO',
    region: 'Europe',
    keywords: ['norway', 'oslo', 'bergen', 'trondheim']
  },
  {
    id: 'finland',
    name: 'Finland',
    code: 'FI',
    region: 'Europe',
    keywords: ['finland', 'helsinki', 'espoo', 'tampere']
  },
  {
    id: 'austria',
    name: 'Austria',
    code: 'AT',
    region: 'Europe',
    keywords: ['austria', 'vienna', 'graz', 'linz']
  },
  {
    id: 'belgium',
    name: 'Belgium',
    code: 'BE',
    region: 'Europe',
    keywords: ['belgium', 'brussels', 'antwerp', 'ghent', 'leuven']
  },
  {
    id: 'czech_republic',
    name: 'Czech Republic',
    code: 'CZ',
    region: 'Europe',
    keywords: ['czech republic', 'czechia', 'prague', 'brno']
  },
  {
    id: 'romania',
    name: 'Romania',
    code: 'RO',
    region: 'Europe',
    keywords: ['romania', 'bucharest', 'cluj', 'timisoara', 'iasi']
  },
  {
    id: 'portugal',
    name: 'Portugal',
    code: 'PT',
    region: 'Europe',
    keywords: ['portugal', 'lisbon', 'porto', 'braga']
  },
  {
    id: 'estonia',
    name: 'Estonia',
    code: 'EE',
    region: 'Europe',
    keywords: ['estonia', 'tallinn', 'tartu']
  },
  {
    id: 'greece',
    name: 'Greece',
    code: 'GR',
    region: 'Europe',
    keywords: ['greece', 'athens', 'thessaloniki']
  },
  {
    id: 'hungary',
    name: 'Hungary',
    code: 'HU',
    region: 'Europe',
    keywords: ['hungary', 'budapest']
  },
  {
    id: 'luxembourg',
    name: 'Luxembourg',
    code: 'LU',
    region: 'Europe',
    keywords: ['luxembourg']
  },

  // Asia Pacific
  {
    id: 'india',
    name: 'India',
    code: 'IN',
    region: 'Asia Pacific',
    keywords: ['india', 'bengaluru', 'bangalore', 'hyderabad', 'gurugram', 'gurgaon', 'noida', 'pune', 'mumbai', 'delhi', 'chennai', 'kolkata', 'ahmedabad']
  },
  {
    id: 'singapore',
    name: 'Singapore',
    code: 'SG',
    region: 'Asia Pacific',
    keywords: ['singapore']
  },
  {
    id: 'australia',
    name: 'Australia',
    code: 'AU',
    region: 'Asia Pacific',
    keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'canberra', 'perth', 'adelaide']
  },
  {
    id: 'japan',
    name: 'Japan',
    code: 'JP',
    region: 'Asia Pacific',
    keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'fukuoka', 'yokohama']
  },
  {
    id: 'south_korea',
    name: 'South Korea',
    code: 'KR',
    region: 'Asia Pacific',
    keywords: ['south korea', 'korea', 'seoul', 'pangyo', 'incheon', 'daejeon']
  },
  {
    id: 'taiwan',
    name: 'Taiwan',
    code: 'TW',
    region: 'Asia Pacific',
    keywords: ['taiwan', 'taipei', 'hsinchu', 'taichung']
  },
  {
    id: 'hong_kong',
    name: 'Hong Kong',
    code: 'HK',
    region: 'Asia Pacific',
    keywords: ['hong kong', 'hk']
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    code: 'NZ',
    region: 'Asia Pacific',
    keywords: ['new zealand', 'auckland', 'wellington', 'christchurch']
  },
  {
    id: 'china',
    name: 'China',
    code: 'CN',
    region: 'Asia Pacific',
    keywords: ['china', 'beijing', 'shanghai', 'shenzhen', 'hangzhou', 'guangzhou', 'chengdu']
  },
  {
    id: 'malaysia',
    name: 'Malaysia',
    code: 'MY',
    region: 'Asia Pacific',
    keywords: ['malaysia', 'kuala lumpur', 'penang', 'cyberjaya']
  },
  {
    id: 'indonesia',
    name: 'Indonesia',
    code: 'ID',
    region: 'Asia Pacific',
    keywords: ['indonesia', 'jakarta', 'bandung', 'bali']
  },
  {
    id: 'vietnam',
    name: 'Vietnam',
    code: 'VN',
    region: 'Asia Pacific',
    keywords: ['vietnam', 'ho chi minh', 'hanoi', 'da nang']
  },
  {
    id: 'thailand',
    name: 'Thailand',
    code: 'TH',
    region: 'Asia Pacific',
    keywords: ['thailand', 'bangkok']
  },
  {
    id: 'philippines',
    name: 'Philippines',
    code: 'PH',
    region: 'Asia Pacific',
    keywords: ['philippines', 'manila', 'taguig', 'cebu']
  },

  // Middle East & Africa
  {
    id: 'israel',
    name: 'Israel',
    code: 'IL',
    region: 'Middle East & Africa',
    keywords: ['israel', 'tel aviv', 'haifa', 'herzliya', 'jerusalem']
  },
  {
    id: 'uae',
    name: 'United Arab Emirates',
    code: 'AE',
    region: 'Middle East & Africa',
    keywords: ['united arab emirates', 'uae', 'dubai', 'abu dhabi']
  },
  {
    id: 'saudi_arabia',
    name: 'Saudi Arabia',
    code: 'SA',
    region: 'Middle East & Africa',
    keywords: ['saudi arabia', 'riyadh', 'jeddah']
  },
  {
    id: 'qatar',
    name: 'Qatar',
    code: 'QA',
    region: 'Middle East & Africa',
    keywords: ['qatar', 'doha']
  },
  {
    id: 'turkey',
    name: 'Turkey',
    code: 'TR',
    region: 'Middle East & Africa',
    keywords: ['turkey', 'turkiye', 'istanbul', 'ankara']
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    code: 'ZA',
    region: 'Middle East & Africa',
    keywords: ['south africa', 'cape town', 'johannesburg']
  },
  {
    id: 'egypt',
    name: 'Egypt',
    code: 'EG',
    region: 'Middle East & Africa',
    keywords: ['egypt', 'cairo', 'alexandria']
  },
  {
    id: 'nigeria',
    name: 'Nigeria',
    code: 'NG',
    region: 'Middle East & Africa',
    keywords: ['nigeria', 'lagos', 'abuja']
  },
  {
    id: 'kenya',
    name: 'Kenya',
    code: 'KE',
    region: 'Middle East & Africa',
    keywords: ['kenya', 'nairobi']
  }
];

export const TOP_TECH_HUB_IDS = [
  'us',
  'india',
  'uk',
  'germany',
  'canada',
  'singapore',
  'ireland',
  'switzerland',
  'netherlands',
  'australia',
  'remote'
];
