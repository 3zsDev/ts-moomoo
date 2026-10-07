export interface FrvrAdProviderConfig {
  name: string;
  type: string;
  priority: number;
  config?: Record<string, unknown>;
  adsConfig?: {
    banners?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

export interface FrvrAdsConfig {
  enabled: boolean;
  clientId?: string;
  testMode?: boolean;
  providers: FrvrAdProviderConfig[];
  banners?: Array<Record<string, unknown>>;
  throttling?: {
    maxfrequency?: number;
    [key: string]: unknown;
  };
}

export const frvrAdsConfig: FrvrAdsConfig = {
  enabled: false,
  clientId: "ca-pub-6180084390675113",
  providers: [
    { name: "web-interstitial", type: "interstitial", priority: 0 },
    { name: "web-reward", type: "reward", priority: 1 },
  ],
};

export function getFrvrAdsConfig(): FrvrAdsConfig {
  return {
    ...frvrAdsConfig,
    providers: frvrAdsConfig.enabled
      ? frvrAdsConfig.providers.map((provider) => ({
          ...provider,
          adsConfig: {
            clientId: frvrAdsConfig.clientId,
            testMode: frvrAdsConfig.testMode ?? false,
            banners: frvrAdsConfig.banners ?? [],
            ...provider.adsConfig,
          },
        }))
      : [],
  };
}
