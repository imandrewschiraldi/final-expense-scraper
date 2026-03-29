import { Actor } from 'apify';
import { google } from 'googleapis';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TARGET_STATES = ['FL','IA','MT','OR','VA','OH','MI','MD','HI','SC','TX'];
const STATE_NAMES = {
  FL:'Florida', IA:'Iowa', MT:'Montana', OR:'Oregon', VA:'Virginia',
  OH:'Ohio', MI:'Michigan', MD:'Maryland', HI:'Hawaii', SC:'South Carolina', TX:'Texas'
};

const TOBACCO_KEYWORDS = ['smoke','smoker','tobacco','cigarettes','vape','nicotine','cigar'];
const BENEFICIARY_KEYWORDS = ['beneficiary','spouse','wife','husband','children','kids','family','son','daughter'];
const FINAL_EXPENSE_KEYWORDS = [
  'final expense','burial insurance','funeral coverage','burial coverage',
  'life insurance','end of life','funeral insurance','cremation insurance',
  'death benefit','whole life','affordable insurance','senior insurance',
  'over 50 insurance','over 60 insurance','over 70 insurance','over 80 insurance'
];

// ─── GOOGLE SHEETS ────────────────────────────────────────────────────────────
async function getSheets(credentials) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function pushToSheet(sheets, spreadsheetId, rows) {
  if (!rows.length) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

// ─── LEAD EXTRACTOR ───────────────────────────────────────────────────────────
function extractLead(text, url, source) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const isFinalExpense = FINAL_EXPENSE_KEYWORDS.some(k => lower.includes(k));
  if (!isFinalExpense) return null;

  // Detect state
  let detectedState = '';
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name.toLowerCase()) || new RegExp(`\\b${abbr}\\b`).test(text)) {
      detectedState = abbr;
      break;
    }
  }

  const phoneMatch = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);

  const usesTobacco = TOBACCO_KEYWORDS.some(k => lower.includes(k)) ? 'Yes' : 'Unknown';
  const beneficiaryMention = BENEFICIARY_KEYWORDS.filter(k => lower.includes(k)).join(', ') || 'Not mentioned';

  return {
    name: nameMatch?.[1] || '',
    phone: phoneMatch?.[0]?.trim() || '',
    email: emailMatch?.[0] || '',
    state: detectedState,
    zip: zipMatch?.[0] || '',
    usesTobacco,
    beneficiaryMention,
    source,
    url,
    snippet: text.substring(0, 250).replace(/\n/g, ' '),
    scrapedAt: new Date().toISOString(),
  };
}

// ─── RUN SUB-ACTOR ────────────────────────────────────────────────────────────
async function runActor(actorId, input) {
  const run = await Actor.call(actorId, input, { waitSecs: 120 });
  const { items } = await Actor.openDataset(run.defaultDatasetId).then(d => d.getData());
  return items || [];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
Actor.main(async () => {
  const input = await Actor.getInput();
  const { googleCredentials, spreadsheetId, maxLeads = 500 } = input;

  console.log('🚀 Final Expense Lead Scraper Starting...');

  const sheets = await getSheets(googleCredentials);

  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Full Name','Phone','Email','State','ZIP','Tobacco User','Beneficiary Mention','Source','URL','Snippet','Scraped At']]
    }
  });

  const allLeads = [];

  // ── 1. REDDIT via apify/reddit-scraper ──────────────────────────────────────
  console.log('📖 Scraping Reddit...');
  try {
    const redditSearches = [
      'final expense insurance',
      'burial insurance affordable',
      'life insurance seniors over 60',
      'final expense life insurance quotes',
      'burial coverage help',
    ];

    for (const query of redditSearches) {
      const items = await runActor('apify/reddit-scraper', {
        searches: [{ query, type: 'posts', sort: 'new', time: 'year' }],
        maxItems: 50,
      });

      for (const item of items) {
        const text = `${item.title || ''} ${item.body || ''} ${item.text || ''}`;
        const lead = extractLead(text, item.url || item.permalink, 'Reddit');
        if (lead) {
          allLeads.push(lead);
          await Actor.pushData(lead);
          console.log(`✅ Reddit lead: ${lead.state || 'Unknown state'} - ${lead.snippet.substring(0,60)}...`);
        }
      }
    }
  } catch (e) {
    console.error('Reddit scraper error:', e.message);
  }

  // ── 2. GOOGLE SEARCH via apify/google-search-scraper ────────────────────────
  console.log('🔍 Scraping Google...');
  try {
    const googleQueries = [];
    for (const [abbr, name] of Object.entries(STATE_NAMES)) {
      googleQueries.push(`final expense insurance ${name} quotes`);
      googleQueries.push(`burial insurance ${name} affordable seniors`);
    }

    const items = await runActor('apify/google-search-scraper', {
      queries: googleQueries.join('\n'),
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
      mobileResults: false,
    });

    for (const item of items) {
      const text = `${item.title || ''} ${item.description || ''}`;
      const lead = extractLead(text, item.url, 'Google');
      if (lead) {
        allLeads.push(lead);
        await Actor.pushData(lead);
        console.log(`✅ Google lead: ${lead.state || 'Unknown'} - ${lead.snippet.substring(0,60)}...`);
      }
    }
  } catch (e) {
    console.error('Google scraper error:', e.message);
  }

  // ── 3. PUSH ALL TO GOOGLE SHEETS ────────────────────────────────────────────
  console.log(`📊 Pushing ${allLeads.length} leads to Google Sheets...`);
  const rows = allLeads.slice(0, maxLeads).map(l => [
    l.name, l.phone, l.email, l.state, l.zip,
    l.usesTobacco, l.beneficiaryMention, l.source,
    l.url, l.snippet, l.scrapedAt
  ]);

  // Push in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await pushToSheet(sheets, spreadsheetId, rows.slice(i, i + 50));
    console.log(`📊 Pushed rows ${i} to ${Math.min(i+50, rows.length)}`);
  }

  console.log(`\n🎉 DONE! Total leads: ${allLeads.length}`);
  const bySource = allLeads.reduce((acc, l) => { acc[l.source] = (acc[l.source]||0)+1; return acc; }, {});
  Object.entries(bySource).forEach(([s,c]) => console.log(`   ${s}: ${c} leads`));
});
