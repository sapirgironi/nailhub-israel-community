export function normalizeAcademyVideoUrl(value: string): string | null {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    const allowedHosts = new Set([
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "vimeo.com",
      "www.vimeo.com",
      "player.vimeo.com",
    ]);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !allowedHosts.has(url.hostname.toLowerCase())
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
