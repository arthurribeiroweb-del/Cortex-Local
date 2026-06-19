const { getWebSearchConfig: getConfig } = require("./config");

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new Error(`Resposta do provedor não veio em JSON válido. HTTP ${response.status}.`);
    }

    if (!response.ok) {
      throw new Error(`Provedor retornou HTTP ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Busca web demorou demais e foi cancelada.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Provedor retornou HTTP ${response.status}.`);
    }

    return text;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Busca web demorou demais e foi cancelada.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripHtml(value) {
  return decodeHtml(String(value || "")
    .replace(/<\/(p|div|li|br|section|article|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractDuckDuckGoUrl(href) {
  const decodedHref = decodeHtml(href);

  try {
    const parsed = new URL(decodedHref, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");

    if (uddg) {
      return decodeURIComponent(uddg);
    }

    return parsed.href;
  } catch (error) {
    return "";
  }
}

function compactResult(result) {
  return {
    title: String(result.title || "Sem título").trim(),
    url: String(result.url || "").trim(),
    snippet: String(result.snippet || result.content || result.description || "").trim(),
    checked_at: new Date().toISOString()
  };
}

function filterResults(results, maxResults) {
  return results
    .map(compactResult)
    .filter((result) => result.url && result.title)
    .slice(0, maxResults);
}

async function searchTavily(query, config) {
  if (!config.tavilyApiKey) {
    throw new Error("Tavily não configurado. Defina TAVILY_API_KEY no .env.");
  }

  const data = await fetchJsonWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.tavilyApiKey}`
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: config.maxResults,
      include_answer: false,
      include_raw_content: false
    })
  }, config.timeoutMs);

  return filterResults(Array.isArray(data.results) ? data.results : [], config.maxResults);
}

async function searchBrave(query, config) {
  if (!config.braveApiKey) {
    throw new Error("Brave Search não configurado. Defina BRAVE_SEARCH_API_KEY no .env.");
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(config.maxResults));
  url.searchParams.set("safesearch", "moderate");

  const data = await fetchJsonWithTimeout(url, {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": config.braveApiKey
    }
  }, config.timeoutMs);

  const results = data.web && Array.isArray(data.web.results) ? data.web.results : [];
  return filterResults(results.map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.description
  })), config.maxResults);
}

async function searchSearxng(query, config) {
  if (!config.searxngUrl) {
    throw new Error("SearXNG não configurado. Defina SEARXNG_URL no .env.");
  }

  const url = new URL("/search", config.searxngUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");

  const data = await fetchJsonWithTimeout(url, {
    headers: {
      "Accept": "application/json"
    }
  }, config.timeoutMs);

  const results = Array.isArray(data.results) ? data.results : [];
  return filterResults(results.map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.content
  })), config.maxResults);
}

async function searchDuckDuckGo(query, config) {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);

  const html = await fetchTextWithTimeout(url, {
    method: "GET",
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AssistantLocal/1.0"
    }
  }, config.timeoutMs);

  const blocks = html.match(/<div[^>]+class="[^"]*\bresult\b[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*\bresult\b|<\/body>)/gi) || [];
  const results = [];

  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]+class="[^"]*\bresult__a\b[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);

    if (!linkMatch) {
      continue;
    }

    const snippetMatch = block.match(/<a[^>]+class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div[^>]+class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    results.push({
      title: stripHtml(linkMatch[2]),
      url: extractDuckDuckGoUrl(linkMatch[1]),
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : ""
    });

    if (results.length >= config.maxResults) {
      break;
    }
  }

  return filterResults(results, config.maxResults);
}

async function searchWeb(query) {
  const config = getConfig();

  if (!query || !String(query).trim()) {
    throw new Error("Consulta de busca web vazia.");
  }

  if (config.provider === "none") {
    return {
      ok: false,
      provider: "none",
      configured: false,
      results: [],
      error: "Busca web não configurada. Defina WEB_SEARCH_PROVIDER no .env."
    };
  }

  let results;

  if (config.provider === "tavily") {
    results = await searchTavily(query, config);
  } else if (config.provider === "brave") {
    results = await searchBrave(query, config);
  } else if (config.provider === "searxng") {
    results = await searchSearxng(query, config);
  } else if (config.provider === "duckduckgo") {
    results = await searchDuckDuckGo(query, config);
  } else {
    throw new Error(`Provedor de busca web desconhecido: ${config.provider}`);
  }

  return {
    ok: true,
    provider: config.provider,
    configured: true,
    results,
    checked_at: new Date().toISOString()
  };
}

module.exports = {
  getConfig,
  searchWeb
};
