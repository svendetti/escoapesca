export function formatReleaseLabel(version: string, commit: string) {
  return `Beta Lazio v${version} · ${commit}`;
}

export const APP_RELEASE_LABEL = formatReleaseLabel(
  __APP_VERSION__,
  __APP_COMMIT__,
);
