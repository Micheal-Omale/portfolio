// Single source of truth for project content. The Home "Featured Works" section
// and the Work page both render from this list. Every project links out to its
// live site (`link`), opened in a new tab — there is no internal detail page.
export const projects = [
  {
    id: 'jobizzy',
    n: '01',
    title: 'Jobizzy',
    tag: 'AI · NUXT',
    year: '2025',
    link: 'https://jobizzy.logfolio.pro',
    image: '/work/jobizzy.webp',
    lead: 'An AI-assisted job platform that matches candidates to roles and drafts tailored applications.',
  },
  {
    id: 'logfolio',
    n: '02',
    title: 'Logfolio',
    tag: 'SAAS · VUE',
    year: '2025',
    link: 'https://logfolio.pro',
    image: '/work/logfolio.webp',
    lead: 'A SaaS platform for digital logbooks — structured records, approvals, and clean exports.',
  },
  {
    id: 'miles-jones',
    n: '03',
    title: 'Miles Jones',
    tag: 'PORTFOLIO · VUE',
    year: '2024',
    link: 'https://miles-jones-portfolio.vercel.app',
    image: '/work/miles.webp',
    lead: 'A fast, animation-rich portfolio site built to showcase a client’s work and story.',
  },
  {
    id: 'kleoris',
    n: '04',
    title: 'Kleoris',
    tag: 'LEAD GEN · SAAS',
    year: '2025',
    link: 'https://kleoris.vercel.app',
    image: '/work/kleoris.webp',
    comingSoon: true,
    lead: 'A lead-gen SaaS that scrapes Google Maps listings and enriches them with AI-extracted owner names, verified emails, and phone types — served as a searchable, exportable dashboard.',
  },
]

export const projectCount = String(projects.length).padStart(2, '0')

export function getProject(id) {
  return projects.find((project) => project.id === id)
}
