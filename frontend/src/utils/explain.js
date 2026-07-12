const SUSPICIOUS_TLDS = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.download', '.review', '.work', '.date', '.men', '.loan', '.win', '.bid', '.trade', '.webcam', '.science', '.party', '.racing', '.accountant', '.vip', '.pw', '.us']

const SHORTENER_DOMAINS = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co', 'is.gd', 'buff.ly', 'shorturl.at', 'cut.ly', 'tiny.cc', 'rb.gy', 'shorte.st', 'cutt.ly', 'short.link', 'tinyurl']

const BRAND_NAMES = ['google', 'facebook', 'instagram', 'linkedin', 'twitter', 'apple', 'microsoft', 'amazon', 'netflix', 'paypal', 'whatsapp', 'telegram', 'youtube', 'gmail', 'outlook', 'yahoo', 'dropbox', 'adobe', 'spotify', 'amzn']

const PHISHING_URL_KEYWORDS = ['login', 'verify', 'secure', 'update', 'account', 'confirm', 'password', 'signin', 'sign-in', 'authenticate', 'billing', 'payment', 'unusual', 'suspended', 'restricted', 'alert', 'security', 'validate', 'blocked']

const FEATURE_TEMPLATES = {
  has_https: {
    risk: { emoji: '🔴', title: 'Uses insecure HTTP protocol', desc: 'Websites requesting sensitive information should use HTTPS to encrypt the connection.' },
    safe: { emoji: '🟢', title: 'Uses HTTPS', desc: 'The connection is encrypted and secure.' }
  },
  has_ip: {
    risk: { emoji: '🔴', title: 'Uses an IP address instead of a domain', desc: 'Legitimate services use domain names, not raw IP addresses.' }
  },
  num_subdomains: {
    risk: { emoji: '🟡', title: 'Excessive number of subdomains', desc: 'Attackers use many subdomains to disguise the real domain name.' },
    safe: { emoji: '🟢', title: 'Clean domain structure', desc: 'The domain has a standard, legitimate structure.' }
  },
  url_length: {
    risk: { emoji: '🟡', title: 'URL is unusually long', desc: 'Phishing URLs are often overly long to hide malicious intent.' },
    safe: { emoji: '🟢', title: 'Normal URL length', desc: 'The URL follows standard length conventions.' }
  },
  num_special_chars: {
    risk: { emoji: '🟡', title: 'URL contains many special characters', desc: 'Excessive special characters can obscure the true destination.' }
  },
  num_dots: {
    risk: { emoji: '🟡', title: 'Multiple dots in the domain', desc: 'Multiple dots can be used to impersonate legitimate domain names.' }
  },
  entropy: {
    risk: { emoji: '🟡', title: 'Unusual URL patterns detected', desc: 'Randomized characters and patterns are common in phishing URLs.' },
    safe: { emoji: '🟢', title: 'Normal URL structure', desc: 'The URL follows standard structural conventions.' }
  },
  domain_age_days: {
    risk: { emoji: '🟡', title: 'Domain was recently registered', desc: 'Newly registered domains are more likely to be used in phishing attacks.' },
    safe: { emoji: '🟢', title: 'Established domain', desc: 'The domain has existed for a significant period, indicating legitimacy.' }
  },
  trusted_domain: {
    safe: { emoji: '🟢', title: 'Trusted allowlist domain', desc: 'This domain is verified by our trusted domain database, indicating high trust.' }
  },
  safe_signal_override: {
    safe: { emoji: '🟢', title: 'Multiple safety signals detected', desc: 'The URL has HTTPS, no IP address, and multiple other safety indicators.' }
  },
  contains_url: {
    risk: { emoji: '🟡', title: 'Message contains a suspicious link', desc: 'Attackers often embed links to phishing pages within messages.' }
  },
  action_keywords: {
    risk: { emoji: '🟡', title: 'Contains urgent action keywords', desc: 'Phishing messages create urgency to pressure you into acting without thought.' }
  }
}

function getURLEnrichments(url) {
  const items = []
  if (!url) return items

  try {
    const parsed = new URL(url.startsWith('http') ? url : 'http://' + url)
    const hostname = parsed.hostname.toLowerCase()

    const tld = '.' + hostname.split('.').pop()
    if (SUSPICIOUS_TLDS.includes(tld)) {
      items.push({ emoji: '🟡', title: `Suspicious top-level domain (${tld})`, desc: 'Some TLDs are commonly abused in phishing campaigns.' })
    }

    for (const domain of SHORTENER_DOMAINS) {
      if (hostname.includes(domain)) {
        items.push({ emoji: '🟡', title: 'URL shortener detected', desc: 'Shortened URLs can conceal the actual destination website.' })
        break
      }
    }

    for (const brand of BRAND_NAMES) {
      if (hostname.includes(brand)) {
        const isOfficial = hostname === `${brand}.com` || hostname === `${brand}.org` || hostname.endsWith(`.${brand}.com`) || hostname.endsWith(`.${brand}.org`) || hostname.endsWith(`.${brand}.net`) || hostname.endsWith(`.${brand}.io`) || hostname.endsWith(`.${brand}.app`) || hostname.endsWith(`.${brand}.dev`)
        if (!isOfficial) {
          items.push({ emoji: '🔴', title: `Domain resembles "${brand}"`, desc: 'Attackers create domains that look similar to trusted brands to deceive you.' })
          break
        }
      }
    }

    const pathAndQuery = parsed.pathname.toLowerCase() + parsed.search.toLowerCase()
    for (const kw of PHISHING_URL_KEYWORDS) {
      if (pathAndQuery.includes(kw)) {
        items.push({ emoji: '🟡', title: `Contains "${kw}" in URL path`, desc: 'Attackers use common security and account-related terms to trick users.' })
        break
      }
    }
  } catch {
    const tldMatch = url.match(/\.([a-z]{2,})(?:\/|$)/)
    if (tldMatch) {
      const tld = '.' + tldMatch[1]
      if (SUSPICIOUS_TLDS.includes(tld)) {
        items.push({ emoji: '🟡', title: `Suspicious top-level domain (${tld})`, desc: 'Some TLDs are commonly abused in phishing campaigns.' })
      }
    }

    const lower = url.toLowerCase()
    for (const domain of SHORTENER_DOMAINS) {
      if (lower.includes(domain)) {
        items.push({ emoji: '🟡', title: 'URL shortener detected', desc: 'Shortened URLs can conceal the actual destination website.' })
        break
      }
    }
    for (const brand of BRAND_NAMES) {
      if (lower.includes(brand)) {
        items.push({ emoji: '🔴', title: `Domain resembles "${brand}"`, desc: 'Attackers create domains that look similar to trusted brands to deceive you.' })
        break
      }
    }
  }

  return items
}

export function generateExplanations(result, url) {
  if (!result) return []

  const { label, explanation } = result
  const isPhishing = label === 'phishing'
  const items = []

  if (explanation && explanation.length > 0) {
    for (const item of explanation) {
      const { feature, direction, risk_indicator } = item
      const isRisk = direction === 'increases_risk'
      const templates = FEATURE_TEMPLATES[feature]

      if (templates) {
        const match = isRisk ? templates.risk : templates.safe
        if (match) {
          items.push(match)
          continue
        }
      }

      if (feature && feature.startsWith('keyword_')) {
        const keyword = feature.replace('keyword_', '').replace(/_/g, ' ')
        items.push({ emoji: '🟡', title: `Contains suspicious keyword "${keyword}"`, desc: 'Attackers use familiar security-related terms to build false trust.' })
      }
    }
  }

  if (url) {
    const enrichments = getURLEnrichments(url)
    const seenTitles = new Set(items.map(i => i.title))
    for (const e of enrichments) {
      if (!seenTitles.has(e.title)) {
        items.push(e)
      }
    }
  }

  if (items.length === 0) {
    if (isPhishing) {
      items.push({ emoji: '🟡', title: 'Suspicious patterns detected', desc: 'The analysis identified potential phishing indicators.' })
    } else {
      items.push({ emoji: '🟢', title: 'No suspicious patterns found', desc: 'The content appears legitimate based on our analysis.' })
    }
  }

  const SEVERITY = { '🔴': 0, '🟡': 1, '🟢': 2 }
  items.sort((a, b) => (SEVERITY[a.emoji] ?? 1) - (SEVERITY[b.emoji] ?? 1))

  return items.slice(0, 6)
}
