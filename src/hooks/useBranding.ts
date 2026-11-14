'use client';

import { useVerificationConfig } from '../context/VerificationConfigContext';

export interface ResolvedBranding {
  /**
   * Logo URL to render, or undefined when there's nothing to show.
   * Resolves the `appearance.logo = 'default'` sentinel to the org's logo from
   * the server config response; any other value is used as a literal image URL.
   */
  logo?: string;
  /** Company name, from `appearance.companyName` or the server config. */
  companyName?: string;
}

/**
 * The logo to show. Unset is the organisation's logo, as 'default' is
 * (decision 2026-11-13); an empty string is a workflow's "None" and shows
 * nothing; anything else is an image URL.
 */
export function resolveLogo(configured: string | undefined, orgLogo: string | undefined): string | undefined {
  return configured === undefined || configured === 'default' ? orgLogo : configured || undefined;
}

/** Resolves the effective branding (logo + company name) for the current org. */
export function useBranding(): ResolvedBranding {
  const config = useVerificationConfig();
  const serverBranding = config.serverConfig.branding;
  const configuredLogo = config.appearance?.logo;

  return {
    logo: resolveLogo(configuredLogo, serverBranding?.logo),
    companyName: config.appearance?.companyName ?? serverBranding?.companyName,
  };
}
