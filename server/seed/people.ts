// Fictional demo world — no real people. Designed so each demo scenario has a
// clear best fit, a few plausible fits, and visibly weak ones.
//
// Demo accounts (one-click on the sign-in page; password for manual sign-in:
// "partnerup-demo"):
//   • arnav@demo.partnerup.test — starts WITHOUT Partner DNA so the demo shows Muse building it
//   • riya@demo.partnerup.test  — the second account for the Mutual "switch account" demo

import type { Gender, PartnerDNA, ScoutIntent, TimeSlot } from '../../shared/types';

export const DEMO_PASSWORD = 'partnerup-demo';

export interface SeedPerson {
  key: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  age: number;
  phone: string | null;
  instagram: string | null;
  avatarHue: number;
  demoAccount?: boolean;
  dormant?: boolean;
  dna: Omit<PartnerDNA, 'lastSource' | 'updatedAt'> | null;
  requests: ScoutIntent[];
}

function dna(d: Partial<Omit<PartnerDNA, 'lastSource' | 'updatedAt'>>): Omit<PartnerDNA, 'lastSource' | 'updatedAt'> {
  return {
    about: '',
    interests: [],
    skills: [],
    learning: [],
    goals: [],
    needs: [],
    offers: [],
    location: null,
    availability: [],
    preferences: [],
    languages: ['English'],
    ...d,
  };
}

function intent(i: Partial<ScoutIntent> & Pick<ScoutIntent, 'summary' | 'category'>): ScoutIntent {
  return {
    lens: 'connect',
    neededSkills: [],
    interests: [],
    learningNeeds: [],
    offers: [],
    location: null,
    context: null,
    groupSize: null,
    availability: [],
    languages: [],
    ...i,
  };
}

const EVE_WKND: TimeSlot[] = ['evenings', 'weekends'];

export const PEOPLE: SeedPerson[] = [
  // ── Demo accounts ────────────────────────────────────────────────────────
  {
    key: 'arnav',
    firstName: 'Arnav',
    lastName: 'Desai',
    gender: 'man',
    age: 20,
    phone: '(404) 555-0142',
    instagram: '@arnav.builds',
    avatarHue: 38,
    demoAccount: true,
    dna: null,
    requests: [],
  },
  {
    key: 'riya',
    firstName: 'Riya',
    lastName: 'Shah',
    gender: 'woman',
    age: 20,
    phone: '(678) 555-0123',
    instagram: '@riya.makes',
    avatarHue: 330,
    demoAccount: true,
    dna: dna({
      about: 'Design student at KSU who loves photography and trying new food spots.',
      interests: ['Photography', 'Food', 'Travel'],
      skills: ['UI/UX design'],
      learning: ['Programming'],
      goals: ['Meet people'],
      location: 'KSU',
      availability: EVE_WKND,
    }),
    requests: [],
  },

  // ── Scout: hackathon / builders ─────────────────────────────────────────
  {
    key: 'alex',
    firstName: 'Alex',
    lastName: 'Rivera',
    gender: 'nonbinary',
    age: 21,
    phone: null,
    instagram: '@alex.rivera.codes',
    avatarHue: 205,
    dna: dna({
      about: 'CS major. I build climate tools at hackathons and I’m always up for a weekend project.',
      interests: ['Sustainability', 'Hackathons', 'Climbing', 'Music'],
      skills: ['Programming', 'Python', 'Web development'],
      learning: ['UI/UX design'],
      goals: ['Build projects'],
      offers: ['Programming'],
      location: 'Georgia Tech',
      availability: EVE_WKND,
      preferences: ['Small groups'],
      languages: ['English', 'Spanish'],
    }),
    requests: [
      intent({
        summary: 'A hackathon team working on sustainability',
        category: 'Hackathon team',
        interests: ['Sustainability'],
        offers: ['Programming'],
        neededSkills: ['UI/UX design'],
      }),
    ],
  },
  {
    key: 'maya',
    firstName: 'Maya',
    lastName: 'Chen',
    gender: 'woman',
    age: 20,
    phone: null,
    instagram: '@maya.designs',
    avatarHue: 352,
    dna: dna({
      about: 'Product designer who wants to design things that actually help the planet.',
      interests: ['Sustainability', 'Art', 'Photography', 'Coffee'],
      skills: ['UI/UX design'],
      learning: ['Programming'],
      goals: ['Build projects'],
      offers: ['UI/UX design'],
      location: 'Georgia Tech',
      availability: EVE_WKND,
    }),
    requests: [intent({ summary: 'A hackathon team that needs a designer', category: 'Hackathon team', interests: ['Sustainability'], offers: ['UI/UX design'] })],
  },
  {
    key: 'sam',
    firstName: 'Sam',
    lastName: 'Patel',
    gender: 'nonbinary',
    age: 21,
    phone: '(770) 555-0188',
    instagram: null,
    avatarHue: 265,
    dna: dna({
      about: 'ML nerd. Trained a model to predict energy use in dorms.',
      interests: ['Sustainability', 'Hiking', 'Chess'],
      skills: ['AI / ML', 'Data science'],
      learning: ['Web development'],
      goals: ['Build projects'],
      offers: ['AI / ML'],
      location: 'Georgia Tech',
      availability: ['weekends', 'evenings'],
    }),
    requests: [intent({ summary: 'Hackathon teammates for a climate project', category: 'Hackathon team', interests: ['Sustainability'], offers: ['AI / ML'] })],
  },
  {
    key: 'priya',
    firstName: 'Priya',
    lastName: 'Nair',
    gender: 'woman',
    age: 22,
    phone: null,
    instagram: '@priya.ships',
    avatarHue: 20,
    dna: dna({
      about: 'Full-stack dev with a fintech idea, looking for a business-minded cofounder.',
      interests: ['Startups', 'Coffee', 'Podcasts'],
      skills: ['Programming', 'JavaScript', 'Mobile development'],
      goals: ['Build a startup'],
      location: 'Georgia State',
      availability: ['weekdays', 'evenings'],
    }),
    requests: [intent({ summary: 'A startup cofounder who knows business', category: 'Startup team', neededSkills: ['Business'], interests: ['Startups'] })],
  },
  {
    key: 'jordan',
    firstName: 'Jordan',
    lastName: 'Brooks',
    gender: 'man',
    age: 23,
    phone: '(404) 555-0107',
    instagram: null,
    avatarHue: 150,
    dna: dna({
      about: 'Business + product. I like turning ideas into plans.',
      interests: ['Startups', 'Basketball', 'Podcasts'],
      skills: ['Product management', 'Business', 'Marketing'],
      goals: ['Build a startup'],
      location: 'Emory',
      availability: ['evenings'],
    }),
    requests: [],
  },

  // ── Scout: roommates at KSU ─────────────────────────────────────────────
  {
    key: 'marcus',
    firstName: 'Marcus',
    lastName: 'Johnson',
    gender: 'man',
    age: 20,
    phone: '(470) 555-0199',
    instagram: '@marcus.j',
    avatarHue: 95,
    dna: dna({
      about: 'Finance major at KSU. Quiet, tidy, early to bed on weeknights.',
      interests: ['Basketball', 'Cooking', 'Movies'],
      skills: ['Business'],
      needs: ['Roommate'],
      goals: ['Meet people'],
      location: 'KSU',
      availability: EVE_WKND,
      preferences: ['Clean & tidy', 'Quiet', 'Non-smoker'],
    }),
    requests: [
      intent({ summary: 'A roommate near KSU for next semester', category: 'Roommate', location: 'KSU', context: 'next semester' }),
    ],
  },
  {
    key: 'ella',
    firstName: 'Ella',
    lastName: 'Morgan',
    gender: 'woman',
    age: 21,
    phone: '(470) 555-0161',
    instagram: null,
    avatarHue: 300,
    dna: dna({
      about: 'Theatre kid at KSU. Night owl who loves hosting friends.',
      interests: ['Dance', 'Anime'],
      skills: ['Marketing'],
      needs: ['Roommate'],
      location: 'KSU',
      availability: ['mornings', 'afternoons'],
      preferences: ['Night owl', 'Social'],
    }),
    requests: [intent({ summary: 'A roommate at KSU who likes having people over', category: 'Roommate', location: 'KSU' })],
  },
  {
    key: 'chris',
    firstName: 'Chris',
    lastName: 'Lee',
    gender: 'man',
    age: 22,
    phone: null,
    instagram: '@chris.lee.gt',
    avatarHue: 180,
    dna: dna({
      about: 'Grad student at Georgia Tech.',
      interests: ['Running', 'Coffee'],
      skills: ['Statistics'],
      needs: ['Roommate'],
      location: 'Georgia Tech',
      availability: EVE_WKND,
      preferences: ['Quiet', 'Clean & tidy'],
    }),
    requests: [intent({ summary: 'A roommate near Georgia Tech', category: 'Roommate', location: 'Georgia Tech' })],
  },

  // ── Scout: exploring Atlanta ────────────────────────────────────────────
  {
    key: 'jamal',
    firstName: 'Jamal',
    lastName: 'Carter',
    gender: 'man',
    age: 21,
    phone: null,
    instagram: '@jamal.shoots.atl',
    avatarHue: 28,
    dna: dna({
      about: 'Born and raised in Atlanta. I know every food spot on Buford Highway.',
      interests: ['Food', 'Photography', 'Markets', 'Jazz', 'Exploring the city'],
      goals: ['Meet people'],
      offers: ['Showing people around'],
      location: 'Atlanta',
      availability: ['weekends', 'afternoons'],
      languages: ['English', 'French'],
    }),
    requests: [
      intent({ summary: 'Show newcomers the best of Atlanta this weekend', category: 'Exploring the city', lens: 'explore', location: 'Atlanta', availability: ['weekends'] }),
    ],
  },
  {
    key: 'mateo',
    firstName: 'Mateo',
    lastName: 'Silva',
    gender: 'man',
    age: 20,
    phone: '(404) 555-0133',
    instagram: '@mateo.in.atl',
    avatarHue: 120,
    dna: dna({
      about: 'Just arrived from São Paulo for my master’s.',
      interests: ['Soccer', 'Food', 'Music'],
      skills: ['Data science'],
      goals: ['Meet people'],
      location: 'Georgia Tech',
      availability: ['weekends'],
      languages: ['Portuguese', 'English', 'Spanish'],
    }),
    requests: [intent({ summary: 'Explore Atlanta with new people on weekends', category: 'Exploring the city', lens: 'explore', location: 'Atlanta', availability: ['weekends'] })],
  },
  {
    key: 'grace',
    firstName: 'Grace',
    lastName: 'Liu',
    gender: 'woman',
    age: 24,
    phone: null,
    instagram: '@grace.makes.things',
    avatarHue: 305,
    dna: dna({
      about: 'UX designer. Weekend museum hopper and Beltline walker.',
      interests: ['Museums', 'Coffee', 'Food', 'Parks'],
      skills: ['UI/UX design'],
      goals: ['Meet people'],
      location: 'Atlanta',
      availability: ['weekends', 'mornings'],
      languages: ['English', 'Mandarin'],
    }),
    requests: [intent({ summary: 'Try restaurants and activities around Atlanta', category: 'Exploring the city', lens: 'explore', location: 'Atlanta', interests: ['Food'] })],
  },
  {
    key: 'lucia',
    firstName: 'Lucía',
    lastName: 'Fernández',
    gender: 'woman',
    age: 21,
    phone: null,
    instagram: '@lucia.en.atl',
    avatarHue: 10,
    dna: dna({
      about: 'Exchange student from Madrid at Emory.',
      interests: ['Dance', 'Photography', 'Travel', 'Food'],
      skills: ['Physics'],
      learning: ['English'],
      goals: ['Meet people'],
      location: 'Emory',
      availability: ['weekends', 'evenings'],
      languages: ['Spanish', 'English'],
    }),
    requests: [intent({ summary: 'Explore Atlanta and practice English', category: 'Exploring the city', lens: 'explore', location: 'Atlanta' })],
  },
  {
    key: 'yuki',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    gender: 'woman',
    age: 22,
    phone: null,
    instagram: '@yuki.film.tokyo',
    avatarHue: 0,
    dna: dna({
      about: 'Tokyo local with a film camera always in my bag.',
      interests: ['Photography', 'Food', 'Anime'],
      goals: ['Meet people'],
      offers: ['Showing people around'],
      location: 'Tokyo',
      availability: EVE_WKND,
      languages: ['Japanese', 'English'],
    }),
    requests: [intent({ summary: 'Show visitors around Tokyo', category: 'Exploring the city', lens: 'explore', location: 'Tokyo' })],
  },

  // ── Scout: study groups ─────────────────────────────────────────────────
  {
    key: 'daniel',
    firstName: 'Daniel',
    lastName: 'Kim',
    gender: 'man',
    age: 20,
    phone: null,
    instagram: '@dkim.codes',
    avatarHue: 215,
    dna: dna({
      about: 'CS sophomore. Calc clicked for me; chem did not.',
      interests: ['Chess', 'Movies'],
      skills: ['Calculus', 'Python', 'Linear algebra'],
      learning: ['Chemistry'],
      location: 'Georgia Tech',
      availability: ['evenings', 'weekdays'],
    }),
    requests: [intent({ summary: 'A Calculus II study group', category: 'Study partners', lens: 'learn', learningNeeds: ['Calculus'], groupSize: 3 })],
  },
  {
    key: 'hannah',
    firstName: 'Hannah',
    lastName: 'Okafor',
    gender: 'woman',
    age: 21,
    phone: '(404) 555-0170',
    instagram: null,
    avatarHue: 170,
    dna: dna({
      about: 'Chem TA who loves explaining things.',
      interests: ['Running', 'Reading'],
      skills: ['Chemistry', 'Calculus'],
      learning: ['Physics'],
      location: 'Georgia Tech',
      availability: ['evenings', 'weekdays'],
    }),
    requests: [],
  },
  {
    key: 'aisha',
    firstName: 'Aisha',
    lastName: 'Rahman',
    gender: 'woman',
    age: 20,
    phone: null,
    instagram: '@aisha.explains',
    avatarHue: 45,
    dna: dna({
      about: 'Physics + stats. Calculus is humbling me this semester.',
      interests: ['Podcasts', 'Board games'],
      skills: ['Physics', 'Statistics'],
      learning: ['Calculus'],
      location: 'Georgia State',
      availability: ['evenings'],
    }),
    requests: [intent({ summary: 'A calculus study group', category: 'Study partners', lens: 'learn', learningNeeds: ['Calculus'], groupSize: 3 })],
  },

  // ── Scout: gaming / language ─────────────────────────────────────────────
  {
    key: 'sofia',
    firstName: 'Sofia',
    lastName: 'Martínez',
    gender: 'woman',
    age: 19,
    phone: null,
    instagram: '@sofi.sketches',
    avatarHue: 290,
    dna: dna({
      about: 'Illustration student. Valorant after midnight.',
      interests: ['Valorant', 'Anime', 'Art'],
      skills: ['Art'],
      location: 'SCAD Atlanta',
      availability: ['late_nights', 'weekends'],
      languages: ['Spanish', 'English'],
    }),
    requests: [intent({ summary: 'People to play Valorant with at night', category: 'Gaming partners', interests: ['Valorant'], availability: ['late_nights'] })],
  },
  {
    key: 'kenji',
    firstName: 'Kenji',
    lastName: 'Watanabe',
    gender: 'man',
    age: 23,
    phone: null,
    instagram: '@kenji.w',
    avatarHue: 190,
    dna: dna({
      about: 'Grad student from Osaka. Happy to teach Japanese for English practice.',
      interests: ['Photography', 'Cooking', 'Hiking'],
      skills: ['Japanese', 'Linear algebra'],
      learning: ['English'],
      location: 'Georgia Tech',
      availability: ['afternoons', 'evenings'],
      languages: ['Japanese', 'English'],
    }),
    requests: [intent({ summary: 'A Japanese–English language exchange', category: 'Language exchange', lens: 'learn', learningNeeds: ['English'] })],
  },
  {
    key: 'noah',
    firstName: 'Noah',
    lastName: 'Williams',
    gender: 'man',
    age: 22,
    phone: null,
    instagram: '@noah.kicks',
    avatarHue: 110,
    dna: dna({
      about: 'Pickup soccer every Saturday.',
      interests: ['Soccer', 'Gym', 'F1'],
      skills: ['Engineering'],
      location: 'Georgia Tech',
      availability: ['weekends', 'mornings'],
    }),
    requests: [intent({ summary: 'People to play soccer with on weekends', category: 'New friends', interests: ['Soccer'], availability: ['weekends'] })],
  },

  // ── Keep Looking demo: joins later (dormant until "a new student joins") ─
  {
    key: 'tyler',
    firstName: 'Tyler',
    lastName: 'Nguyen',
    gender: 'man',
    age: 20,
    phone: '(470) 555-0115',
    instagram: '@tyler.bots',
    avatarHue: 60,
    dormant: true,
    dna: dna({
      about: 'Mechatronics at KSU. I build robots and want a team for competitions.',
      interests: ['Robotics', 'Hackathons'],
      skills: ['Programming', 'C++', 'Electrical engineering'],
      goals: ['Build projects'],
      location: 'KSU',
      availability: EVE_WKND,
    }),
    requests: [intent({ summary: 'A robotics team at KSU', category: 'Robotics team', location: 'KSU', interests: ['Robotics'] })],
  },
];

/** Anonymous Mutual activity so Partner Pulse isn't empty on day one. */
export const MUTUAL_SEEDS = {
  /** people who searched for each demo account (they never learn who) */
  searchesOf: { arnav: ['priya', 'maya', 'sofia', 'grace', 'noah', 'lucia'], riya: ['jordan', 'mateo', 'chris'] } as Record<string, string[]>,
  /** a private, one-sided choice the demo account doesn't know about */
  incoming: [{ from: 'priya', to: 'arnav' }],
};
