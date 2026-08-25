const noop = (): void => {};
const resolved = (): Promise<void> => Promise.resolve();

export function installPageStubs(): void {
  const scope = window as unknown as Record<string, unknown>;
  if (scope.FRVR) return;

  scope.FRVR = {
    config: {},
    init: noop,
    tracker: { addExtraFieldFunction: noop, levelStart: noop, levelEnd: noop },
    ads: { show: resolved },
    profile: { name: (): string => "" },
    channelCharacteristics: { allowNavigation: true },
    bootstrapper: { init: resolved, complete: resolved },
  };
  scope.frvrSdkInitPromise = resolved();
}
