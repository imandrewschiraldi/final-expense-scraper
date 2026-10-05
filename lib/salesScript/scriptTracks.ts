// Script-track content ported verbatim from the standalone Sales Script
// tool's screen-mp/screen-finexp/screen-iul/screen-fia markup. Each
// section's static prose (sblock/cond/agent/agent-note/gold-txt/etc.) is
// kept as its original HTML (rendered via dangerouslySetInnerHTML by
// ScriptRunner) since it's just formatted text with no interactivity of
// its own; qlist/subdrop blocks are pulled out into structured data so
// ScriptRunner can render their checkbox/collapse behavior as real React
// state. Script copy is byte-for-byte identical to the source — do not
// edit the text.

export type ScriptBlock =
  | { type: "html"; html: string }
  | { type: "qlist"; items: string[] }
  | { type: "subdrop"; id: string; title: string; html: string };

export type ScriptSectionData = {
  id: string;
  defaultOpen: boolean;
  stepNum: string;
  title: string;
  objKey: string | null;
  blocks: ScriptBlock[];
};

export type ScriptTrackData = {
  dialHtml: string;
  sections: ScriptSectionData[];
};

export type TrackId = "finexp" | "mp" | "iul" | "fia";

export const SCRIPT_TRACKS: Record<TrackId, ScriptTrackData> = {
  finexp: {
    dialHtml: "<h2>Veterans Final Expense Script</h2>\n<div class=\"card-mindset\"><strong>Mindset:</strong> Speak from the heart. These are veterans and their families -- lead with empathy, earn their trust, and serve them the right coverage.</div>\n<div class=\"card-legend\">\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--copper);\"></span><span class=\"leg-pause\"><strong>....</strong> = Slight pause</span></span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--gold);\"></span><span style=\"color:var(--gold);font-weight:700;\">Gold</span> = Power question</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:#20b2aa;\"></span><span style=\"color:#7fdbda;font-weight:700;\">Teal</span> = Agent note only</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--green);\"></span><span style=\"color:var(--green);font-weight:700;\">Green</span> = Call conditions / If-Then</span>\n</div>",
    sections: [
      {
        id: "fe1",
        defaultOpen: true,
        stepNum: "1",
        title: "Introduction",
        objKey: "fe_intro",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Open</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Hey (client first name)<span class=\"pause\">....</span> this is (Agent) with the Benefits Office.<br/><br/>I was just giving you a call in regards to the Life options for Veterans. I have your Date of Birth listed here as ___. Correct?<br/><br/>How are you doing today? That's great to hear<span class=\"pause\">....</span><br/><br/>Now, your main concern was just wanting to make sure that the funeral expense doesn't fall a burden on your loved ones, right?<br/><br/>Got it<span class=\"pause\">....</span> were you also looking to leave some extra money behind as well for your family or just have the funeral expense taken care of?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Agent:</strong> If they have both goals, go to Americo for a replacement.</div>" }
        ],
      },
      {
        id: "fe2",
        defaultOpen: false,
        stepNum: "2",
        title: "Dig Into Why",
        objKey: "fe_why",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Now god forbid<span class=\"pause\">....</span> if you were to pass away yesterday, and I always say yesterday because I never want to speak anything into existence, who would be the beneficiary responsible for paying for the funeral expenses<span class=\"pause\">....</span> and picking up all the pieces tomorrow?<br/><br/>What is their name<span class=\"pause\">....</span> spell that out for me.<br/><br/>Have you thought about whether you were to be buried or cremated?<br/><br/>Okay and do you have any life insurance or a large savings (beneficiary name) can use to cover the funeral costs?\"</div>" },
          { type: "html", html: "<hr class=\"div\"/>" },
          { type: "html", html: "<div class=\"slabel\" style=\"font-size:18px;color:var(--green);font-weight:800;letter-spacing:0.04em;text-transform:none;\">If NO Coverage</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Got it<span class=\"pause\">....</span> so you just want to make sure (beneficiary name) doesn't have to go into any debt or any financial burden, correct??? Yeah, I don't think most families can afford it nowadays<span class=\"pause\">....</span> that's why most veterans are looking to get this covered.<br/><br/><span class=\"q\">Do you know how much that costs nowadays???</span><br/><br/>It looks in the state of (state name)<span class=\"pause\">....</span> an average --<br/><br/>Cremation costs: $5,000 to $7,000 depending on the celebration and urn.<br/><br/>Burial costs: $10,000 to $15,000 depending on the fanciness of the service and the opening and closing.<br/><br/>Granted you are buried in a national cemetery where the VA covers the plot and headstone<span class=\"pause\">....</span> was that what you were planning on?<br/><br/><em style=\"color:var(--copper-lite);\">[If NOT a national cemetery -- $15,000 to $20,000]</em><br/><br/>After this -- <span style=\"color:#ffffff;font-weight:700;\">SKIP to Client Suitability Sheet below.</span>\"</div>" },
          { type: "html", html: "<hr class=\"div\"/>" },
          { type: "html", html: "<div class=\"slabel\" style=\"font-size:18px;color:var(--green);font-weight:800;letter-spacing:0.04em;text-transform:none;\">If They HAVE Coverage</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Perfect<span class=\"pause\">....</span> I'm glad you have something that can help out. Now how much do you have in place already to help (beneficiary name)???\"</div>" },
          { type: "html", html: "<div class=\"cond\"><strong>If NOT enough for funeral costs:</strong> \"Got it<span class=\"pause\">....</span> do you know how much a funeral can cost nowadays?!<br/><br/>It looks in the state of (state name)<span class=\"pause\">....</span> an average --<br/><br/>Cremation costs: $5,000 to $7,000 depending on the celebration and urn.<br/><br/>Burial costs: $10,000 to $15,000 depending on the fanciness of the service and the opening and closing.<br/><br/>Granted you are buried in a national cemetery where the VA covers the plot and headstone<span class=\"pause\">....</span> was that what you were planning on?\"<br/><br/><span style=\"font-size:14px;color:var(--muted);font-style:italic;\">[If NOT a national cemetery -- $15,000 to $20,000]</span><br/><br/>\"So you were looking to get additional coverage to fill the gap so (beneficiary name) isn't left with any debt<span class=\"pause\">....</span> correct?\" <span style=\"color:#ffffff;font-weight:700;\">SKIP to Client Suitability Sheet below.</span></div>" },
          { type: "html", html: "<div class=\"cond\"><strong>If DO have enough:</strong> \"Perfect<span class=\"pause\">....</span> you were just looking to get this in place to cover the funeral so (beneficiary name) can use that money to help them get by instead of using it to cover the funeral, correct?<br/><br/>Push Back: God forbid if you were to pass away yesterday, and I always say yesterday because I never want to speak anything into existence<span class=\"pause\">....</span> what would it look like for (beneficiary name) without your income?\"</div>" }
        ],
      },
      {
        id: "fe3",
        defaultOpen: false,
        stepNum: "3",
        title: "Client Suitability Sheet",
        objKey: "fe_suit",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"So my job's simple<span class=\"pause\">....</span> what we'll do is spend a minute on your financial situation just to make sure we can find an affordable option for ya.<br/><br/>Then about 2 minutes on your medical history to make sure we can get you approved through one of the 26 A-rated carriers.\"</div>" },
          { type: "html", html: "<div class=\"qlabel\">Financial Questions -- Flow Through These Conversationally</div>" },
          { type: "qlist", items: ["Now are you currently working, retired, or disabled?", "Alright<span class=\"pause\">....</span> what's your total monthly income? Just a ballpark is fine.", "ALWAYS ASK: Now at the end of the month once you pay all your bills, utilities, and all the fun things you like to do<span class=\"pause\">....</span> how much would you say you are typically left with?"] },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"Now<span class=\"pause\">....</span> (Name) if you were to pass away, what would the situation look like for (beneficiary)?<br/>I'm assuming it would be pretty tough right? <em style=\"color:var(--off);font-weight:400;\">[Dig into their personal situation]</em>\"</span></div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"So if I were able to find something comfortable and affordable that would avoid that situation and make sure the final expense doesn't fall a burden on the family<span class=\"pause\">....</span><br/>that would be important to you, correct?\"</span></div>" },
          { type: "html", html: "<div class=\"qlabel\">Discounts and Banking</div>" },
          { type: "qlist", items: ["There are two discounts you may qualify for. First -- are you a smoker or non-smoker? Just be honest with me (chuckle)", "Do you bank locally or do you use a digital bank like Chime or Cash App, or one of the bigger banks like Wells Fargo, Chase, or a Credit Union?"] },
          { type: "html", html: "<div class=\"qlabel\">Health Questions -- Note Year for Any Yes Answers</div>" },
          { type: "html", html: "<div class=\"agent-note\" style=\"font-size:20px;padding:22px 26px;border-left:5px solid #20b2aa;margin:14px 0;\">\n<strong style=\"font-size:22px;letter-spacing:0.04em;\">▶ FILL IN PRINTED CLIENT SUITABILITY SHEET NOW</strong>\n</div>" },
          { type: "qlist", items: ["Now a little bit on your health<span class=\"pause\">....</span> for all of your medical needs do you go to the VA or a civilian doctor? Are all of your prescriptions through the VA or civilian?", "Any heart attacks, heart failure, strokes, TIA, or stents in the last 5 years? If yes: any blood thinners (Plavix, warfarin) or heart meds (Nitrostat, nitroglycerin, Eliquis)?", "Any cancer in the last 5 years? What kind? How long in remission -- that means cancer free?", "Any diabetes? If yes: on metformin or insulin?", "Any neuropathy? If yes: taking gabapentin?", "Any breathing complications or COPD? If yes: taking oxygen or inhaler?", "Any kidney or liver problems? If yes to kidney: any kidney failure, disorder, or dialysis?", "Any anxiety or depression? If yes: taking Xanax?", "Are we on any prescription medications for anything aside from what we went over?", "Then one last thing<span class=\"pause\">....</span> a rough height and weight for you?"] },
          { type: "html", html: "<div class=\"sblock\">\"Alrighty<span class=\"pause\">....</span> so just gonna put you on a brief 2 to 5 minute hold and get these options pulled up for you. Any questions for me before I do so? Perfect.\"</div>" }
        ],
      },
      {
        id: "fe4",
        defaultOpen: false,
        stepNum: "4",
        title: "Before Presenting Numbers + Benefits",
        objKey: "fe_benefits",
        blocks: [
          { type: "html", html: "<div class=\"agent-note\"><strong>Agent -- Prep While on Hold:</strong> You should be on the FEX Quote Tool putting in the age, gender, and coverage amount and preparing your Bronze, Silver, Gold options. Search their address on <strong>truepeoplesearch.com</strong> by phone number to build credibility before presenting.</div>" },
          { type: "html", html: "<div class=\"slabel\">Before Presenting Numbers</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now before we go over the packages I'm going to explain how the process works okay<span class=\"pause\">....</span> so it's not like going to your local grocery store<span class=\"pause\">....</span> where you just see it, like it, buy it.<br/><br/>With this kind of thing we have to get approved for it. The carriers will look at what's called the Medical Information Bureau -- the MIB report. It's a collection of your medical records, hospitalizations, prescriptions over the last few years.<br/><br/>It's not up to me or the VA to approve you<span class=\"pause\">....</span> it's up to the carriers. Which is why we spent a little bit of time on your health. Does that make sense?\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Send Credentials</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now do you receive text messages on this phone? Got it<span class=\"pause\">....</span> there's a new protocol here in the state. By law<span class=\"pause\">....</span> I have to send over a copy of my Department of Insurance License so that you have it for your records. Can I trust you with that information?<br/><br/><em style=\"color:var(--copper-lite);\">[SEND ID CARD]</em><br/><br/>Are you able to pull up my ID card? I apologize in advance for the ugly picture<span class=\"pause\">....</span><br/><br/>On the left you should see my NPN number which is just a government ID number<span class=\"pause\">....</span> under that my name and contact info<span class=\"pause\">....</span> so you can always reach me.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Write Down Benefits</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now go ahead and grab a pen and paper<span class=\"pause\">....</span><br/><br/>I'm gonna give you some information about the benefits that come with this type of plan.<br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">1. Write down Immediate Coverage:</span> That means as soon as you make your first premium your loved ones will be covered day 1<span class=\"pause\">....</span> there's no 2-year waiting period like most carriers!<br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">2. Write down Locked In:</span> Premium never increases and coverage never decreases!<br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">3. Write down Tax-Free:</span> This one's my favorite because your loved ones don't have to pay any taxes on the money they receive. It's really the only thing that's tax free nowadays<span class=\"pause\">....</span> am I right? <em style=\"color:var(--muted);\">(chuckle)</em><br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">4. Write down Living Benefit:</span> This one is important -- if you get a terminal illness and the doctor tells you that you have 12 to 24 months to live<span class=\"pause\">....</span> you'll have access to 50% of the benefit tax-free while you're still living!<br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">5. Write down Double Accidental Payout:</span> If your cause of death is choking, drowning, slipping, falling, or dying in a car accident<span class=\"pause\">....</span> your coverage would double. It's something included in your policy as well.<br/><br/><span style=\"color:var(--copper-lite);font-weight:700;\">6. Lastly, write down Permanent Coverage:</span> This coverage will never expire on you<span class=\"pause\">....</span> it is a whole life policy.\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"I just want to preface that once we get approved here, I am assigned to you for life. So what does that mean?<br/><br/>Simply just means that our job is to make sure that your family is always in the best financial situation possible. So after we get approved, we have what is called annual reviews. Which means that in a year from now we will check in with you and the family.<br/><br/>At that point we will ask<span class=\"pause\">....</span> 'Hey (client's name), how is everything going with the family.' If you are at that moment saying 'Yeah (your name), everything is going great financially and we want to upgrade the coverage' -- then yes, we can do that.<br/><br/>But if you are saying 'Hey (your name), we aren't doing the best financially and we want to lower the coverage' -- then no worries, we can do that as well.<br/><br/>Again, our job is to make sure that no matter what you are in the best financial position possible. So just understand that before going through these options here. Does that make sense? Ok, perfect.\"</div>" }
        ],
      },
      {
        id: "fe5",
        defaultOpen: false,
        stepNum: "5",
        title: "Quote Bronze / Silver / Gold",
        objKey: "fe_numbers",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Based on what you've told me<span class=\"pause\">....</span> the system has built 3 packages of coverage and you can decide on which option makes the most sense. Now write down <strong>BRONZE</strong>, <strong>SILVER</strong>, and <strong>GOLD</strong><span class=\"pause\">....</span><br/><br/>The <strong>BRONZE</strong> option will cover a full funeral expense and make sure (beneficiary's name) won't have to come out of pocket for your funeral<span class=\"pause\">....</span> that will be (Coverage Amount) and that's just _____ bucks a month.<br/><br/>The <strong>SILVER</strong> option will leave a little bit extra behind to cover any leftover bills<span class=\"pause\">....</span> help with inflation<span class=\"pause\">....</span> or even leave a few extra thousand behind for (beneficiary's name)<span class=\"pause\">....</span> and that will be (Coverage Amount) and that's just _____ bucks a month.<br/><br/>The <strong>GOLD</strong> option is going to make sure (beneficiary's name) is in really good hands<span class=\"pause\">....</span> and doesn't really have anything to worry about<span class=\"pause\">....</span> and that will be (Coverage Amount) for _____ bucks a month.\"</div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">Golden Question: \"Ok perfect<span class=\"pause\">....</span> now that we have those written down<span class=\"pause\">....</span> which one of those options would make the most sense financially for the family<span class=\"pause\">....</span> God willing we can get you approved?\"</span></div>" }
        ],
      },
      {
        id: "fe6",
        defaultOpen: false,
        stepNum: "6",
        title: "Start Application + Health Fillers + Beneficiary",
        objKey: "fe_social",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Alright<span class=\"pause\">....</span> now we'll go ahead and send in a request for coverage -- it is something you do actually have to qualify for.<br/><br/>So once we go to submit a request for coverage there's 3 pieces of information required on the application just like any other insurance application.<br/><br/>1. First is your driver's license just to confirm your identity<span class=\"pause\">....</span> do you have that on hand? Awesome.<br/><br/>2. Secondly, your social. That's how they're going to check your prescriptions and medical history<span class=\"pause\">....</span> that being the main factor on if you're approved or declined.<br/><br/>3. Thirdly either a bank statement or a voided check to confirm there is no prior insurance fraud, money laundering, or anything else illegally linked to your account<span class=\"pause\">....</span> and well of course that's how you're going to be paying for the policy.<br/><br/>Does that all make sense? Great.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\" style=\"font-size:20px;padding:22px 26px;border-left:5px solid #20b2aa;margin:14px 0;\">\n<strong style=\"font-size:22px;letter-spacing:0.04em;\">▶ HEAD OVER TO CARRIER E-APP NOW</strong><br/>\n  Open the carrier application portal and begin entering the client's information. Do not wait until after the call. Start the eApp immediately while you still have them on the line.\n</div>" },
          { type: "html", html: "<div class=\"qlabel\">First Page of Application</div>" },
          { type: "qlist", items: ["Confirm spelling first and last name", "Confirm date of birth and height/weight", "Phone number on file -- \"Alright, we'll text you over a policy summary afterwards just so you have something in the meanwhile.\"", "What's a good email for you?", "Mailing address -- house or apartment? \"This is where we will be mailing out a policy packet with all of your policy details -- something you will want to keep in a safe place.\"", "State born in? City? -- \"Obviously you are a US Citizen!\" -- Then Social: \"Go ahead with your Social.\" <em style=\"color:var(--muted);\">[Make them repeat it twice]</em>"] },
          { type: "html", html: "<div class=\"qlabel\">Health Filler Questions -- Keep It Light, About 5 Minutes</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Okay now<span class=\"pause\">....</span> I'm just going to confirm a few more medical questions for the sake of the application. I know I've already bored you enough. <em style=\"color:var(--muted);\">(chuckle)</em>\"</div>" },
          { type: "qlist", items: ["Do you use anything to help you walk around the house? Such as a cane, wheelchair, or scooter?", "Any oxygen equipment to help you breathe?", "Any help with daily activities -- like eating, bathing, toileting, or dressing?", "Any COVID-19 in the last 90 days?", "Any alcohol or drug abuse in your past?", "Any Alzheimer's or Dementia?", "Any AIDS or HIV? Any hepatitis? Any brain tumor or brain aneurysm?", "Lastly<span class=\"pause\">....</span> do you plan on doing any dangerous activities in the next two years like bungee jumping, skydiving, or rock climbing?"] },
          { type: "html", html: "<div class=\"agent-note\"><strong>Beneficiary Section -- Agent Only:</strong> Confirm beneficiary from earlier. Confirm spelling of name, relationship, and date of birth. Confirm the % of death benefit they will receive. If spouse, ask if they want to put a back-up or contingent beneficiary.<br/><br/>\n<strong>SPOUSE:</strong> \"How long have you been married for??? Any tips for me??? Any grandkids???\"<br/>\n<strong>CHILD:</strong> \"Awesome, do you see them often??? What do you all like to do when you spend time together??? Any grandkids for you???\"</div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">Golden Question: \"Got it<span class=\"pause\">....</span> if you don't mind me asking (sir/ma'am)<span class=\"pause\">....</span> what really got you thinking into getting something like this in place for (beneficiary's name)?\" <em style=\"color:var(--off);font-weight:400;\">[LET THEM TALK]</em></span></div>" }
        ],
      },
      {
        id: "fe7",
        defaultOpen: false,
        stepNum: "7",
        title: "Banking + Lock Down the Close",
        objKey: "fe_close",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Banking Word Track</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Hey (client name)<span class=\"pause\">....</span> the next part here is the state's anti-money laundering verification portion<span class=\"pause\">....</span> most veterans like for their policy to start when they receive their benefits<span class=\"pause\">....</span> what day is that for you?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Agent:</strong> 1st, 3rd of the month, or 2nd/3rd/4th Wednesday are the ONLY payment dates you should set.</div>" },
          { type: "qlist", items: ["Is your name spelled the same way with (bank name)? Or do you use a middle initial or name?", "\"Alright, it looks like we are partnered with them<span class=\"pause\">....</span> 9 out of 10 times the routing number that automates is correct. Go ahead and grab a checkbook to confirm it. It should start with<span class=\"pause\">....</span> (first 3 numbers).\""] },
          { type: "html", html: "<div class=\"slabel\">Lock Down the Close</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So (client name)<span class=\"pause\">....</span> everything is fully submitted at this point. A couple things to recap -- the coverage we applied for was for $XXX and the name of the insurance carrier is XXX. Perfect<span class=\"pause\">....</span> now look out for that policy in the mail -- typically it takes 10 to 12 business days.<br/><br/>Also, this number we are talking on<span class=\"pause\">....</span> this is my direct line. It's the same number my mom calls me on. Anything you ever need in regards to this coverage<span class=\"pause\">....</span> I'm always the first person you can reach out to. I'm just a phone call or text away.<br/><br/>Lastly<span class=\"pause\">....</span> this is important. We always contact the department of insurance in the state and let them know that we have completed the request and submitted an application. The reason we do that is because it should remove you from any kind of lists of solicitations about this coverage. No one will ever contact you about this coverage other than myself or the carrier asking for any personal information.<br/><br/>But with the internet these days you will still probably get some calls<span class=\"pause\">....</span> but none will be anything in regard to what we did. So if they say they're my manager, it's incomplete, due for review<span class=\"pause\">....</span> it's just a line of crap from some telemarketer trying to pull a fast one on you. Just give us a call so we can report them. We know this coverage is important for you and I don't want to see some random person mess up the coverage for your family.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Referrals and Close</div>" },
          { type: "html", html: "<div class=\"sblock\">\"I'll be sending you a quick text so you can save my number -- my digital card will be in there too if you'd like to save or share it. The great news is your friends and family may qualify for the same benefits!<br/><br/>Can you think of one or two people who might benefit from a quick chat about their coverage options<span class=\"pause\">....</span> just have them mention your name if they reach out.<br/><br/>Before I go, are there any questions I didn't answer? Lastly<span class=\"pause\">....</span> was I of service to you and your loved ones? I truly appreciate the chance to serve you. Have a blessed day!\"</div>" },
          { type: "html", html: "<div class=\"cond\"><strong>After close -- Text Client:</strong> \"Hey (Client Name), save this number in your phone. Here's some basic information about your coverage -- your full policy packet will arrive in the mail within 10-14 business days. Feel free to call me anytime with questions. If you know anyone that could benefit from our services please feel free to share my number or digital card. Referrals are much appreciated! God bless. [Your Name] | Carrier: [ ] | Policy #: [ ] | Coverage: $[ ] | Effective Date: [ ] | Premium: $[ ]\"</div>" }
        ],
      },
    ],
  },
  mp: {
    dialHtml: "<h2>Mortgage Protection Script</h2>\n<div class=\"card-mindset\"><strong>Mindset:</strong> Speak slowly and loudly. 110% volume at 70% speed. Cool, calm, confident, collected. You are the doctor -- they are the patient. Always go for the one-call close.</div>\n<div class=\"card-legend\">\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--copper);\"></span><span class=\"leg-pause\"><strong>....</strong> = Slight pause</span></span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--gold);\"></span><span style=\"color:var(--gold);font-weight:700;\">Gold</span> = Power question</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:#20b2aa;\"></span><span style=\"color:#7fdbda;font-weight:700;\">Teal</span> = Agent note only</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--green);\"></span><span style=\"color:var(--green);font-weight:700;\">Green</span> = Call conditions / If-Then</span>\n</div>",
    sections: [
      {
        id: "mp1",
        defaultOpen: true,
        stepNum: "1",
        title: "Introduction",
        objKey: "mp_intro",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Opening Line</div>" },
          { type: "html", html: "<div class=\"sblock\">\"(Client's name)? <em style=\"color:var(--copper-lite);\">[wait for the client to respond]</em> Hey, it's (Agent). I manage the brokerage that handles all of the mortgage insurance files for (State).<br/><br/>The file associated with your property on (street name) just got flagged as incomplete<span class=\"pause\">....</span> did you receive your policy packet in the mail?\"</div>" },
          { type: "html", html: "<div class=\"slabel\">If No to Receiving Policy Packet</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So you probably remember we had sent you the stuff in the mail a while back, regarding the Liability Coverage for the mortgage. This would be the coverage that pays off your home if you get sick, disabled, or pass away.<br/><br/>Now one of my underwriters should have reached out to you already, they should have helped you out with this, but I am not seeing any notes here on your file<span class=\"pause\">....</span><br/><br/>I'm just the manager here, reaching out to see if you remember what happened with the Liability Coverage?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><strong>If no one helped them:</strong> \"Is it just you in the home or is there a significant other or spouse there with you?<br/>I just had a few minutes before my next call<span class=\"pause\">....</span> grab a pen and paper for me real quick. Should only take about 10 minutes or so to get this knocked out for you.\"<br/><br/><span style=\"font-size:14px;color:var(--muted);font-style:italic;\">*If no -- book an appointment*</span></div>" },
          { type: "html", html: "<div class=\"cond\"><strong>If Yes to Receiving Policy Packet -- Already Have a Policy:</strong> \"Perfect. It looks like the address I have on file for the policy is (address)?<br/>And looks like I have your date of birth here on the policy as (Date of Birth)?<br/><br/>Okay, perfect. I do apologize -- it looks like you were helped out by one of our junior underwriters<span class=\"pause\">....</span> they just didn't leave any notes here on your file.<br/><br/>Which one of our companies were you helped out with?<br/><br/>Mmm got it, and how much coverage did you put in place?<br/><br/>Gotcha. Well it looks like the reason it was flagged and they had me give you a call here is because you may qualify for a lower risk class and get a better rate on your coverage. There have been several rate reductions here in (state).<br/><br/>Grab a pen and paper and we'll get this knocked out in about 10 minutes or so.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>*If yes -- one call close it* | *If no -- book an appointment*</strong></div>" },
          { type: "subdrop", id: "subdrop-mp-appt", title: "Need to Book an Appointment Instead? Click Here", html: "<div class=\"slabel\">Appointment Booking Script</div>\n<div class=\"sblock\">\"No worries, I typically run by appointment only anyways<span class=\"pause\">....</span> let me see when I can squeeze you in here on the calendar so we can go through it properly when you have a bit more time<span class=\"pause\">....</span><br/><br/>Are you generally more available in the morning or afternoon?\"</div>\n<div class=\"sblock\">\"Gotcha<span class=\"pause\">....</span> so looks like I can squeeze you in at __(time)__ or a little bit later at __(time)__. Which one of those works best for you?\"</div>\n<div class=\"sblock\">\"Any reason you wouldn't be available to speak at that time?\"</div>\n<div class=\"sblock\">\"Great, I've got you down for [Appointment Date] at [Time]. Any questions before I let you go?\"</div>\n<div class=\"sblock\">\"Perfect<span class=\"pause\">....</span> looking forward to speaking and serving you and your family then, have a blessed rest of your day.\"</div>" }
        ],
      },
      {
        id: "mp2",
        defaultOpen: false,
        stepNum: "2",
        title: "Set the Frame",
        objKey: "mp_frame",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Ok great<span class=\"pause\">....</span> is this your first time going through the mortgage protection process, or have you been through this process before?<br/><br/>It's pretty simple -- basically I'm going to spend 2 minutes asking you some health and financial questions. Based on that it's my job as the medical underwriter to run it through the carriers that offer mortgage protection in the state of (state).<br/><br/>The reason for that is to figure out some various options you'll qualify for. Then God willing we are able to figure something out that would make sense financially for you and your family<span class=\"pause\">....</span> I'll present those various options to you.<br/><br/>From there you just let me know what's comfortable and affordable, then we'll simply submit a request for coverage. Make sense? <em style=\"color:var(--copper-lite);\">[wait for the client to respond]</em> Great.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Three Types of Home Insurance</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So when you go to buy a home there are 3 types of insurance on the home:<br/><br/>1. <strong>Private Mortgage Insurance (PMI)</strong> -- this is something the bank requires on their end if you put less than 20% down but does nothing for you or your family. Simply put in place to protect the bank.<br/><br/>2. <strong>Homeowners Insurance</strong> -- protects the physical property of the home in the event of a flood, fire, or any type of disaster. I'm sure we're familiar with that one.<br/><br/>3. <strong>Standard Liability Insurance / Mortgage Protection</strong> -- 3rd and most important type of coverage. This is the coverage that protects you and your family in the event you were to become sick, disabled, or pass away to ensure your family is able to stay in the home and it's taken care of.<br/><br/>Any questions on that? Perfect.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Application Requirements</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Mortgage protection isn't something you can just sign up for at any time like life insurance -- it is something you do actually have to qualify for.<br/><br/>So once we go to submit a request for coverage there are 3 pieces of information required on the application just like any other insurance application.<br/><br/>1. First is your driver's license just to confirm your identity and driving record -- do you have that on hand? <em style=\"color:var(--copper-lite);\">[wait for the client to respond]</em><br/><br/>2. Secondly, your social. That's how they're going to check your prescriptions and medical history -- that being the main factor on if you're approved or declined.<br/><br/>3. Thirdly either a bank statement or a voided check to confirm there is no prior insurance fraud, money laundering, or anything else illegally linked to your account -- and well of course that's how you're going to be paying for the policy.<br/><br/>Does that all make sense? <em style=\"color:var(--copper-lite);\">[wait for the client to respond]</em> Great.\"</div>" }
        ],
      },
      {
        id: "mp3",
        defaultOpen: false,
        stepNum: "3",
        title: "Financial Inventory + Build the Why",
        objKey: "mp_why",
        blocks: [
          { type: "html", html: "<div class=\"agent-note\"><strong>New Agents --</strong> Once the client worksheet is filled out, unmute on Discord OR text your mentor and they will tell you what product to write and how to pitch it.</div>" },
          { type: "html", html: "<div class=\"agent-note\" style=\"font-size:20px;padding:22px 26px;border-left:5px solid #20b2aa;margin:14px 0;\">\n<strong style=\"font-size:22px;letter-spacing:0.04em;\">▶ FILL IN PRINTED CLIENT SUITABILITY SHEET NOW</strong><br/>\n  Complete all financial inventory questions on the printed sheet before moving forward.\n</div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"Now (Name)<span class=\"pause\">....</span> if you were to pass away yesterday, and I always say yesterday because I never want to speak anything into existence, what would the situation look like for (beneficiary)?<br/><br/>I'm assuming it would be pretty tough right? <em style=\"color:var(--off);font-weight:400;\">[Dig into their personal situation]</em>\"</span></div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"So if I were able to find something comfortable and affordable that would avoid that situation and make sure the mortgage is taken care of and doesn't fall a burden on the family<span class=\"pause\">....</span><br/><br/>That would be important to you, correct?\"</span></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok (client's name)<span class=\"pause\">....</span> before we go any further I'm obviously here to help and serve you, as well as figure out some form of protection for this home -- because this house is your biggest asset and of course we want to do everything we can to ensure we protect and preserve it.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Living Benefits (Only Use If Pitching Term / IUL)</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now, I'm assuming you were looking for coverage on the living side as well? <em style=\"color:var(--copper-lite);\">[phrased as a statement, not a question -- roll into the next portion WITHOUT pausing]</em><br/><br/>So God forbid any situation where you become sick, disabled, have cancer, heart attack, or any other sort of critical, terminal, or chronic illness or disability -- that your mortgage is taken care of in that aspect as well?\"</div>" }
        ],
      },
      {
        id: "mp4",
        defaultOpen: false,
        stepNum: "4",
        title: "⚠ Equity Protection -- 55+ or Unhealthy ONLY",
        objKey: "mp_resist",
        blocks: [
          { type: "html", html: "<div class=\"agent-note\"><strong>IMPORTANT:</strong> Only pitch this if they are unhealthy and you're going the whole life / equity protection route. If the client is healthy and you're pitching term or IUL -- <span style=\"color:#ffffff;font-weight:700;\">SKIP this section entirely.</span></div>" },
          { type: "html", html: "<div class=\"sblock\">\"As I'm sure you're already aware (client's name)<span class=\"pause\">....</span> if you wanted to cover the entire mortgage that would be close to another mortgage payment<span class=\"pause\">....</span> which don't worry, none of my clients do in your situation. What my clients do in your situation is put together an equity protection plan.<br/><br/>Has anyone walked you through how the equity protection process works?<br/><br/>Gotcha<span class=\"pause\">....</span> well basically it's a much more practical, much more affordable approach to protecting the mortgage. My goal with you and all of my clients is to solve the maximum amount of your needs with the least amount of insurance possible. Now this plan is different for every client and their situation.<br/><br/>And well really<span class=\"pause\">....</span> for your situation the most amount of insurance you would need (client's name) is around a year to 2 years of mortgage payments to allow (beneficiary) time to mourn, grieve, recover, figure out the financial situation, and move forward in a healthy manner. Does that make sense?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><em style=\"font-size:15px;color:var(--off);\">*If they plan on selling:*</em><br/>\"As well as get the house cleaned up, cleaned out, put on the market, and eventually sold. And what this policy allows for is to give (beneficiary) that grace period of time to get things figured out and get the home sold so he/she isn't forced to fire sale the home for $10k, $20k, $50k less than what it's fully worth because they couldn't afford to keep making the mortgage payments on top of their own bills. Does that make sense (client's name)?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><em style=\"font-size:15px;color:var(--off);\">*Only use this if they have equity in their home:*</em><br/>\"Perfect -- the main goal of this policy is to provide (beneficiary) enough time to get things figured out and move forward in a healthy manner as well as protect the (amount of equity) in your home! Does that make sense?<br/><br/>Perfect<span class=\"pause\">....</span> so we're going to be looking at 9 months, 1 year, and 18 months of mortgage payments.\"</div>" }
        ],
      },
      {
        id: "mp5",
        defaultOpen: false,
        stepNum: "5",
        title: "Present Options + Annual Review Pitch",
        objKey: "mp_app",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Now (name)<span class=\"pause\">....</span> what I am going to do now is plug all this information into my software here which is going to go through all the carriers in the state of (state) and find us some options that would make the most sense for you. Ok?<br/><br/>I'm going to put you on a brief 2 to 5 minute hold here to go ahead and find those options. If you need to do anything in the meantime feel free to do so<span class=\"pause\">....</span> just keep the phone close in case any additional medical questions pop up.<br/><br/>Ok, perfect. Any questions before we do that?<br/><br/>Alright<span class=\"pause\">....</span> I'll put you on that hold<span class=\"pause\">....</span> if you need anything feel free to holler.\"</div>" },
          { type: "html", html: "<div class=\"cond\"><em style=\"font-size:14px;color:var(--muted);\">*Put on hold until you find options*</em></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok perfect (name)<span class=\"pause\">....</span> are you still with me?<br/><br/>So do you still have that pen and paper handy? Perfect<span class=\"pause\">....</span> I'm going to give you 3 options<span class=\"pause\">....</span> you let me know what option is comfortable and affordable for you and we'll go from there.<br/><br/>Now before that I want to preface that once we get approved here, I am assigned to you for life. So what does that mean?<br/><br/>That means that our job is to make sure that your family is always in the best financial situation possible. So after we get approved, we have what is called annual reviews. Which means that in a year from now we will check in with you and the family.<br/><br/>At that point we will ask 'Hey (client's name), how is everything going with the family.' If you are at that moment saying 'Yeah (your name), everything is going great financially and we want to upgrade the coverage' -- then yes, we can do that.<br/><br/>But if you are saying 'Hey (your name), we aren't doing the best financially and we want to lower the coverage' -- then perfect, we can do that as well.<br/><br/>Again, our job is to make sure that no matter what you are in the best financial position possible. So just understand that before going through these options here. Does that make sense? Ok, perfect.\"</div>" },
          { type: "html", html: "<div class=\"cond\"><em style=\"font-size:14px;color:var(--muted);\">*HAVE THEM WRITE DOWN OPTIONS*</em>  <em style=\"font-size:14px;color:var(--copper);font-weight:600;\">*Tailor coverage amounts to the client's needs and budget. Doesn't always have to be 50%, 100%, and 100% + 1 -- THESE ARE JUST EXAMPLES*</em></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Based on what you've told me<span class=\"pause\">....</span> the system has built 3 packages of coverage and you can decide on which option makes the most sense. Now write down <strong>BRONZE</strong>, <strong>SILVER</strong>, and <strong>GOLD</strong><span class=\"pause\">....</span><br/><br/>The <strong>BRONZE</strong> option covers 50% of your remaining mortgage balance<span class=\"pause\">....</span> so that gives (beneficiary's name) the financial runway to get back on their feet, figure things out, get the home on the market if needed, and move forward without being forced into any bad decisions<span class=\"pause\">....</span> that will be (Coverage Amount) and that's just _____ bucks a month.<br/><br/>The <strong>SILVER</strong> option covers 100% of your remaining mortgage balance<span class=\"pause\">....</span> so god forbid anything happened to you, (beneficiary's name) never has to worry about losing this home. The mortgage is completely taken care of<span class=\"pause\">....</span> that will be (Coverage Amount) and that's just _____ bucks a month.<br/><br/>The <strong>GOLD</strong> option covers 100% of your remaining mortgage balance plus one full year of income replacement<span class=\"pause\">....</span> so not only is the home fully protected, but (beneficiary's name) has an entire year to grieve, recover, and get back on their feet financially without touching a single bill<span class=\"pause\">....</span> that will be (Coverage Amount) and that's just _____ bucks a month.\"</div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"Ok perfect<span class=\"pause\">....</span> now that we have those written down<span class=\"pause\">....</span> which one of those options would make the most sense financially for the family<span class=\"pause\">....</span> God willing we can get you approved?\"</span></div>" },
          { type: "html", html: "<div class=\"agent-note\" style=\"font-size:20px;padding:22px 26px;border-left:5px solid #20b2aa;margin:14px 0;\">\n<strong style=\"font-size:22px;letter-spacing:0.04em;\">▶ HEAD OVER TO CARRIER E-APP NOW</strong><br/>\n  Open the carrier application portal and begin entering the client's information. Do not wait. Start the eApp immediately while you still have them on the line.\n</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok<span class=\"pause\">....</span> I don't want to jump the gun just yet. Now we are going to go through the application here. Bear with me as I pull that up.\"</div>" }
        ],
      },
      {
        id: "mp6",
        defaultOpen: false,
        stepNum: "6",
        title: "Tie Down the Sale",
        objKey: null,
        blocks: [
          { type: "html", html: "<div class=\"agent-note\"><strong>Mindset:</strong> Tie downs at the end are huge -- PROVIDE VALUE IN YOURSELF.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Appreciate your patience<span class=\"pause\">....</span> just wrapping up now (client's name). Do you still have that pen and paper handy?<br/><br/>Perfect<span class=\"pause\">....</span> just going to have you write down the details of your coverage that way there's no confusion.\"</div>" },
          { type: "html", html: "<div class=\"qlabel\">Have Them Write Down</div>" },
          { type: "qlist", items: ["Name of the company", "Premium per month and recurring bill date", "Their benefits -- living benefits, cash value, permanent coverage, cash back, etc.", "Your name and number -- make sure they also have your contact saved in their phone", "Security code -- can be anything you want. Intended to prevent other agents from replacing your policy."] },
          { type: "html", html: "<div class=\"sblock\">\"Alright (client's name)<span class=\"pause\">....</span> those are the details of your coverage. Make sure when you see (premium amount) that is a <strong>GOOD THING</strong><span class=\"pause\">....</span> that means you were <strong>APPROVED</strong> and coverage <strong>IS IN FORCE</strong>.<br/><br/>Unlike a lot of life insurance policies where there is that two-year waiting period<span class=\"pause\">....</span> this is <strong>DAY 1 COVERAGE</strong>. What that means is once that first payment is made and something happens to you the next day<span class=\"pause\">....</span> this policy is paying out in full.<br/><br/>You're also going to be receiving the policy packet in the mail within the next 7 to 10 business days. If you don't get it within that time<span class=\"pause\">....</span> make sure to give me a call and we'll get another one mailed out to you.<br/><br/>Make sure (beneficiary) also has my contact because God forbid when something happens to you (client's name)<span class=\"pause\">....</span> I'm the guy that's going to be putting my foot on the insurance company's throat to make sure your family is taken care of and paid out fast.<br/><br/>Lastly<span class=\"pause\">....</span> that security code I gave you -- make sure to keep that safe because if anyone calls you claiming to be me or from my office and they don't have that code<span class=\"pause\">....</span> hang up and block their number because they're trying to scam you or get information.<br/><br/>Any questions on anything we went over?<br/><br/>Sounds good<span class=\"pause\">....</span> I'll be calling you in a year to check in on you and explain your benefits. It was a pleasure helping and serving you (client's name). Give me a call or shoot me a text if you need anything else<span class=\"pause\">....</span> have a blessed day, and talk in a year.\"</div>" }
        ],
      },
    ],
  },
  iul: {
    dialHtml: "<h2>IUL / Cash Value Life Script</h2>\n<div class=\"card-mindset\"><strong>Mindset:</strong> Be the educator, not the salesperson. The more they understand, the easier the close. Ask great questions, anchor to their goals, and let the product sell itself.</div>\n<div class=\"card-legend\">\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--copper);\"></span><span class=\"leg-pause\"><strong>....</strong> = Slight pause</span></span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--gold);\"></span><span style=\"color:var(--gold);font-weight:700;\">Gold</span> = Power question</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:#20b2aa;\"></span><span style=\"color:#7fdbda;font-weight:700;\">Teal</span> = Agent note only</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--green);\"></span><span style=\"color:var(--green);font-weight:700;\">Green</span> = Call conditions / If-Then</span>\n</div>",
    sections: [
      {
        id: "iu1",
        defaultOpen: true,
        stepNum: "1",
        title: "Introduction",
        objKey: "iu_intro",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"(Client's Name)? Hey (Client's Name)<span class=\"pause\">....</span> it's (Agent). I'm calling because it looks like we have an open application under your name -- (Client's Full Name). You recently asked to get some information about cash value life insurance. Do you remember that?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><strong>IF NO:</strong> \"You might have seen our ad on our Facebook platform -- talking about life insurance and becoming your own bank, using cash value life insurance to start a business<span class=\"pause\">....</span> the same way Walt Disney did. Does that ring a bell?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><strong>IF YES:</strong> \"Ok, cool. Yes -- what made you submit a request? Anything specific you had in mind or just looking at some options? How can I help?\" <em style=\"font-size:14px;color:var(--muted);\">[Let the client respond]</em></div>" }
        ],
      },
      {
        id: "iu2",
        defaultOpen: false,
        stepNum: "2",
        title: "Discovery Questions",
        objKey: "iu_disc",
        blocks: [
          { type: "html", html: "<div class=\"qlabel\">Ask ALL of These Before Providing a Quote</div>" },
          { type: "qlist", items: ["Anything specific that sparked your interest? Becoming your own bank or building wealth<span class=\"pause\">....</span> maybe starting a business?", "Did you have life insurance before<span class=\"pause\">....</span> or would this potentially be your first policy?", "Ok (Client's Name)<span class=\"pause\">....</span> just so we can make sure we're on the same page -- what's the main reason for doing it this way instead of, say, putting money under the mattress or doing some sort of other fund? Is it the compounding interest<span class=\"pause\">....</span> maybe how you can be your own bank?", "And where does the need for life insurance come into play? <em style=\"color:var(--copper-lite);\">(soft tone)</em> If you passed away next week -- God forbid -- who are you leaving behind? Do you have a spouse? Kids? Tell me a little bit about your situation.", "Who would be the person handling everything?", "As of now<span class=\"pause\">....</span> would they pay out of pocket, take a loan, or is that one of the reasons you wanted to set this life insurance up?", "Ok (Client's Name)<span class=\"pause\">....</span> you've been looking into this for a while now -- so why do you want to take action on this now? Why is this important?"] },
          { type: "html", html: "<div class=\"qlabel\">If They Already Have Insurance -- Ask These</div>" },
          { type: "qlist", items: ["Ok, great! How long have you had that life insurance policy?", "Do you like the policy you have right now?", "What's wrong with the policy you have in place right now? Why do you feel like it isn't enough?", "Just for my understanding -- are you looking to replace that policy or supplement it?"] }
        ],
      },
      {
        id: "iu3",
        defaultOpen: false,
        stepNum: "3",
        title: "Emphasize the Problem + Present the IUL",
        objKey: "iu_pres",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Ok (Client's Name)<span class=\"pause\">....</span> so just so I can make sure we're on the same page -- you're looking at a cash value policy to make sure that: (list their specific solutions -- protect my family, make sure they don't lose the house, cover burial expenses, build cash value for retirement, start a business, etc.).<br/><br/>Is that pretty much what you were looking into?\" <em style=\"color:var(--copper-lite);\">[Let the client respond]</em><br/><br/>\"Ok sweet! So it sounds like you're looking at a cash value life insurance policy. That would either be a Whole Life policy or an Indexed Universal Life -- IUL -- policy. Have you ever heard of those two?<br/><br/>Ok cool. So both of these policies are super similar. An IUL is a good fit for people with great health<span class=\"pause\">....</span> and if you can't qualify for an IUL, most people usually get a Whole Life instead. So what you need to know is both of these coverages...\"</div>" },
          { type: "html", html: "<div class=\"iblock\"><h4>Cover Each of These Points</h4><ul>\n<li>It protects you for the rest of your life -- it never expires. Your rate is fixed, so you never have to worry about your monthly payment going up or losing your coverage as you age.</li>\n<li>Unlike car insurance or a cell phone payment, where you pay and never see that money again -- with an IUL you're stacking your payments and it builds compound interest.</li>\n<li>Over time, if you ever need to pull from it for any reason, it's totally available and tax-free. You can really do whatever you want with it. <em style=\"color:var(--muted);\">(Provide a specific example for their situation -- down payment on a house, paying for your daughter's college, etc.)</em></li>\n<li>The index follows the S&amp;P 500 -- but it has a ground level of zero. If the stock market is ever going down, you NEVER lose any money. As soon as the market goes back up, you're gaining that compounding interest again.</li>\n<li>The money in the index always remains in the index building compounding interest. What you're actually doing is taking out a loan against the death benefit. So if you decided to take out a loan and not pay it back, your death benefit will decrease by the amount you borrowed. Does that make sense?</li>\n</ul></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Does that sound like what you were looking for?\"</div>" }
        ],
      },
      {
        id: "iu4",
        defaultOpen: false,
        stepNum: "4",
        title: "Qualifying, Quoting + Premium Breakdown",
        objKey: "iu_quote",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">IF YES -- Move to Submit</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok sweet! I really don't have much left for you. So what we can do is go ahead and submit a free application to get you approved. You won't be paying any application fees or broker fees.<br/><br/>The only thing you would potentially pay<span class=\"pause\">....</span> if we get you approved<span class=\"pause\">....</span> would be your policy's monthly payment. So what would be a comfortable monthly payment for you? And by the way<span class=\"pause\">....</span> there are no right answers. Some people put $1,000 a month, some people put $100 a month -- it's totally up to you. So where would you want to start?\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok (client's name)<span class=\"pause\">....</span> I don't know for sure if we can get you approved yet -- but assuming I can get you approved I'm going to get a quote pulled up for you that way we know exactly how much coverage you can get.<br/><br/>So (client's name)<span class=\"pause\">....</span> what's your date of birth? Alright<span class=\"pause\">....</span> and you're still living in (State)? Perfect<span class=\"pause\">....</span> and do you smoke or use any tobacco? <em style=\"color:var(--copper-lite);\">[Ask remaining medical questions]</em><br/><br/>Ok awesome<span class=\"pause\">....</span> so it looks like we can get you approved for (coverage amount) for (premium) on a monthly basis.<br/><br/>Now (client's name)<span class=\"pause\">....</span> the company I ran you through is (carrier name) -- have you ever heard of them before? Awesome <em style=\"color:var(--muted);\">(or \"No worries\")</em> -- they've been around for over 100 years and known for having some of the best rates and cash value accumulation. They actually have an A+ rating on the Better Business Bureau as well.<br/><br/>The quote I pulled up for you is (amount of coverage) for ($ bucks a month) -- now (client's name)<span class=\"pause\">....</span> is that a good spot to start, do you want to go up or down, or is that perfect?\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Premium Split Breakdown</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok (client's name) -- so it is life insurance. Now the way this works is the monthly premium that you're paying is divided into two portions.<br/><br/>So let's take 50% of your monthly premium<span class=\"pause\">....</span> that goes towards the cost of the insurance. The other 50% of your premium goes into an index<span class=\"pause\">....</span> now that index follows the S&amp;P 500<span class=\"pause\">....</span> are you familiar with the S&amp;P 500?\"</div>" },
          { type: "html", html: "<div class=\"cond\"><em style=\"font-size:14px;color:var(--muted);\">If yes:</em> \"Perfect<span class=\"pause\">....</span> so it works just like a 401K, except that it has a ground level of zero. And what I mean by that is IF the stock market is ever going down, you NEVER lose any money. As soon as the market goes back up, you're gaining that compounding interest again. Does that make sense?\" <em style=\"color:var(--muted);font-size:14px;\">[let client answer]</em> \"Ok perfect.\"<br/><br/><em style=\"font-size:14px;color:var(--muted);\">If no:</em> \"Are you familiar with a 401K? Perfect<span class=\"pause\">....</span> so it works just like a 401K, except that it has a ground level of zero. And what I mean by that is IF the stock market ever goes down, you never lose any money. As soon as the market goes back up, you're gaining that compounding interest again. Does that make sense?\" <em style=\"color:var(--muted);font-size:14px;\">[let client answer]</em> \"Ok perfect. Now the money in the index is what you have access to borrow. What I mean by that is the money in the index will always remain in the index building compounding interest. What you're actually doing is taking out a loan against the death benefit<span class=\"pause\">....</span> so if you decided to take out a loan and not pay it back then your death benefit will decrease the amount you borrowed and didn't pay back. Does that make sense?\"</div>" }
        ],
      },
      {
        id: "iu5",
        defaultOpen: false,
        stepNum: "5",
        title: "Straight Into eApp + Lock Down the Close",
        objKey: "iu_close",
        blocks: [
          { type: "html", html: "<div class=\"agent-note\"><strong>Agent:</strong> After they approve the quote -- go straight into eApp. No waiting. No pausing. Pull up the application and start moving.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Ok (client name)<span class=\"pause\">....</span> I've got good news and bad news for you. What should I start with?<br/><br/>The bad news -- is that I'm your new life insurance agent. You'll have to hear my annoying voice here and there.<br/><br/>The good news is that you got approved! Congratulations.<br/><br/>Now<span class=\"pause\">....</span> a few final remarks before we hop off.<br/><br/>1. Make sure you lock in my name and my number. <em style=\"color:var(--muted);font-size:14px;\">[text client your business card and name as you say that]</em><br/><br/>2. You will receive a physical copy of the policy in the next 3 to 6 weeks. You also have an electronic copy in your email right now.<br/><br/>3. Be on the lookout for the initial draft coming out on (date). Recurring payments are every Xth of the month.<br/><br/>4. Last thing<span class=\"pause\">....</span> if at any point of time you feel like this is too much or too little<span class=\"pause\">....</span> just give me a call and we'll take care of it.<br/><br/>Now before I let you go<span class=\"pause\">....</span> any other questions for me about anything? Well you have a blessed rest of your day!\"</div>" }
        ],
      },
    ],
  },
  fia: {
    dialHtml: "<h2>Fixed Indexed Annuity Script</h2>\n<div class=\"card-mindset\"><strong>Mindset:</strong> 2-Call Close System. Call 1 is discovery only -- do not pitch, just listen and qualify. Call 2 is the presentation and close. Patience and process win this sale.</div>\n<div class=\"card-legend\">\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--copper);\"></span><span class=\"leg-pause\"><strong>....</strong> = Slight pause</span></span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--gold);\"></span><span style=\"color:var(--gold);font-weight:700;\">Gold</span> = Power question</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:#20b2aa;\"></span><span style=\"color:#7fdbda;font-weight:700;\">Teal</span> = Agent note only</span>\n<span class=\"leg-item\"><span class=\"leg-dot\" style=\"background:var(--green);\"></span><span style=\"color:var(--green);font-weight:700;\">Green</span> = Call conditions / If-Then</span>\n</div>",
    sections: [
      {
        id: "fia1",
        defaultOpen: true,
        stepNum: "1",
        title: "Call 1 -- Opener",
        objKey: "fia_open",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Opening Line</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Hi, is this [Client Name]? Hey [Client Name]<span class=\"pause\">....</span> this is [Agent Name] with Tier 1 Financial -- how are you doing today?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Genuine pause. Let them respond. Do not steamroll into the pitch.</strong></div>" },
          { type: "html", html: "<div class=\"slabel\">Bridge to Purpose</div>" },
          { type: "html", html: "<div class=\"sblock\">\"The reason for my call -- you had reached out about your retirement savings and looking at options to grow your money without the risk of losing it in the market. Is that right? Perfect. I just want to ask a few quick questions to see if what I do is even a fit. Cool?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Get the yes. Micro-commitment before you ask anything personal.</strong></div>" }
        ],
      },
      {
        id: "fia2",
        defaultOpen: false,
        stepNum: "2",
        title: "Call 1 -- Funds Discovery",
        objKey: "fia_funds",
        blocks: [
          { type: "html", html: "<div class=\"qlabel\">Ask All Three -- Flow Conversationally</div>" },
          { type: "qlist", items: ["\"So [Client Name]<span class=\"pause\">....</span> help me understand your situation a little better -- what's the account or money you're thinking about? Is it a 401(k), IRA, pension rollover, CDs, savings -- what are we working with?\"", "\"And roughly how much are we talking about? Ballpark is completely fine.\"", "\"Got it. And what's that money doing for you right now -- do you know what it's earning or how it's been performing?\""] }
        ],
      },
      {
        id: "fia3",
        defaultOpen: false,
        stepNum: "3",
        title: "Call 1 -- Uncover the Pain",
        objKey: "fia_pain",
        blocks: [
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"What made you start looking into other options? Like what's going on that made you want to take a closer look at this?\"</span></div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Most important question on the call. Shut up and let them talk.</strong> Key pain points to listen for: market volatility fear, nearing retirement, spouse's concern, lost money before, frustration with no growth. Whatever they say -- reflect it back.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Has there been a point -- maybe 2008, 2020, or even recently -- where you watched that account drop and it made your stomach drop with it?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">If yes -- anchor that emotion. <em>\"And that's exactly what we're trying to make sure never happens again.\"</em></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Here's a question I ask everyone -- if you had to rank what matters more to you: making sure you absolutely cannot lose this money, or making sure it grows as fast as possible -- which wins?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Most FIA prospects say protection, or 'both.' If they say pure growth above all else -- they may be a better fit for something else. Qualify here.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Are you thinking about this money as something that'll eventually pay you a monthly income -- like a personal pension -- or more of a long-term nest egg you want growing in the background?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Income = income rider conversation on Call 2. Growth only = focus on cap rates and index performance.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"When are you thinking you'd want to start drawing on this money? Are you retired now, or do you have a few years still?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Under 5 years to retirement with this being ALL their money -- flag a suitability concern. Over 5 years -- ideal FIA candidate.</div>" }
        ],
      },
      {
        id: "fia4",
        defaultOpen: false,
        stepNum: "4",
        title: "Call 1 -- Position the Concept",
        objKey: "fia_concept",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Recap Their Situation First</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Okay<span class=\"pause\">....</span> so let me make sure I have this right -- you've got [Rollover Amount] in a [Source of Funds], it's [been in the market / sitting earning (Current Rate)], and what you really want is to make sure that money grows without having to worry about losing it every time the market has a bad quarter. Is that fair?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Get confirmation before you introduce the product.</strong></div>" },
          { type: "html", html: "<div class=\"slabel\">Introduce the FIA Concept</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So what I specialize in is something called a Fixed Indexed Annuity -- and before you tune out, I know 'annuity' has a bad reputation, but hear me out for 30 seconds because this is genuinely different from what most people think.<br/><br/>A Fixed Indexed Annuity is a contract with an insurance company. Your money is NOT in the stock market -- but your growth is linked to how the market performs. So when the market goes up, you capture a portion of those gains up to a cap. And when the market goes down? You earn zero. Not negative. Zero. Your principal is completely protected by a 0% floor. You simply cannot lose money.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Watch for their reaction. If they say \"what's the catch\" -- perfect. Move to next block.</div>" },
          { type: "html", html: "<div class=\"slabel\">Handle the \"What's the Catch\" Moment</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now you're probably thinking -- what's the catch, right? And it's a fair question. The trade-off is the cap rate. In exchange for the downside protection, there's a ceiling on how much you can earn in a given year. So you won't capture the full 25% the S&amp;P had in 2023 -- but you also didn't lose 38% in 2008. For most people who are protecting retirement money, that trade-off is worth every penny.\"</div>" }
        ],
      },
      {
        id: "fia5",
        defaultOpen: false,
        stepNum: "5",
        title: "Call 1 -- Set the Close Appointment",
        objKey: "fia_appt",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"What I'd like to do is take your specific situation -- [Rollover Amount] from your [Source of Funds] -- and put together the actual numbers for you. Show you what the current cap rates look like, what your money could realistically grow to, and if income is on the table, what that guaranteed monthly number could be. Does that sound worth a second conversation?\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Are you generally more available in the morning or afternoon? And would [day option 1] or [day option 2] work for you?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Two options only. Never open-ended.</strong></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Perfect, I've got you for [Appointment Date] at [Time]. One thing -- is [Client Name] the only person on this call, or will your spouse or partner be joining us? Because this affects both of you, and I'd love to have them there so nobody's out of the loop.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>Getting both spouses on the close call is non-negotiable. Absent spouse is the #1 reason for stalls.</strong></div>" },
          { type: "html", html: "<div class=\"sblock\">\"Excellent. So I'll see you [Appointment Date]. I'm going to put together the numbers specifically for [Rollover Amount] -- cap rates, growth projections, and income scenarios -- and we'll walk through it together. Any questions before I let you go?\"</div>" }
        ],
      },
      {
        id: "fia6",
        defaultOpen: false,
        stepNum: "6",
        title: "Call 2 -- Re-Engage and Education",
        objKey: "fia_edu",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Warm Opener</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Hey [Client Name]<span class=\"pause\">....</span> it's [Agent Name] with Tier 1 Financial -- we spoke [X days] ago. How's everything going?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Brief. Do not over-chit-chat. They're showing up for the numbers.</div>" },
          { type: "html", html: "<div class=\"slabel\">Re-Anchor to Their Pain</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Before I pull up the numbers<span class=\"pause\">....</span> I just want to make sure nothing's changed on your end. You had mentioned you had [Rollover Amount] in your [Source of Funds], and the main thing you wanted was to make sure that money keeps growing without the risk of watching it drop every time the market has a rough stretch. Still the goal?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">If anything changed -- new concern, spouse has questions, they talked to someone -- surface it NOW, before you present.</div>" },
          { type: "html", html: "<div class=\"slabel\">Set the Frame for Education</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Before I show you the specific product, I want to make sure we're on the same page about how these work -- because I think it makes the numbers make a lot more sense. Is that okay?\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Explain the Floor</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So the cornerstone of a Fixed Indexed Annuity is what's called the floor. Your floor is 0%. What that means in plain English is -- no matter what the stock market does, you cannot lose a single dollar of your principal. 2008, the market dropped 38%. Someone in an FIA that year earned zero. Not negative 38. Zero. Their account looked exactly the same on January 1st as it did the year before. That's the floor.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Let that land. <strong>Pause after \"zero.\"</strong> Watch for their reaction.</div>" },
          { type: "html", html: "<div class=\"slabel\">Explain the Cap</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now the other side of that is the cap. Because the insurance company is guaranteeing your downside, they put a ceiling on your upside. Right now the cap on this product is [Cap Rate]. So if the [Index] goes up 20% this year, you earn [Cap Rate]. If it goes up 8%, you earn 8%. The cap only matters when the market outperforms it -- and when it does, you still win. You just don't win as much as someone who was fully exposed to the risk.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">The Trade-Off Summary</div>" },
          { type: "html", html: "<div class=\"sblock\">\"So the way I describe it is this: you're giving up the ceiling in exchange for a bulletproof floor. For money you cannot afford to lose -- retirement money -- most people look at that trade and say 'that's exactly what I want.' Does that make sense?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Get a yes before moving to the product presentation.</div>" },
          { type: "html", html: "<div class=\"slabel\">Income Rider -- Only If Client Expressed Income Need on Call 1</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now there's one more piece that's relevant for you specifically, since you mentioned wanting this to become income eventually. This carrier offers what's called an income rider -- think of it as a separate account that grows at a guaranteed rate of [Roll-Up Rate] every single year, regardless of what the index does. That account is specifically used to calculate your guaranteed lifetime income. So even if the market flatlines for five years, your income base keeps growing. When you're ready to turn the income on, it pays you [Monthly Income] per month, guaranteed for life.\"</div>" }
        ],
      },
      {
        id: "fia7",
        defaultOpen: false,
        stepNum: "7",
        title: "Call 2 -- Present the Numbers",
        objKey: "fia_pres",
        blocks: [
          { type: "html", html: "<div class=\"sblock\">\"Alright<span class=\"pause\">....</span> so here's what I put together for your situation. The product I want to walk you through is the [Product Name] through [Carrier]. [Carrier] has been around since [Year], they're A-rated, and this is one of the strongest FIA products in the market right now for someone in your position.\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"This product is linked to the [Index]. The current cap rate is [Cap Rate]. That means in any year the index finishes positive, you can earn up to [Cap Rate]. In any year it finishes negative -- you earn zero. Principal protected. No losses.\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now I always like to put this in perspective. Looking at the S&amp;P 500 historically, it's been positive about 75% of years. So roughly 3 out of every 4 years, you'd be earning something -- up to your cap. The years it's down, you sit at zero. Over a 7 or 10-year period, this strategy has historically outperformed keeping money in CDs or money markets while completely eliminating the downside. You're not getting rich overnight, but you're not going backwards either.\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Do NOT guarantee historical results. Frame as \"historically\" and \"based on index performance.\" Stay compliant. Use carrier illustration software -- moderate and conservative scenarios only. Never best-case only.</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Let me show you what this could look like on [Rollover Amount]. In a moderate scenario -- assuming the index averages somewhere around [Conservative Credited Rate] per year net of the cap -- over [Term] years you're looking at roughly [Projected Value]. And remember -- that's with zero possibility of it going below [Rollover Amount]. Your starting point is your worst case.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">If Income Rider -- Present the Income</div>" },
          { type: "html", html: "<div class=\"sblock\">\"And if you turn the income on at [Retirement Age] -- based on the [Income Rider] growing your income base at [Roll-Up Rate] per year -- you'd be looking at [Monthly Income] per month for the rest of your life. That's [Annual Income] a year, guaranteed, no matter how long you live and regardless of what the market does.\"</div>" }
        ],
      },
      {
        id: "fia8",
        defaultOpen: false,
        stepNum: "8",
        title: "Call 2 -- Rollover Process + Trial Close + Application",
        objKey: "fia_close",
        blocks: [
          { type: "html", html: "<div class=\"slabel\">Make the Rollover Simple</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Now -- the logistics of moving the money. I know 'rollover' sounds like a headache, but it's genuinely one of the most straightforward things we do. We initiate a direct transfer from your [Source of Funds] to [Carrier]. It goes account to account. You never touch the money<span class=\"pause\">....</span> so there's zero tax event, no penalties, no withholding. My team handles the paperwork end-to-end. Your job is just to get started.\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"From application to funds transfer typically runs about 3 to 6 weeks depending on your current custodian. The second those funds arrive at [Carrier], your contract is in force and your floor kicks in immediately.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Trial Close</div>" },
          { type: "html", html: "<div class=\"gold-txt\"><span class=\"q\">\"Based on everything I've walked you through -- does this feel like something that makes sense for your situation?\"</span></div>" },
          { type: "html", html: "<div class=\"agent-note\"><strong>STOP TALKING. Let them respond. Silence is the close.</strong></div>" },
          { type: "html", html: "<div class=\"slabel\">If Positive -- Move to Application</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Great. So the next step is straightforward -- we get the application submitted. It's a digital e-app, takes about 10 minutes, and I walk you through it. I'll need your full legal name, date of birth, Social Security number, and the name of your beneficiary. Do you have that handy?\"</div>" },
          { type: "html", html: "<div class=\"sblock\">\"And who would you want to name as your beneficiary -- the person this money goes to if something were to happen to you?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Naming a beneficiary makes it concrete and personal. It is a natural closing step that confirms commitment.</div>" },
          { type: "html", html: "<div class=\"slabel\">Assumptive Close</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Let's go ahead and get the application in while we have all the numbers in front of us. I'll send the e-app link to your email right now -- what's the best address to send that to?\"</div>" },
          { type: "html", html: "<div class=\"agent-note\">Move forward. If they stop you, that is the next objection to address -- do not preemptively hesitate.</div>" },
          { type: "html", html: "<div class=\"slabel\">Post-Application Confirmation</div>" },
          { type: "html", html: "<div class=\"sblock\">\"Perfect, [Client Name]. Application is submitted. Here's what happens from here -- [Carrier] will send a welcome packet, and my team will initiate the transfer from your [Source of Funds]. The whole process takes about [Timeline]. I'll be your point of contact throughout. My direct number is [Agent Number] -- anything at all, text or call me.\"</div>" },
          { type: "html", html: "<div class=\"slabel\">Referral Seed</div>" },
          { type: "html", html: "<div class=\"sblock\">\"One last thing -- if you know anyone else who has retirement money that's just sitting somewhere not working for them, I'd love to help. That's exactly what we do.\"</div>" }
        ],
      },
    ],
  }
};
