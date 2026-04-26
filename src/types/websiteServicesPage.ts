export type WebsiteServicesPageConfig = {
  showServiceHighlights: boolean;
  showAllServicesSection: boolean;
  showGallery: boolean;
  enableServiceModal: boolean;
};

export const WEBSITE_HOME_SECTION_IDS = ['services', 'contact', 'gallery', 'faq'] as const;

export type WebsiteHomeSectionId = (typeof WEBSITE_HOME_SECTION_IDS)[number];

export type WebsiteHomeSectionVisibility = Record<WebsiteHomeSectionId, boolean>;

export type WebsiteHomeSectionConfig = {
  visibility: WebsiteHomeSectionVisibility;
  order: WebsiteHomeSectionId[];
};

export const DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG: WebsiteServicesPageConfig = {
  showServiceHighlights: true,
  showAllServicesSection: true,
  showGallery: true,
  enableServiceModal: true,
};

const DEFAULT_WEBSITE_HOME_SECTION_VISIBILITY: WebsiteHomeSectionVisibility = {
  services: true,
  contact: true,
  gallery: true,
  faq: true,
};

export const DEFAULT_WEBSITE_HOME_SECTION_CONFIG: WebsiteHomeSectionConfig = {
  visibility: { ...DEFAULT_WEBSITE_HOME_SECTION_VISIBILITY },
  order: ['services', 'contact', 'gallery', 'faq'],
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

export function normalizeWebsiteServicesPageConfig(
  input: unknown,
): WebsiteServicesPageConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    showServiceHighlights: normalizeBoolean(
      raw.showServiceHighlights,
      DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG.showServiceHighlights,
    ),
    showAllServicesSection: normalizeBoolean(
      raw.showAllServicesSection,
      DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG.showAllServicesSection,
    ),
    showGallery: normalizeBoolean(
      raw.showGallery,
      DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG.showGallery,
    ),
    enableServiceModal: normalizeBoolean(
      raw.enableServiceModal,
      DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG.enableServiceModal,
    ),
  };
}

const isWebsiteHomeSectionId = (value: unknown): value is WebsiteHomeSectionId =>
  typeof value === 'string' &&
  WEBSITE_HOME_SECTION_IDS.includes(value as WebsiteHomeSectionId);

const normalizeHomeVisibility = (value: unknown): WebsiteHomeSectionVisibility => {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    services: normalizeBoolean(
      raw.services,
      DEFAULT_WEBSITE_HOME_SECTION_CONFIG.visibility.services,
    ),
    contact: normalizeBoolean(
      raw.contact,
      DEFAULT_WEBSITE_HOME_SECTION_CONFIG.visibility.contact,
    ),
    gallery: normalizeBoolean(
      raw.gallery,
      DEFAULT_WEBSITE_HOME_SECTION_CONFIG.visibility.gallery,
    ),
    faq: normalizeBoolean(raw.faq, DEFAULT_WEBSITE_HOME_SECTION_CONFIG.visibility.faq),
  };
};

const normalizeHomeOrder = (value: unknown): WebsiteHomeSectionId[] => {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<WebsiteHomeSectionId>();
  const order: WebsiteHomeSectionId[] = [];

  raw.forEach((item) => {
    if (!isWebsiteHomeSectionId(item) || seen.has(item)) return;
    seen.add(item);
    order.push(item);
  });

  DEFAULT_WEBSITE_HOME_SECTION_CONFIG.order.forEach((item) => {
    if (seen.has(item)) return;
    order.push(item);
  });

  return order;
};

export function normalizeWebsiteHomeSectionConfig(
  input: unknown,
): WebsiteHomeSectionConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    visibility: normalizeHomeVisibility(raw.visibility || raw.visible),
    order: normalizeHomeOrder(raw.order),
  };
}
