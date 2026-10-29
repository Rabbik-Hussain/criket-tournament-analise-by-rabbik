/* =========================================================
   MATCHCRAFT CRICKET — ABOUT & HELP
   File: help.js

   Features:
   - Complete Bangla & English Help Guide
   - One-click Bangla / English Toggle
   - Expand / Collapse Help Cards
   - Single Card Accordion
   - Responsive and Safe DOM Integration
   - No API Required
   - No Changes to Match or Tournament Data
========================================================= */

(() => {
    "use strict";

    const HELP_VERSION = "1.0.0";
    const DEFAULT_LANGUAGE = "bn";

    const helpGuides = [
        {
            id: "dashboard",
            icon: "fa-solid fa-gauge-high",
            bn: {
                title: "Dashboard — প্রধান ড্যাশবোর্ড",
                intro: "পুরো ক্রিকেট টুর্নামেন্ট ব্যবস্থাপনার সামগ্রিক অবস্থা এক জায়গায় দেখার জন্য এই পেজ।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "টুর্নামেন্ট ব্যবস্থাপনার প্রধান পেজ হিসেবে ড্যাশবোর্ড ব্যবহার করুন।",
                            "এখানে প্রদর্শিত সারসংক্ষেপ ও পরিসংখ্যান দেখে আপনার অ্যাপের বর্তমান অবস্থা বুঝুন।",
                            "বিস্তারিত তথ্যের জন্য সংশ্লিষ্ট সাইডবার পেজে প্রবেশ করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "সাইডবার থেকে Dashboard নির্বাচন করুন।",
                            "প্রদর্শিত তথ্য পর্যালোচনা করুন।",
                            "নতুন টুর্নামেন্ট তৈরি বা ম্যাচ পরিচালনার জন্য সংশ্লিষ্ট পেজে যান।"
                        ]
                    },
                    {
                        title: "মনে রাখবেন",
                        items: [
                            "কোনো তথ্য না থাকলে কিছু সারসংক্ষেপ খালি থাকতে পারে।",
                            "ড্যাশবোর্ডে যে তথ্য দেখানো হয়, তা অ্যাপের বিদ্যমান ডেটা ও বাস্তবায়িত ফিচারের ওপর নির্ভর করে।"
                        ]
                    }
                ]
            },
            en: {
                title: "Dashboard — Main Dashboard",
                intro: "This page provides an overview of your cricket tournament management system.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Use the dashboard as the main overview page.",
                            "Review the summaries and statistics displayed to understand the current state of your app.",
                            "Open the relevant sidebar page to access detailed information."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Select Dashboard from the sidebar.",
                            "Review the information displayed.",
                            "Open the relevant page to create tournaments or manage matches."
                        ]
                    },
                    {
                        title: "Important notes",
                        items: [
                            "Some summaries may be empty when no data is available.",
                            "Dashboard information depends on the data and features implemented in the app."
                        ]
                    }
                ]
            }
        },

        {
            id: "tournaments",
            icon: "fa-solid fa-trophy",
            bn: {
                title: "Tournaments & Seasons — টুর্নামেন্ট ও মৌসুম",
                intro: "নতুন ক্রিকেট টুর্নামেন্ট তৈরি, মৌসুম নির্ধারণ এবং টুর্নামেন্টের নিয়ম ও ফরম্যাট পরিচালনার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "নতুন টুর্নামেন্ট তৈরি ও তার নাম নির্ধারণ করুন।",
                            "টুর্নামেন্টের মৌসুম এবং প্রযোজ্য সেটিংস নির্ধারণ করুন।",
                            "অ্যাপে উপলব্ধ ফরম্যাট অনুযায়ী BPL / IPL League, T20, ODI, Test অথবা Custom নির্বাচন করুন।",
                            "আপনার টুর্নামেন্টের ধরন অনুযায়ী প্রযোজ্য নিয়ম ও সেটিংস নির্ধারণ করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Tournaments & Seasons পেজ খুলুন।",
                            "নতুন টুর্নামেন্ট তৈরির ফর্ম পূরণ করুন।",
                            "টুর্নামেন্টের নাম, মৌসুম, দলসংখ্যা ও উপলব্ধ ফরম্যাট নির্বাচন করুন।",
                            "প্রযোজ্য নিয়ম ও সেটিংস যাচাই করে পেজে দেওয়া Save বা Create বাটন ব্যবহার করুন।",
                            "টুর্নামেন্ট তৈরি হলে Teams & Squads পেজে গিয়ে দল প্রস্তুত করুন।"
                        ]
                    },
                    {
                        title: "ফরম্যাট সম্পর্কে",
                        items: [
                            "T20 সাধারণত ২০ ওভারের ম্যাচের জন্য ব্যবহৃত হয়।",
                            "ODI সাধারণত ৫০ ওভারের ম্যাচের জন্য ব্যবহৃত হয়।",
                            "Test ফরম্যাটে একাধিক দিনের খেলা ও প্রযোজ্য টেস্ট নিয়ম থাকতে পারে।",
                            "BPL / IPL League ফরম্যাটে লিগ ও প্রযোজ্য প্লে-অফ সেটিংস থাকতে পারে।",
                            "Custom ফরম্যাটে আপনার অ্যাপে উপলব্ধ কাস্টম নিয়ম অনুসরণ করুন।"
                        ]
                    },
                    {
                        title: "সতর্কতা",
                        items: [
                            "টুর্নামেন্ট তৈরি করার আগে ফরম্যাট ও নিয়ম যাচাই করুন।",
                            "ইতিমধ্যে তৈরি টুর্নামেন্টের সেটিংস পরিবর্তনের আগে সংশ্লিষ্ট ম্যাচ ও ডেটার ওপর প্রভাব যাচাই করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Tournaments & Seasons",
                intro: "Learn how to create cricket tournaments, select seasons, and configure tournament formats and rules.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Create a new tournament and set its name.",
                            "Choose a season and configure the available settings.",
                            "Select an available format: BPL / IPL League, T20, ODI, Test, or Custom.",
                            "Configure the applicable rules and settings for your tournament."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Tournaments & Seasons.",
                            "Complete the new tournament form.",
                            "Enter the tournament name, season, team count, and available format.",
                            "Review the rules and use the Save or Create button provided by the page.",
                            "After creating the tournament, prepare your teams in Teams & Squads."
                        ]
                    },
                    {
                        title: "About formats",
                        items: [
                            "T20 is generally used for 20-over matches.",
                            "ODI is generally used for 50-over matches.",
                            "Test cricket may include multiple days and applicable Test rules.",
                            "BPL / IPL League may include league and applicable playoff settings.",
                            "Follow the custom rules available in your app for Custom tournaments."
                        ]
                    },
                    {
                        title: "Important notes",
                        items: [
                            "Check the format and rules before creating a tournament.",
                            "Before changing an existing tournament's settings, check the possible effect on its matches and data."
                        ]
                    }
                ]
            }
        },

        {
            id: "teams",
            icon: "fa-solid fa-people-group",
            bn: {
                title: "Teams & Squads — দল ও স্কোয়াড",
                intro: "টুর্নামেন্টের দল তৈরি, দলের পরিচিতি এবং স্কোয়াড ব্যবস্থাপনার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "টুর্নামেন্টের জন্য দল তৈরি ও পরিচালনা করুন।",
                            "দলের নাম এবং পেজে উপলব্ধ অন্যান্য পরিচিতির তথ্য দিন।",
                            "প্রযোজ্য টুর্নামেন্ট নির্বাচন করে দলগুলোকে সঠিক টুর্নামেন্টের সঙ্গে যুক্ত করুন।",
                            "স্কোয়াডের খেলোয়াড়সংক্রান্ত তথ্য আপনার অ্যাপে উপলব্ধ ফিচার অনুযায়ী পরিচালনা করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Teams & Squads পেজ খুলুন।",
                            "সঠিক টুর্নামেন্ট নির্বাচন করুন, যদি নির্বাচন করার অপশন থাকে।",
                            "দলের নাম ও প্রয়োজনীয় তথ্য পূরণ করুন।",
                            "পেজে দেওয়া Create বা Save বাটন ব্যবহার করুন।",
                            "দল তৈরির পর Players পেজে গিয়ে খেলোয়াড়ের তথ্য যোগ বা যাচাই করুন।"
                        ]
                    },
                    {
                        title: "যাচাই করার বিষয়",
                        items: [
                            "দলের নাম সঠিকভাবে লেখা হয়েছে কি না দেখুন।",
                            "দলটি সঠিক টুর্নামেন্টের সঙ্গে যুক্ত হয়েছে কি না যাচাই করুন।",
                            "ম্যাচ তৈরির আগে সংশ্লিষ্ট দল ও স্কোয়াডের তথ্য পরীক্ষা করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Teams & Squads",
                intro: "Learn how to create tournament teams, manage team details, and organize squads.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Create and manage teams for a tournament.",
                            "Enter team names and other available team details.",
                            "Select the correct tournament when the page provides a tournament selector.",
                            "Manage squad information using the features available in your app."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Teams & Squads.",
                            "Select the correct tournament if a selector is available.",
                            "Enter the team name and required details.",
                            "Use the Create or Save button provided by the page.",
                            "Open Players to add or review player information."
                        ]
                    },
                    {
                        title: "What to check",
                        items: [
                            "Make sure the team name is correct.",
                            "Verify that the team belongs to the intended tournament.",
                            "Review team and squad information before creating matches."
                        ]
                    }
                ]
            }
        },

        {
            id: "players",
            icon: "fa-solid fa-user-group",
            bn: {
                title: "Players & Roles — খেলোয়াড় ও ভূমিকা",
                intro: "খেলোয়াড়ের পরিচিতি, দলের সঙ্গে সম্পর্ক এবং ক্রিকেটে খেলোয়াড়ের ভূমিকা পরিচালনার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "খেলোয়াড়ের নাম ও পেজে থাকা অন্যান্য তথ্য যোগ করুন।",
                            "প্রযোজ্য ক্ষেত্রে খেলোয়াড়কে সংশ্লিষ্ট দল বা স্কোয়াডের সঙ্গে যুক্ত করুন।",
                            "অ্যাপে উপলব্ধ থাকলে খেলোয়াড়ের ভূমিকা নির্ধারণ করুন, যেমন Batter, Bowler, All-rounder বা Wicketkeeper।",
                            "ম্যাচে ব্যবহারের আগে খেলোয়াড়ের তথ্য যাচাই করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Players & Roles পেজ খুলুন।",
                            "প্রযোজ্য টুর্নামেন্ট ও দল নির্বাচন করুন।",
                            "খেলোয়াড়ের নাম ও প্রয়োজনীয় তথ্য পূরণ করুন।",
                            "ভূমিকা নির্বাচন করার অপশন থাকলে সঠিক ভূমিকা দিন।",
                            "Save বা Add বাটন ব্যবহার করে তথ্য সংরক্ষণ করুন।"
                        ]
                    },
                    {
                        title: "ম্যাচের আগে যাচাই",
                        items: [
                            "খেলোয়াড় সঠিক দলের কি না নিশ্চিত করুন।",
                            "একই খেলোয়াড়ের অপ্রয়োজনীয় ডুপ্লিকেট এন্ট্রি এড়িয়ে চলুন।",
                            "Match Center-এ দল নির্বাচন করার সময় খেলোয়াড়ের তালিকা পরীক্ষা করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Players & Roles",
                intro: "Learn how to manage player details, team associations, and cricket player roles.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Add player names and other available player details.",
                            "Associate players with the appropriate team or squad when supported.",
                            "If available, assign roles such as Batter, Bowler, All-rounder, or Wicketkeeper.",
                            "Verify player information before using it in a match."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Players & Roles.",
                            "Select the relevant tournament and team.",
                            "Enter the player's name and required details.",
                            "Choose the correct role if a role selector is available.",
                            "Use Save or Add to store the information."
                        ]
                    },
                    {
                        title: "Pre-match checks",
                        items: [
                            "Make sure the player belongs to the correct team.",
                            "Avoid unnecessary duplicate entries for the same player.",
                            "Check the player list when selecting teams in Match Center."
                        ]
                    }
                ]
            }
        },

        {
            id: "matches",
            icon: "fa-solid fa-baseball-bat-ball",
            bn: {
                title: "Matches & Live Score — ম্যাচ ও লাইভ স্কোর",
                intro: "ম্যাচ পরিচালনা, দল নির্বাচন, ইনিংস শুরু এবং বল-বাই-বল স্কোর আপডেট করার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "অ্যাপে উপলব্ধ পদ্ধতিতে ম্যাচ নির্বাচন বা তৈরি করুন।",
                            "ম্যাচের জন্য দুই দল এবং প্রযোজ্য খেলোয়াড় নির্বাচন করুন।",
                            "টস, ব্যাটিং ও বোলিং দল এবং ওপেনিং খেলোয়াড়ের তথ্য নির্ধারণ করুন।",
                            "ম্যাচ চলাকালে বল-বাই-বল স্কোর আপডেট করুন।",
                            "ইনিংস ও ম্যাচের ফলাফল সম্পন্ন করুন।"
                        ]
                    },
                    {
                        title: "ম্যাচ শুরু করার আগে",
                        items: [
                            "সঠিক টুর্নামেন্ট ও ম্যাচ নির্বাচন করুন।",
                            "দুই দলের নাম এবং উপলব্ধ স্কোয়াড যাচাই করুন।",
                            "টসের ফলাফল ও প্রথমে ব্যাট করা দল সঠিকভাবে নির্ধারণ করুন।",
                            "ওপেনিং ব্যাটার এবং বোলারের তথ্য যাচাই করুন।"
                        ]
                    },
                    {
                        title: "লাইভ স্কোর আপডেট",
                        items: [
                            "প্রতিটি বলের প্রকৃত ফলাফল অনুযায়ী রান যোগ করুন।",
                            "চার, ছয়, উইকেট, অতিরিক্ত রান এবং অন্যান্য ইভেন্ট সঠিকভাবে নির্বাচন করুন।",
                            "ওভার ও ইনিংসের হিসাব মিলিয়ে দেখুন।",
                            "ভুল স্কোর এন্ট্রি হলে সংশোধনের ব্যবস্থা থাকলে সেটি ব্যবহার করুন এবং স্কোর পুনরায় যাচাই করুন।"
                        ]
                    },
                    {
                        title: "ফলাফল সংরক্ষণ",
                        items: [
                            "ম্যাচ শেষ করার আগে চূড়ান্ত স্কোর যাচাই করুন।",
                            "ফলাফল সম্পন্ন করার জন্য পেজে উপলব্ধ নিয়ন্ত্রণ ব্যবহার করুন।",
                            "ম্যাচ শেষ হলে Fixtures & Results এবং Statistics & Awards পেজে প্রাসঙ্গিক তথ্য প্রতিফলিত হয়েছে কি না যাচাই করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Matches & Live Score",
                intro: "Learn how to manage matches, select teams, start innings, and update ball-by-ball scores.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Select or create a match using the methods available in your app.",
                            "Choose both teams and the applicable players.",
                            "Set the toss, batting and bowling teams, and opening players.",
                            "Update the score ball by ball during the match.",
                            "Complete innings and finalize the match result."
                        ]
                    },
                    {
                        title: "Before starting a match",
                        items: [
                            "Select the correct tournament and match.",
                            "Verify both team names and the available squads.",
                            "Set the toss result and first batting team correctly.",
                            "Check the opening batter and bowler details."
                        ]
                    },
                    {
                        title: "Updating the live score",
                        items: [
                            "Record runs according to the actual outcome of each delivery.",
                            "Select boundaries, wickets, extras, and other events accurately.",
                            "Verify the over and innings calculations.",
                            "If score correction is available, use it for incorrect entries and verify the score again."
                        ]
                    },
                    {
                        title: "Saving the result",
                        items: [
                            "Verify the final score before ending the match.",
                            "Use the controls available on the page to finalize the result.",
                            "After completion, check whether relevant information appears in Fixtures & Results and Statistics & Awards."
                        ]
                    }
                ]
            }
        },

        {
            id: "fixtures",
            icon: "fa-solid fa-calendar-days",
            bn: {
                title: "Fixtures & Results — সূচি ও ফলাফল",
                intro: "টুর্নামেন্টের ম্যাচের সূচি, নির্ধারিত ম্যাচ এবং সম্পন্ন ম্যাচের ফলাফল দেখার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "অ্যাপে তৈরি বা সংরক্ষিত ম্যাচের সূচি পর্যালোচনা করুন।",
                            "ম্যাচের দল, নির্ধারিত সময় বা উপলব্ধ অন্যান্য তথ্য দেখুন।",
                            "সম্পন্ন ম্যাচের ফলাফল উপলব্ধ থাকলে তা যাচাই করুন।",
                            "প্রয়োজনে Match Center-এ গিয়ে সংশ্লিষ্ট ম্যাচ পরিচালনা করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Fixtures & Results পেজ খুলুন।",
                            "টুর্নামেন্ট নির্বাচন করার অপশন থাকলে সঠিক টুর্নামেন্ট নির্বাচন করুন।",
                            "ম্যাচের তালিকা ও ফলাফল পর্যালোচনা করুন।",
                            "ম্যাচ পরিচালনা করতে পেজে থাকা প্রাসঙ্গিক অ্যাকশন ব্যবহার করুন।"
                        ]
                    },
                    {
                        title: "ম্যাচের ফলাফল যাচাই",
                        items: [
                            "Match Center-এর চূড়ান্ত স্কোরের সঙ্গে প্রদর্শিত ফলাফল মিলিয়ে দেখুন।",
                            "একই ম্যাচ একাধিকবার তৈরি হয়েছে কি না খেয়াল করুন।",
                            "ফলাফল অনুপস্থিত বা ভুল হলে মূল ম্যাচের তথ্য যাচাই করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Fixtures & Results",
                intro: "Learn how to review tournament schedules, scheduled matches, and completed match results.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Review the match schedule created or stored in the app.",
                            "View team names, scheduled times, and other available match details.",
                            "Check completed match results when available.",
                            "Open Match Center to manage the relevant match when needed."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Fixtures & Results.",
                            "Select the correct tournament if a tournament selector is available.",
                            "Review the match list and results.",
                            "Use the relevant action provided on the page to manage a match."
                        ]
                    },
                    {
                        title: "Checking match results",
                        items: [
                            "Compare displayed results with the final score in Match Center.",
                            "Check for duplicate entries of the same match.",
                            "If a result is missing or incorrect, verify the original match information."
                        ]
                    }
                ]
            }
        },

        {
            id: "standings",
            icon: "fa-solid fa-ranking-star",
            bn: {
                title: "Standings & Playoffs — পয়েন্ট টেবিল ও প্লে-অফ",
                intro: "টুর্নামেন্টের অবস্থান, দলগুলোর পয়েন্ট এবং প্রযোজ্য নকআউট বা প্লে-অফ অগ্রগতি দেখার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "নির্দিষ্ট টুর্নামেন্টের Standings বা দলগুলোর অবস্থান পর্যালোচনা করুন।",
                            "পয়েন্ট টেবিলে প্রদর্শিত ম্যাচ, জয়, হার ও পয়েন্টের তথ্য যাচাই করুন।",
                            "টুর্নামেন্টের ফরম্যাট অনুযায়ী উপলব্ধ প্লে-অফ বা ব্র্যাকেট দেখুন।",
                            "কাস্টম টুর্নামেন্টের ক্ষেত্রে নির্বাচিত ফরম্যাট ও প্রযোজ্য নিয়ম অনুসরণ করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Standings & Playoffs পেজ খুলুন।",
                            "সঠিক টুর্নামেন্ট নির্বাচন করুন।",
                            "দলগুলোর অবস্থান ও প্রদর্শিত পয়েন্ট পর্যালোচনা করুন।",
                            "Pairing বা ম্যাচ তৈরি করার নিয়ন্ত্রণ থাকলে দল ও টুর্নামেন্টের তথ্য যাচাই করে ব্যবহার করুন।",
                            "প্লে-অফ ম্যাচ তৈরি হলে সংশ্লিষ্ট ম্যাচের অগ্রগতি পর্যবেক্ষণ করুন।"
                        ]
                    },
                    {
                        title: "গুরুত্বপূর্ণ যাচাই",
                        items: [
                            "সম্পন্ন ম্যাচের ফলাফল সঠিকভাবে সংরক্ষিত হয়েছে কি না দেখুন।",
                            "পয়েন্ট টেবিলের তথ্য ম্যাচের ফলাফলের সঙ্গে মিলিয়ে নিন।",
                            "প্লে-অফে যাওয়ার যোগ্যতা ও পরবর্তী রাউন্ডের দল নির্বাচনের ক্ষেত্রে টুর্নামেন্টের নির্ধারিত নিয়ম অনুসরণ করুন।",
                            "কোনো পরিবর্তনের পর Standings ও Playoffs আবার পরীক্ষা করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Standings & Playoffs",
                intro: "Learn how to review tournament standings, team points, and applicable knockout or playoff progression.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Review standings for the selected tournament.",
                            "Check the displayed matches, wins, losses, and points.",
                            "View available playoffs or brackets according to the tournament format.",
                            "Follow the selected format and applicable rules for Custom tournaments."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Standings & Playoffs.",
                            "Select the correct tournament.",
                            "Review team positions and displayed points.",
                            "If pairing or match-generation controls are available, verify the team and tournament information before using them.",
                            "Track playoff progression after playoff matches are created."
                        ]
                    },
                    {
                        title: "Important checks",
                        items: [
                            "Verify that completed match results have been saved correctly.",
                            "Compare the standings with the match results.",
                            "Follow the tournament's rules when determining qualifiers and teams advancing to the next round.",
                            "Recheck standings and playoffs after changes."
                        ]
                    }
                ]
            }
        },

        {
            id: "statistics",
            icon: "fa-solid fa-chart-column",
            bn: {
                title: "Statistics & Awards — পরিসংখ্যান ও পুরস্কার",
                intro: "টুর্নামেন্টের পরিসংখ্যান, ব্যাটিং-বোলিংয়ের তথ্য এবং উপলব্ধ পুরস্কারসংক্রান্ত বিবরণ দেখার নির্দেশিকা।",
                sections: [
                    {
                        title: "এই পেজের কাজ",
                        items: [
                            "নির্বাচিত টুর্নামেন্টের সারসংক্ষেপ ও পরিসংখ্যান পর্যালোচনা করুন।",
                            "অ্যাপে উপলব্ধ থাকলে ব্যাটিং ও বোলিংয়ের পারফরম্যান্স দেখুন।",
                            "খেলোয়াড়ের পারফরম্যান্স ও পুরস্কারের তথ্য যাচাই করুন।",
                            "পরিসংখ্যান দেখার সময় কোন টুর্নামেন্ট নির্বাচন করা আছে তা নিশ্চিত করুন।"
                        ]
                    },
                    {
                        title: "কীভাবে ব্যবহার করবেন",
                        items: [
                            "Statistics & Awards পেজ খুলুন।",
                            "টুর্নামেন্ট নির্বাচন করার ফিল্টার থাকলে সঠিক টুর্নামেন্ট নির্বাচন করুন।",
                            "দেখানো পরিসংখ্যান ও খেলোয়াড়ের পারফরম্যান্স পর্যালোচনা করুন।",
                            "পুরস্কার বা র‍্যাঙ্কিং প্রদর্শিত হলে সংশ্লিষ্ট ম্যাচের ফলাফল ও খেলোয়াড়ের তথ্যের সঙ্গে মিলিয়ে দেখুন।"
                        ]
                    },
                    {
                        title: "পরিসংখ্যান সঠিক রাখুন",
                        items: [
                            "ম্যাচের স্কোর ও ফলাফল সঠিকভাবে সংরক্ষিত হওয়া জরুরি।",
                            "অসম্পূর্ণ ম্যাচের তথ্যের কারণে পরিসংখ্যান অসম্পূর্ণ হতে পারে।",
                            "ভুল খেলোয়াড় বা দলের সঙ্গে স্কোর যুক্ত হলে পরিসংখ্যানও ভুল হতে পারে।",
                            "ম্যাচ শেষ করার পরে প্রাসঙ্গিক পরিসংখ্যান আবার যাচাই করুন।"
                        ]
                    }
                ]
            },
            en: {
                title: "Statistics & Awards",
                intro: "Learn how to review tournament statistics, batting and bowling information, and available awards.",
                sections: [
                    {
                        title: "What this page does",
                        items: [
                            "Review summaries and statistics for the selected tournament.",
                            "View batting and bowling performance when available in the app.",
                            "Check player performance and award information.",
                            "Verify which tournament is selected when viewing statistics."
                        ]
                    },
                    {
                        title: "How to use it",
                        items: [
                            "Open Statistics & Awards.",
                            "Select the correct tournament if a tournament filter is available.",
                            "Review the displayed statistics and player performance.",
                            "Compare displayed awards or rankings with the relevant match results and player information."
                        ]
                    },
                    {
                        title: "Keeping statistics accurate",
                        items: [
                            "Match scores and results must be saved correctly.",
                            "Incomplete match information may produce incomplete statistics.",
                            "Scores associated with the wrong player or team may cause incorrect statistics.",
                            "Review the relevant statistics after completing a match."
                        ]
                    }
                ]
            }
        }
    ];

    const aboutContent = {
        bn: {
            title: "MATCHCRAFT Cricket সম্পর্কে",
            description:
                "MATCHCRAFT Cricket হলো ক্রিকেট টুর্নামেন্ট পরিচালনার জন্য তৈরি একটি ব্যবস্থাপনা অ্যাপ। টুর্নামেন্ট, দল, খেলোয়াড়, ম্যাচ, ফলাফল এবং পরিসংখ্যানের মতো উপলব্ধ সুবিধাগুলো ব্যবহার করে আপনার ক্রিকেট প্রতিযোগিতা পরিচালনা করুন।",
            noteTitle: "ব্যবহারের আগে মনে রাখুন",
            note:
                "ম্যাচের স্কোর, ফলাফল, পয়েন্ট টেবিল এবং পরিসংখ্যানের নির্ভুলতা নিশ্চিত করতে তথ্য সঠিকভাবে প্রবেশ করান এবং ম্যাচ শেষ হওয়ার পরে সংশ্লিষ্ট পেজগুলো যাচাই করুন।"
        },
        en: {
            title: "About MATCHCRAFT Cricket",
            description:
                "MATCHCRAFT Cricket is a management app designed for cricket tournaments. Use the available features for tournaments, teams, players, matches, results, and statistics to manage your cricket competitions.",
            noteTitle: "Before you begin",
            note:
                "Enter information accurately and review the relevant pages after a match to help keep scores, results, standings, and statistics consistent."
        }
    };

    let currentLanguage = DEFAULT_LANGUAGE;
    let activeCard = null;

    const escapeHTML = (value) =>
        String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    function getHelpRoot() {
        return document.querySelector("#help");
    }

    function getCardsContainer() {
        return document.querySelector("#helpCardsContainer");
    }

    function renderSections(sections) {
        return sections.map((section) => `
            <div class="mc-help-detail-section">
                <h4 class="mc-help-detail-heading">
                    ${escapeHTML(section.title)}
                </h4>
                <ul class="mc-help-detail-list">
                    ${section.items.map((item) => `
                        <li>${escapeHTML(item)}</li>
                    `).join("")}
                </ul>
            </div>
        `).join("");
    }

    function renderCards() {
        const container = getCardsContainer();
        if (!container) return;

        container.innerHTML = helpGuides.map((guide, index) => {
            const content = guide[currentLanguage];
            const isOpen = activeCard === guide.id;

            return `
                <article
                    class="mc-help-card ${isOpen ? "is-open" : ""}"
                    data-help-card="${escapeHTML(guide.id)}"
                >
                    <button
                        type="button"
                        class="mc-help-card-trigger"
                        aria-expanded="${isOpen}"
                        aria-controls="mc-help-panel-${escapeHTML(guide.id)}"
                        data-help-toggle="${escapeHTML(guide.id)}"
                    >
                        <span class="mc-help-card-icon" aria-hidden="true">
                            <i class="${escapeHTML(guide.icon)}"></i>
                        </span>

                        <span class="mc-help-card-title-wrap">
                            <span class="mc-help-card-title">
                                ${escapeHTML(content.title)}
                            </span>
                            <span class="mc-help-card-intro">
                                ${escapeHTML(content.intro)}
                            </span>
                        </span>

                        <span class="mc-help-chevron" aria-hidden="true">
                            <i class="fa-solid fa-chevron-down"></i>
                        </span>
                    </button>

                    <div
                        class="mc-help-card-panel"
                        id="mc-help-panel-${escapeHTML(guide.id)}"
                        ${isOpen ? "" : "hidden"}
                    >
                        <div class="mc-help-card-content">
                            ${renderSections(content.sections)}
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderAbout() {
        const root = getHelpRoot();
        if (!root) return;

        const content = aboutContent[currentLanguage];

        const title = root.querySelector("[data-help-about-title]");
        const description = root.querySelector("[data-help-about-description]");
        const noteTitle = root.querySelector("[data-help-note-title]");
        const note = root.querySelector("[data-help-note]");

        if (title) title.textContent = content.title;
        if (description) description.textContent = content.description;
        if (noteTitle) noteTitle.textContent = content.noteTitle;
        if (note) note.textContent = content.note;
    }

    function renderLanguageControls() {
        const root = getHelpRoot();
        if (!root) return;

        const button = root.querySelector("[data-help-language-toggle]");
        const languageLabel = root.querySelector("[data-help-language-label]");

        if (button) {
            button.textContent =
                currentLanguage === "bn" ? "English" : "বাংলা";

            button.setAttribute(
                "aria-label",
                currentLanguage === "bn"
                    ? "Switch help guide to English"
                    : "বাংলা নির্দেশিকায় ফিরে যান"
            );

            button.setAttribute("aria-pressed", String(currentLanguage === "en"));
        }

        if (languageLabel) {
            languageLabel.textContent =
                currentLanguage === "bn"
                    ? "বর্তমান ভাষা: বাংলা"
                    : "Current language: English";
        }

        root.setAttribute("lang", currentLanguage === "bn" ? "bn" : "en");
    }

    function renderIntro() {
        const root = getHelpRoot();
        if (!root) return;

        const title = root.querySelector("[data-help-main-title]");
        const description = root.querySelector("[data-help-main-description]");
        const sectionTitle = root.querySelector("[data-help-guide-heading]");

        if (title) {
            title.textContent = currentLanguage === "bn"
                ? "সাহায্য ও ব্যবহার নির্দেশিকা"
                : "Help & User Guide";
        }

        if (description) {
            description.textContent = currentLanguage === "bn"
                ? "সাইডবারের যেকোনো বিভাগ নির্বাচন করে তার ব্যবহারবিধি ও বিস্তারিত নির্দেশনা পড়ুন।"
                : "Select any section below to learn how to use that part of the application.";
        }

        if (sectionTitle) {
            sectionTitle.textContent = currentLanguage === "bn"
                ? "পেজভিত্তিক নির্দেশিকা"
                : "Page-by-Page Guide";
        }
    }

    function renderAll() {
        renderIntro();
        renderLanguageControls();
        renderAbout();
        renderCards();
    }

    function handleHelpClick(event) {
        const languageButton = event.target.closest("[data-help-language-toggle]");

        if (languageButton) {
            currentLanguage = currentLanguage === "bn" ? "en" : "bn";
            renderAll();
            return;
        }

        const cardButton = event.target.closest("[data-help-toggle]");

        if (!cardButton) return;

        const cardId = cardButton.getAttribute("data-help-toggle");

        activeCard = activeCard === cardId ? null : cardId;
        renderCards();
    }

    function initializeHelp() {
        const root = getHelpRoot();
        const container = getCardsContainer();

        // Keep other pages untouched if this page is not present.
        if (!root || !container) return;

        if (root.dataset.mcHelpInitialized === "true") {
            renderAll();
            return;
        }

        root.dataset.mcHelpInitialized = "true";

        // Add the language control only if it does not already exist.
        if (!root.querySelector("[data-help-language-toggle]")) {
            const host =
                root.querySelector("[data-help-language-host]") ||
                root.querySelector(".help-hero") ||
                root.querySelector(".help-header") ||
                root;

            const languageBar = document.createElement("div");
            languageBar.className = "mc-help-language-bar";
            languageBar.innerHTML = `
                <span
                    class="mc-help-language-label"
                    data-help-language-label
                    aria-live="polite"
                ></span>
                <button
                    type="button"
                    class="mc-help-language-button"
                    data-help-language-toggle
                    aria-pressed="false"
                >
                    English
                </button>
            `;

            host.appendChild(languageBar);
        }

        // Keep the existing help section structure and add
        // optional text targets only when matching elements exist.
        root.addEventListener("click", handleHelpClick);

        renderAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeHelp, {
            once: true
        });
    } else {
        initializeHelp();
    }

})();