export type WebsiteServicesPageConfig = {
  showServiceHighlights: boolean;
  showAllServicesSection: boolean;
  showGallery: boolean;
  enableServiceModal: boolean;
};

export const DEFAULT_WEBSITE_SERVICES_PAGE_CONFIG: WebsiteServicesPageConfig = {
  showServiceHighlights: true,
  showAllServicesSection: true,
  showGallery: true,
  enableServiceModal: true,
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
