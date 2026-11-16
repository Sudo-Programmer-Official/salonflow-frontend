export const MARKETING_SITE_ORIGIN = 'https://www.salonflow.studio';

export const MARKETING_SEO = {
  title: 'Salon Management Software for More Bookings | SalonFlow',
  description:
    'SalonFlow helps independent salons get more bookings and repeat customers with a website, online booking, reminders, reviews, loyalty, and growth tools in one system.',
  imagePath: '/images/landing/marketing-hero.webp',
};

export type MarketingFaq = {
  question: string;
  answer: string;
};

type MarketingSeoOptions = {
  path: string;
  title?: string;
  description?: string;
  noindex?: boolean;
  faqs?: MarketingFaq[];
};

const upsertMeta = (selector: string, attributes: Record<string, string>, content: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.content = content;
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

const removeMarketingStructuredData = () => {
  document.getElementById('ld-marketing')?.remove();
};

const upsertMarketingStructuredData = ({
  canonicalUrl,
  title,
  description,
  faqs,
}: {
  canonicalUrl: string;
  title: string;
  description: string;
  faqs: MarketingFaq[];
}) => {
  removeMarketingStructuredData();

  const organizationId = `${MARKETING_SITE_ORIGIN}/#organization`;
  const websiteId = `${MARKETING_SITE_ORIGIN}/#website`;
  const softwareId = `${MARKETING_SITE_ORIGIN}/#software`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: 'SalonFlow',
      url: MARKETING_SITE_ORIGIN,
      logo: `${MARKETING_SITE_ORIGIN}/icons/icon-512x512.png`,
      email: 'support@salonflow.studio',
      parentOrganization: {
        '@type': 'Organization',
        name: 'Sudo Programmer Inc.',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': softwareId,
      name: 'SalonFlow',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Salon management software',
      operatingSystem: 'Web',
      url: MARKETING_SITE_ORIGIN,
      description,
      publisher: { '@id': organizationId },
      offers: [
        { '@type': 'Offer', price: '65', priceCurrency: 'USD', name: 'Core' },
        { '@type': 'Offer', price: '99', priceCurrency: 'USD', name: 'Growth' },
        { '@type': 'Offer', price: '129', priceCurrency: 'USD', name: 'Complete' },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: MARKETING_SITE_ORIGIN,
      name: 'SalonFlow',
      description,
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      isPartOf: { '@id': websiteId },
      about: { '@id': softwareId },
    },
  ];

  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonicalUrl}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  const script = document.createElement('script');
  script.id = 'ld-marketing';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  document.head.appendChild(script);
};

export const applyMarketingSeo = ({
  path,
  title = MARKETING_SEO.title,
  description = MARKETING_SEO.description,
  noindex = false,
  faqs = [],
}: MarketingSeoOptions) => {
  if (typeof document === 'undefined') return;

  const normalizedPath = path === '/' ? '' : path;
  const canonicalUrl = `${MARKETING_SITE_ORIGIN}${normalizedPath}`;
  const imageUrl = `${MARKETING_SITE_ORIGIN}${MARKETING_SEO.imagePath}`;

  document.title = title;
  upsertMeta('meta[name="description"]', { name: 'description' }, description);
  upsertMeta('meta[name="robots"]', { name: 'robots' }, noindex ? 'noindex,follow' : 'index,follow');
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
  upsertMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);
  upsertLink('canonical', canonicalUrl);

  if (noindex) {
    removeMarketingStructuredData();
    return;
  }

  upsertMarketingStructuredData({ canonicalUrl, title, description, faqs });
};
