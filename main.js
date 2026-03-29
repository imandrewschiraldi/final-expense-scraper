import { Actor } from 'apify';
import { PuppeteerCrawler, RequestQueue } from 'crawlee';
import { google } from 'googleapis';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TARGET_STATES = ['FL','IA','MT','OR','VA','OH','MI','MD','HI','SC','TX'];
const STATE_NAMES = {
  FL:'Florida', IA:'Iowa', MT:'Montana', OR:'Oregon', VA:'Virginia',
  OH:'Ohio', MI:'Michigan', MD:'Maryland', HI:'Hawaii', SC:'South Carolina', TX:'Texas'
};

const TOBACCO_KEYWORDS = ['i smoke','smoker','tobacco','cigarettes','vape','i use tobacco','nicotine'];
const FINAL_EXPENSE_KEYWORDS = [
  'final expense','burial insurance','funeral coverage','burial coverage',
  'life insurance senior','life insurance elderly','end of life insurance',
  'funeral insurance','cremation insurance','death benefit','whole life insurance',
  'affordable life insurance','cheap life insurance over 50','life insurance 60',
  'life insurance 70','life insurance 80','final expense insurance'
];
const BENEFICIARY_KEYWORDS = ['beneficiary','my spouse','my wife','my husband','my children','my kids','my family'];

// ─── GOOGLE SHEETS SETUP ──────────────────────────────────────────────────────
async function getGoogleSheetsClient(credentials) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function appendToSheet(sheets, spreadsheetId, rows) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

// ─── LEAD EXTRACTOR ───────────────────────────────────────────────────────────
function extractLeadInfo(text, url, source) {
  const lower = text.toLowerCase();

  // Check relevance
  const isFinalExpense = FINAL_EXPENSE_KEYWORDS.some(k => lower.includes(k));
  if (!isFinalExpense) return null;

  // Detect state
  let detectedState = '';
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name.toLowerCase()) || lower.includes(` ${abbr.toLowerCase()} `)) {
      detectedState = abbr;
      break;
    }
  }

  // Extract phone
  const phoneMatch = text.match(/(\+?1?\s?)?(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Extract name (basic heuristic - "My name is X" or "I'm X")
  const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const name = nameMatch ? nameMatch[1] : '';

  // Extract ZIP
  const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[0] : '';

  // Tobacco flag
  const usesTobacco = TOBACCO_KEYWORDS.some(k => lower.includes(k)) ? 'Yes' : 'Unknown';

  // Beneficiary mention
  const beneficiaryMention = BENEFICIARY_KEYWORDS.filter(k => lower.includes(k)).join(', ') || 'Not mentioned';

  return {
    name,
    phone,
    email,
    state: detectedState,
    zip,
    usesTobacco,
    beneficiaryMention,
    source,
    url,
    snippet: text.substring(0, 300),
    scrapedAt: new Date().toISOString(),
  };
}

// ─── REDDIT SCRAPER ───────────────────────────────────────────────────────────
async function scrapeReddit(requestQueue) {
  const subreddits = ['personalfinance','seniors','LifeInsurance','povertyfinance','retirement','AgingParents'];
  const queries = FINAL_EXPENSE_KEYWORDS.slice(0, 6);

  for (const sub of subreddits) {
    for (const query of queries) {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=100`;
      await requestQueue.addRequest({ url, userData: { source: 'Reddit', type: 'reddit' } });
    }
  }
}

// ─── FACEBOOK GROUP SCRAPER ───────────────────────────────────────────────────
async function scrapeFacebook(requestQueue) {
  // Public Facebook groups related to seniors and final expense
  const groupSearches = [
    'final expense insurance leads',
    'senior life insurance group',
    'burial insurance help',
    'affordable funeral coverage',
  ];

  for (const query of groupSearches) {
    const url = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`;
    await requestQueue.addRequest({ url, userData: { source: 'Facebook', type: 'facebook' } });
  }
}

// ─── GOOGLE SEARCH SCRAPER ────────────────────────────────────────────────────
async function scrapeGoogle(requestQueue) {
  for (const state of TARGET_STATES) {
    const stateName = STATE_NAMES[state];
    const queries = [
      `final expense insurance ${stateName} site:reddit.com OR site:quora.com`,
      `burial insurance quotes ${stateName}`,
      `"final expense" "looking for" insurance ${stateName}`,
      `senior life insurance ${stateName} affordable`,
    ];
    for (const q of queries) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20`;
      await requestQueue.addRequest({ url, userData: { source: 'Google', type: 'google' } });
    }
  }
}

// ─── INSTAGRAM SCRAPER ────────────────────────────────────────────────────────
async function scrapeInstagram(requestQueue) {
  const hashtags = ['finalexpense','burialinsurance','seniorlifeinsurance','finalexpenseinsurance','lifeinsuranceforseniors'];
  for (const tag of hashtags) {
    const url = `https://www.instagram.com/explore/tags/${tag}/`;
    await requestQueue.addRequest({ url, userData: { source: 'Instagram', type: 'instagram' } });
  }
}

// ─── ETHOS SCRAPER ────────────────────────────────────────────────────────────
async function scrapeEthos(requestQueue) {
  // Ethos public blog/resources pages that mention final expense
  const urls = [
    'https://www.ethoslife.com/life-insurance/final-expense-insurance/',
    'https://www.ethoslife.com/life-insurance/burial-insurance/',
    'https://www.ethoslife.com/life-insurance/whole-life-insurance/',
  ];
  for (const url of urls) {
    await requestQueue.addRequest({ url, userData: { source: 'Ethos', type: 'ethos' } });
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
Actor.main(async () => {
  const input = await Actor.getInput();
  const {
    googleCredentials,
    spreadsheetId,
    maxLeads = 5000,
  } = input;

  console.log('🚀 Starting Final Expense Lead Scraper');
  console.log(`🎯 Target States: ${TARGET_STATES.join(', ')}`);

  // Setup Google Sheets
  let sheets, sheetHeaders;
  if (googleCredentials && spreadsheetId) {
    sheets = await getGoogleSheetsClient(googleCredentials);
    sheetHeaders = [['Full Name','Phone','Email','State','ZIP','Tobacco User','Beneficiary Mention','Source','URL','Snippet','Scraped At']];
    await appendToSheet(sheets, spreadsheetId, sheetHeaders);
    console.log('✅ Google Sheets connected');
  }

  const requestQueue = await RequestQueue.open();
  const leads = [];

  // Queue all sources
  await scrapeReddit(requestQueue);
  await scrapeFacebook(requestQueue);
  await scrapeGoogle(requestQueue);
  await scrapeInstagram(requestQueue);
  await scrapeEthos(requestQueue);

  const crawler = new PuppeteerCrawler({
    requestQueue,
    maxRequestsPerCrawl: 500,
    maxConcurrency: 5,
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },

    async requestHandler({ request, page }) {
      const { source, type } = request.userData;
      console.log(`📄 Scraping [${source}]: ${request.url}`);

      let extractedLeads = [];

      try {
        if (type === 'reddit') {
          // Reddit JSON API
          const json = await page.evaluate(() => JSON.parse(document.body.innerText));
          const posts = json?.data?.children || [];
          for (const post of posts) {
            const d = post.data;
            const text = `${d.title} ${d.selftext}`;
            const lead = extractLeadInfo(text, `https://reddit.com${d.permalink}`, source);
            if (lead) extractedLeads.push(lead);
          }

        } else if (type === 'google') {
          await page.waitForSelector('#search', { timeout: 10000 });
          const results = await page.$$eval('#search .g', els =>
            els.map(el => ({
              title: el.querySelector('h3')?.innerText || '',
              snippet: el.querySelector('.VwiC3b')?.innerText || '',
              link: el.querySelector('a')?.href || '',
            }))
          );
          for (const r of results) {
            const text = `${r.title} ${r.snippet}`;
            const lead = extractLeadInfo(text, r.link, source);
            if (lead) extractedLeads.push(lead);
          }

        } else if (type === 'instagram') {
          await page.waitForSelector('article', { timeout: 15000 });
          const posts = await page.$$eval('article', els =>
            els.map(el => el.innerText).slice(0, 20)
          );
          for (const text of posts) {
            const lead = extractLeadInfo(text, request.url, source);
            if (lead) extractedLeads.push(lead);
          }

        } else if (type === 'facebook') {
          await page.waitForTimeout(5000);
          const posts = await page.$$eval('[data-testid="post_message"]', els =>
            els.map(el => el.innerText).slice(0, 30)
          );
          for (const text of posts) {
            const lead = extractLeadInfo(text, request.url, source);
            if (lead) extractedLeads.push(lead);
          }

        } else if (type === 'ethos') {
          await page.waitForSelector('body', { timeout: 10000 });
          const text = await page.$eval('body', el => el.innerText);
          const lead = extractLeadInfo(text, request.url, source);
          if (lead) extractedLeads.push(lead);
        }

        // Store leads
        for (const lead of extractedLeads) {
          if (leads.length >= maxLeads) break;
          leads.push(lead);
          await Actor.pushData(lead);

          // Push to Google Sheets in batches of 10
          if (sheets && leads.length % 10 === 0) {
            const rows = extractedLeads.slice(-10).map(l => [
              l.name, l.phone, l.email, l.state, l.zip,
              l.usesTobacco, l.beneficiaryMention, l.source,
              l.url, l.snippet, l.scrapedAt
            ]);
            await appendToSheet(sheets, spreadsheetId, rows);
            console.log(`📊 Pushed ${leads.length} leads to Google Sheets`);
          }
        }

        if (extractedLeads.length > 0) {
          console.log(`✅ Found ${extractedLeads.length} leads from ${source}`);
        }

      } catch (err) {
        console.error(`❌ Error scraping ${request.url}: ${err.message}`);
      }
    },

    failedRequestHandler({ request }) {
      console.error(`❌ Failed: ${request.url}`);
    },
  });

  await crawler.run();

  // Final push to Sheets
  if (sheets && leads.length > 0) {
    const remaining = leads.slice(-(leads.length % 10));
    if (remaining.length > 0) {
      const rows = remaining.map(l => [
        l.name, l.phone, l.email, l.state, l.zip,
        l.usesTobacco, l.beneficiaryMention, l.source,
        l.url, l.snippet, l.scrapedAt
      ]);
      await appendToSheet(sheets, spreadsheetId, rows);
    }
  }

  console.log(`\n🎉 DONE! Total leads collected: ${leads.length}`);
  console.log(`📊 Breakdown by source:`);
  const bySource = leads.reduce((acc, l) => { acc[l.source] = (acc[l.source]||0)+1; return acc; }, {});
  Object.entries(bySource).forEach(([s, c]) => console.log(`   ${s}: ${c}`));
});
