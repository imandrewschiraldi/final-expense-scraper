# 🚀 Final Expense Lead Scraper — Setup Guide

## What This Does
Scrapes final expense & burial insurance leads from:
- ✅ Reddit (r/personalfinance, r/seniors, r/LifeInsurance, r/retirement, r/AgingParents)
- ✅ Facebook Public Groups
- ✅ Google Search
- ✅ Instagram hashtags
- ✅ Ethos Life Insurance

**Target States:** FL, IA, MT, OR, VA, OH, MI, MD, HI, SC, TX

**Collects:** Full Name, Phone, Email, City/ZIP, Tobacco Use, Beneficiary Mentions, Source, URL

**Exports to:** Google Sheets (auto-updates in real time)

---

## Step 1: Deploy to Apify

1. Go to [https://console.apify.com](https://console.apify.com)
2. Click **"Create new Actor"**
3. Choose **"Upload source files"**
4. Upload this entire folder (all files)
5. Click **Build & Run**

---

## Step 2: Set Up Google Sheets Export

### A) Create your Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new sheet, name the first tab **"Leads"**
3. Copy the Spreadsheet ID from the URL:
   `docs.google.com/spreadsheets/d/**YOUR_ID_HERE**/edit`

### B) Create a Google Service Account
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a new service account
6. Download the **JSON key file**
7. **Share your Google Sheet** with the service account email (found in the JSON as `client_email`)
   - Give it **Editor** access

---

## Step 3: Run the Actor

In the Apify console, set the input:

```json
{
  "spreadsheetId": "your-google-sheet-id-here",
  "googleCredentials": {
    "type": "service_account",
    "project_id": "your-project",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  },
  "maxLeads": 5000
}
```

---

## Step 4: Schedule It (Optional)

In Apify console → **Schedules** → Run every day or every week to keep leads fresh.

---

## Google Sheet Columns Output

| Full Name | Phone | Email | State | ZIP | Tobacco User | Beneficiary Mention | Source | URL | Snippet | Scraped At |

---

## Tips for Best Results

- **Reddit** gives the most intent-based leads (people actively asking about insurance)
- **Google Search** finds leads across blogs, forums, Q&A sites
- **Facebook** requires being logged in — Apify handles this via browser sessions
- **Instagram** works best with hashtag scraping
- Run the actor **weekly** for fresh leads
- Filter your Sheet by **State** column to work your territory

---

## ⚠️ Important Notes

- Only scrapes **publicly available** information
- Always comply with **CAN-SPAM**, **TCPA**, and **Florida insurance solicitation laws**
- Get proper consent before cold calling/emailing leads
- Apify provides residential proxies to avoid blocks (enable in actor settings)

---

## Need Help?
Contact your developer or refer to [Apify docs](https://docs.apify.com)
