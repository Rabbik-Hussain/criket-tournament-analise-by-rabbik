/* =========================================================
   MATCHCRAFT CRICKET
   File: desboard.js
   Dashboard, Navigation & LocalStorage Overview
========================================================= */

(() => {
    "use strict";

    /* -----------------------------------------------------
       1. DOM ELEMENTS
    ----------------------------------------------------- */

   const pageSections = [
    "dashboard",
    "tournaments",
    "teams",
    "players",
    "matches",
    "features",
    "fixtures",
    "standings",
    "statistics",
    "help"
];

    const sidebarLinks = document.querySelectorAll(
        ".sidebar_menu .menu a[data-page]"
    );

    const pageButtons = document.querySelectorAll(
        "[data-page]"
    );

    const mobileMenuCheckbox = document.getElementById("check");
    const mobilePageTitle = document.querySelector(".mobile-page-title");

    const dashboardElements = {
        tournaments: document.getElementById("totalTournaments"),
        teams: document.getElementById("totalTeams"),
        players: document.getElementById("totalPlayers"),
        matches: document.getElementById("totalMatches")
    };

    /* -----------------------------------------------------
       2. PAGE TITLES
    ----------------------------------------------------- */

   const pageTitles = {
    dashboard: "Dashboard",
    tournaments: "Tournaments & Seasons",
    teams: "Teams & Squads",
    players: "Players & Roles",
    matches: "Matches & Live Score",
    features: "Features",
    fixtures: "Fixtures & Results",
    standings: "Standings & Playoffs",
    statistics: "Statistics & Awards",
    help: "About & Help"
};

    /* -----------------------------------------------------
       3. SAFE LOCALSTORAGE HELPERS
    ----------------------------------------------------- */

    function readStorage(key) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) {
                return null;
            }

            return JSON.parse(value);
        } catch (error) {
            console.warn(
                `MATCHCRAFT CRICKET: Could not read "${key}".`,
                error
            );

            return null;
        }
    }

    function isRecord(value) {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }

    function countRecords(keys) {
        for (const key of keys) {
            const data = readStorage(key);

            if (Array.isArray(data)) {
                return data.length;
            }

            if (isRecord(data)) {
                /*
                 * Recognize common object containers without
                 * counting arbitrary settings as records.
                 */
                const collectionKeys = [
                    "items",
                    "data",
                    "records",
                    "tournaments",
                    "teams",
                    "players",
                    "matches"
                ];

                for (const collectionKey of collectionKeys) {
                    if (Array.isArray(data[collectionKey])) {
                        return data[collectionKey].length;
                    }
                }
            }
        }

        return 0;
    }

    function formatCount(value) {
        return String(Math.max(0, Number(value) || 0))
            .padStart(2, "0");
    }

    /* -----------------------------------------------------
       4. DASHBOARD STATISTICS
       
       These are candidate storage keys. As each module is
       implemented, its actual storage key should be added
       here if it uses a different name.
    ----------------------------------------------------- */

    function updateDashboardStats() {
        const counts = {
            tournaments: countRecords([
                "matchcraft_cricket_tournaments",
                "cricketTournaments",
                "tournaments"
            ]),

            teams: countRecords([
                "matchcraft_cricket_teams",
                "cricketTeams",
                "teams"
            ]),

            players: countRecords([
                "matchcraft_cricket_players",
                "cricketPlayers",
                "players"
            ]),

            matches: countRecords([
                "matchcraft_cricket_matches",
                "cricketMatches",
                "matches"
            ])
        };

        Object.entries(dashboardElements).forEach(
            ([key, element]) => {
                if (element) {
                    element.textContent = formatCount(counts[key]);
                }
            }
        );
    }

    /* -----------------------------------------------------
       5. PAGE NAVIGATION
    ----------------------------------------------------- */

    function showPage(pageId) {
        if (!pageSections.includes(pageId)) {
            console.warn(
                `MATCHCRAFT CRICKET: Unknown page "${pageId}".`
            );

            return;
        }

        const targetSection = document.getElementById(pageId);

        if (!targetSection) {
            console.warn(
                `MATCHCRAFT CRICKET: Section "${pageId}" was not found.`
            );

            return;
        }

        /*
         * Hide all known page sections first.
         * This prevents one page's content from appearing
         * inside another page.
         */
        pageSections.forEach((sectionId) => {
            const section = document.getElementById(sectionId);

            if (section) {
                section.hidden = sectionId !== pageId;
            }
        });

        /* Update the active sidebar link. */
        sidebarLinks.forEach((link) => {
            const isActive = link.dataset.page === pageId;

            link.classList.toggle("active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        /* Update the mobile header title if it exists. */
        if (mobilePageTitle) {
            mobilePageTitle.textContent =
                pageTitles[pageId] || "MATCHCRAFT CRICKET";
        }

        /* Close the mobile sidebar after navigation. */
        if (mobileMenuCheckbox) {
            mobileMenuCheckbox.checked = false;
        }

        /* Refresh dashboard numbers when returning to it. */
        if (pageId === "dashboard") {
            updateDashboardStats();
        }

        /*
         * Notify future page modules that a page was opened.
         * Other modules can listen for this event when needed.
         */
        document.dispatchEvent(
            new CustomEvent("matchcraft:pagechange", {
                detail: { page: pageId }
            })
        );

        window.scrollTo({
            top: 0,
            behavior: "auto"
        });
    }

    /* -----------------------------------------------------
       6. SIDEBAR & QUICK ACTIONS
    ----------------------------------------------------- */

    pageButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const pageId = button.dataset.page;

            if (!pageId || !pageSections.includes(pageId)) {
                return;
            }

            /*
             * Prevent unwanted anchor navigation for links
             * that point to an internal application page.
             */
            if (button.tagName.toLowerCase() === "a") {
                event.preventDefault();
            }

            showPage(pageId);
        });
    });

    /* -----------------------------------------------------
       7. DASHBOARD INITIALIZATION
    ----------------------------------------------------- */

    function initializeDashboard() {
        updateDashboardStats();

        /*
         * Ensure the dashboard is the initial page.
         * The footer is outside the page sections and remains
         * untouched.
         */
        showPage("dashboard");
    }

    /* -----------------------------------------------------
       8. STORAGE UPDATE LISTENER
       
       Refreshes the dashboard when LocalStorage changes in
       another browser tab. Same-tab modules can dispatch
       "matchcraft:datachange" after saving their data.
    ----------------------------------------------------- */

    window.addEventListener("storage", (event) => {
        if (event.key === null || event.key !== "") {
            updateDashboardStats();
        }
    });

    document.addEventListener(
        "matchcraft:datachange",
        updateDashboardStats
    );

    /* -----------------------------------------------------
       9. START APPLICATION
    ----------------------------------------------------- */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard,
            { once: true }
        );
    } else {
        initializeDashboard();
    }

})();