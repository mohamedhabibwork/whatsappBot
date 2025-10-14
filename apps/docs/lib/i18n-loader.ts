/**
 * Load translations from backend API
 * This can be used to dynamically load translations from the API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function loadTranslationsFromAPI(
  locale: string,
  namespace: string = "common"
): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${API_URL}/api/locales/${locale}/${namespace}`, {
      cache: "force-cache",
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error(`Failed to load translations from API: ${response.statusText}`);
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error("Error loading translations from API:", error);
    return {};
  }
}

export async function getAvailableLanguages(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/locales`, {
      cache: "force-cache",
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return ["en", "ar"];
    }

    const data = await response.json();
    return data.languages || ["en", "ar"];
  } catch (error) {
    console.error("Error loading available languages:", error);
    return ["en", "ar"];
  }
}
