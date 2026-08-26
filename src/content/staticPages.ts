/**
 * Copy for the static pages.
 *
 * Kept as data rather than markup so it can be edited without touching a
 * component, and so the unfilled facts are countable.
 *
 * ── Read before publishing ──────────────────────────────────────────────────
 * The Privacy Policy and Terms are DRAFTS. They describe accurately what the
 * platform actually does — which is the part a developer can write — but they
 * are legal documents and have not been reviewed by anyone qualified to
 * approve them. `DRAFT_NOTICE` renders a visible banner until Nova Couture
 * signs them off; set `approved: true` on a page to remove it.
 *
 * Anything in [[double brackets]] is a fact nobody has supplied yet. It renders
 * highlighted so it cannot be missed, and docs/CONTENT-TODO.md lists them all.
 * Nothing here is invented: there is no address, no phone number and no company
 * history in this file, because none was provided.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface Section {
  heading?: string
  paragraphs: string[]
  list?: string[]
}

export interface StaticPageContent {
  title: string
  intro?: string
  /** Legal pages carry a draft banner until this is true. */
  approved: boolean
  /** Shown as "Last updated" on legal pages. */
  updated?: string
  sections: Section[]
}

export const STATIC_PAGES: Record<'about' | 'contact' | 'privacy' | 'terms', StaticPageContent> = {
  about: {
    title: 'About',
    approved: false,
    intro:
      'Nova Couture keeps a private catalogue of fine gold and stone work, shown to registered clients.',
    sections: [
      {
        paragraphs: [
          '[[Nova Couture to supply: a short history of the house — when it was founded, by whom, and where it works from. Two or three paragraphs is plenty.]]',
          '[[Nova Couture to supply: what the house is known for — temple work, bridal sets, particular stones or techniques.]]',
        ],
      },
      {
        heading: 'How the catalogue works',
        paragraphs: [
          'This is a catalogue, not a shop. Pieces are shown here so clients can see the current work; nothing is sold through the site and no prices are listed.',
          'Some pieces are shown to everyone. A wider selection is shown to registered clients, and certain pieces are reserved for premium clients. Access is arranged by Nova Couture directly.',
        ],
      },
    ],
  },

  contact: {
    title: 'Contact',
    approved: false,
    intro: 'Enquiries about any piece in the catalogue are welcome.',
    sections: [
      {
        heading: 'The showroom',
        paragraphs: [
          '[[Nova Couture to supply: full postal address.]]',
          '[[Nova Couture to supply: opening hours.]]',
        ],
      },
      {
        heading: 'By telephone or message',
        paragraphs: ['[[Nova Couture to supply: telephone and WhatsApp number.]]'],
      },
      {
        heading: 'By email',
        paragraphs: [
          '[[Nova Couture to supply: the email address enquiries should reach. This is the same address the enquiry button on a product uses, so it must be one that is actually monitored.]]',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    approved: false,
    updated: '[[date of approval]]',
    intro:
      'This policy explains what Nova Couture collects when you register for the catalogue, why, and what you can ask us to do about it.',
    sections: [
      {
        heading: 'Who is responsible',
        paragraphs: [
          '[[Nova Couture to supply: registered business name, address, and the name or role of the person handling privacy questions.]]',
        ],
      },
      {
        heading: 'What we collect',
        paragraphs: ['When you register for access to the catalogue, we collect:'],
        list: [
          'Your name.',
          'Your WhatsApp mobile number. This identifies your account and is how you sign in.',
          'Your company name, if you give one. This is optional.',
          'Your email address, if you give one. This is optional.',
          'The date and time you agreed to this policy.',
        ],
      },
      {
        paragraphs: [
          'We do not ask for, and do not store, payment details, identity documents, or a date of birth. Nothing is sold through this site, so there is no order history.',
          'If you open a private collection link we have sent you, we record that it was opened, when, and by which mobile number — so we know whether the selection reached you. If you send an enquiry about a piece, that enquiry is composed in your own email application and sent to us as an ordinary email; the website does not keep a copy.',
        ],
      },
      {
        heading: 'Why we collect it',
        paragraphs: [
          'Your mobile number identifies your account and controls which parts of the catalogue you can see. Your name and company help us recognise you when you get in touch. We do not use any of it for advertising, and we do not profile you.',
        ],
      },
      {
        heading: 'Where it is stored',
        paragraphs: [
          '[[Confirm before publishing: the database is currently hosted in Tokyo, Japan (AWS ap-northeast-1). If the platform moves to an Indian region before launch, change this sentence. Stating the wrong country is worse than stating none.]]',
          'Your details are held in a managed database with access restricted to Nova Couture. Photographs are stored privately and are served only to accounts entitled to view them.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'We do not sell your details and we do not share them with anyone for marketing. They are handled by the companies that run our hosting and database on our behalf, and by nobody else.',
          '[[Nova Couture to confirm: whether any other party — an agency, a CRM, an accountant — is given access to the client list. If so it must be named here.]]',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'We keep your details for as long as your account exists. If you ask us to close it, we delete your name, number and company from the catalogue.',
          '[[Nova Couture to confirm: whether records are kept for any period after an account is closed, for accounting or other reasons.]]',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Under the Digital Personal Data Protection Act, 2023, you may ask us to show you the details we hold about you, correct anything wrong, or delete your account. You may also withdraw your consent at any time, which means closing your account.',
          'To do any of these, contact us using the details on the Contact page. [[Nova Couture to confirm: how quickly requests will be answered, and who is responsible for them.]]',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'This site does not use advertising or analytics cookies, and there are no third-party trackers. When you sign in, your browser stores a session so you stay signed in; signing out removes it. Typefaces are served from this site rather than from an external font service, so visiting the site does not tell anyone else that you were here.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'If this policy changes we will update the date at the top of this page.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Use',
    approved: false,
    updated: '[[date of approval]]',
    intro: 'These terms cover the use of the Nova Couture online catalogue.',
    sections: [
      {
        heading: 'The catalogue is for viewing',
        paragraphs: [
          'This site shows pieces from the Nova Couture catalogue. It is not a shop. Nothing is offered for sale through the site, no prices are shown, and no order can be placed here. Anything shown is subject to availability, and a piece appearing here is not an offer to sell it.',
        ],
      },
      {
        heading: 'Accounts and access',
        paragraphs: [
          'Access is arranged by Nova Couture. One account belongs to one mobile number, and it is for the person it was issued to — please do not share your sign-in with anyone else.',
          'Some pieces are shown only to premium clients. Premium access is granted by Nova Couture at its discretion, and may be changed or withdrawn.',
          'We may suspend or close an account that is shared, misused, or used to copy the catalogue.',
        ],
      },
      {
        heading: 'Private collection links',
        paragraphs: [
          'A private link sent to you shows a selection chosen for you. It is meant for you alone. Forwarding it will not give anyone else access — the recipient must be a premium client to open it — but please treat it as private regardless.',
        ],
      },
      {
        heading: 'Photographs and designs',
        paragraphs: [
          'The photographs, designs and text on this site belong to Nova Couture. You may look at them. You may not copy, download, reproduce or republish them, and you may not use them to have pieces made elsewhere.',
          'The designs shown are the work of the house, and copying them is not permitted.',
        ],
      },
      {
        heading: 'Accuracy',
        paragraphs: [
          'We take care over the catalogue, but colour and scale vary between screens, and a photograph cannot show a piece exactly as it is in the hand. Please treat the photographs as a guide and ask us about anything that matters to you.',
        ],
      },
      {
        heading: 'Availability',
        paragraphs: [
          'We try to keep the site available, but we do not guarantee it will be, and we may change or withdraw any part of it without notice.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          '[[Nova Couture to confirm: these terms are governed by the laws of India, with courts at (city) having jurisdiction. The city must be confirmed.]]',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['Questions about these terms can be sent to us using the Contact page.'],
      },
    ],
  },
}

export type StaticPageSlug = keyof typeof STATIC_PAGES

/** Splits text into plain runs and [[unsupplied fact]] runs for rendering. */
export function splitPlaceholders(text: string): { text: string; placeholder: boolean }[] {
  return text
    .split(/(\[\[[^\]]+\]\])/g)
    .filter((part) => part !== '')
    .map((part) =>
      part.startsWith('[[') && part.endsWith(']]')
        ? { text: part.slice(2, -2), placeholder: true }
        : { text: part, placeholder: false },
    )
}

/** Every unsupplied fact across all pages, for the pre-launch checklist. */
export function outstandingFacts(): { page: string; text: string }[] {
  const out: { page: string; text: string }[] = []
  for (const [slug, page] of Object.entries(STATIC_PAGES)) {
    const texts = [
      page.intro ?? '',
      page.updated ?? '',
      ...page.sections.flatMap((s) => [...s.paragraphs, ...(s.list ?? [])]),
    ]
    for (const text of texts) {
      for (const part of splitPlaceholders(text)) {
        if (part.placeholder) out.push({ page: slug, text: part.text })
      }
    }
  }
  return out
}
