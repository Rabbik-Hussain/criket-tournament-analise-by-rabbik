/* =========================================================
   MATCHCRAFT CRICKET
   File: tournaments.js

   Tournament types:
   1. BPL / IPL League
   2. T20 Cricket
   3. ODI Cricket
   4. Test Cricket
   5. Your Wish / Custom

   Includes:
   - Type selection
   - Type-specific forms
   - Create, edit and delete
   - LocalStorage persistence

   Fixtures, pairings and playoffs are future modules.
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "matchcraft_cricket_tournaments";
    const APP_ID = "matchcraftTournamentApp";

    const TYPES = {
        franchise: {
            title: "BPL / IPL League",
            shortTitle: "Franchise League",
            description:
                "Create a franchise-style league with configurable match format, points and playoffs.",
            icon: "fa-trophy",
            tag: "LEAGUE"
        },

        t20: {
            title: "T20 Cricket",
            shortTitle: "T20",
            description:
                "Create a 20-over cricket tournament with T20 match settings.",
            icon: "fa-bolt",
            tag: "20 OVERS"
        },

        odi: {
            title: "ODI Cricket",
            shortTitle: "ODI",
            description:
                "Create a one-day tournament with 50-over match settings.",
            icon: "fa-calendar-days",
            tag: "50 OVERS"
        },

        test: {
            title: "Test Cricket",
            shortTitle: "Test",
            description:
                "Create a traditional Test tournament with days and innings settings.",
            icon: "fa-shield-halved",
            tag: "TEST"
        },

        custom: {
            title: "Your Wish",
            shortTitle: "Custom",
            description:
                "Choose your own match format, overs, innings and tournament rules.",
            icon: "fa-sliders",
            tag: "CUSTOM"
        }
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    let selectedType = "";
    let editingId = null;
    let notice = null;

    /* -----------------------------------------------------
       STORAGE
    ----------------------------------------------------- */

    function readTournaments() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return [];
            }

            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(
                "MATCHCRAFT CRICKET: Could not read tournaments.",
                error
            );

            return [];
        }
    }

    function saveTournaments(tournaments) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(tournaments)
            );

            document.dispatchEvent(
                new CustomEvent("matchcraft:datachange")
            );

            return true;
        } catch (error) {
            console.error(
                "MATCHCRAFT CRICKET: Could not save tournaments.",
                error
            );

            showNotice(
                "ডেটা সংরক্ষণ করা যায়নি। ব্রাউজারের স্টোরেজ খালি আছে কি না পরীক্ষা করো।",
                true
            );

            return false;
        }
    }

    function makeId() {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }

        return (
            "tournament-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 10)
        );
    }

    /* -----------------------------------------------------
       SAFE HTML HELPERS
    ----------------------------------------------------- */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[char];
        });
    }

    function selected(value, expected) {
        return String(value ?? "") === String(expected)
            ? "selected"
            : "";
    }

    function checked(value) {
        return value ? "checked" : "";
    }

    function field({
        id,
        label,
        type = "text",
        value = "",
        placeholder = "",
        min,
        max,
        required = false,
        help = "",
        full = false
    }) {
        const attrs = [
            `id="${id}"`,
            `name="${id}"`,
            `type="${type}"`,
            `value="${escapeHTML(value)}"`,
            `placeholder="${escapeHTML(placeholder)}"`
        ];

        if (min !== undefined) {
            attrs.push(`min="${escapeHTML(min)}"`);
        }

        if (max !== undefined) {
            attrs.push(`max="${escapeHTML(max)}"`);
        }

        if (required) {
            attrs.push("required");
        }

        return `
            <div class="tc-field ${full ? "full-width" : ""}">
                <label for="${id}">
                    ${escapeHTML(label)}${required ? " *" : ""}
                </label>
                <input ${attrs.join(" ")}>
                ${help
                    ? `<span class="tc-help">${escapeHTML(help)}</span>`
                    : ""}
            </div>
        `;
    }

    function selectField({
        id,
        label,
        options,
        value,
        required = false,
        full = false,
        help = ""
    }) {
        return `
            <div class="tc-field ${full ? "full-width" : ""}">
                <label for="${id}">
                    ${escapeHTML(label)}${required ? " *" : ""}
                </label>
                <select id="${id}" name="${id}" ${required ? "required" : ""}>
                    ${options.map((option) => `
                        <option
                            value="${escapeHTML(option.value)}"
                            ${selected(value, option.value)}
                        >
                            ${escapeHTML(option.label)}
                        </option>
                    `).join("")}
                </select>
                ${help
                    ? `<span class="tc-help">${escapeHTML(help)}</span>`
                    : ""}
            </div>
        `;
    }

    function checkboxField({
        id,
        label,
        value = false,
        help = ""
    }) {
        return `
            <div class="tc-field">
                <label class="tc-checkbox-field" for="${id}">
                    <input
                        type="checkbox"
                        id="${id}"
                        name="${id}"
                        ${checked(value)}
                    >
                    <span>${escapeHTML(label)}</span>
                </label>
                ${help
                    ? `<span class="tc-help">${escapeHTML(help)}</span>`
                    : ""}
            </div>
        `;
    }

    function textareaField({
        id,
        label,
        value = "",
        placeholder = "",
        full = true,
        help = ""
    }) {
        return `
            <div class="tc-field ${full ? "full-width" : ""}">
                <label for="${id}">${escapeHTML(label)}</label>
                <textarea
                    id="${id}"
                    name="${id}"
                    placeholder="${escapeHTML(placeholder)}"
                >${escapeHTML(value)}</textarea>
                ${help
                    ? `<span class="tc-help">${escapeHTML(help)}</span>`
                    : ""}
            </div>
        `;
    }

    /* -----------------------------------------------------
       PAGE MOUNT
    ----------------------------------------------------- */

    function mount() {
        const section = document.getElementById("tournaments");

        if (!section) {
            console.warn(
                "MATCHCRAFT CRICKET: #tournaments section not found."
            );
            return;
        }

        /*
         * Keep the existing HTML but hide its direct children.
         * This module owns the tournament page UI.
         * Other pages and the footer are not touched.
         */
        Array.from(section.children).forEach((child) => {
            child.hidden = true;
        });

        let app = document.getElementById(APP_ID);

        if (!app) {
            app = document.createElement("div");
            app.id = APP_ID;
            app.className = "tournaments-app";
            section.appendChild(app);
        }

        renderPage();
    }

    /* -----------------------------------------------------
       PAGE RENDER
    ----------------------------------------------------- */

    function renderPage() {
        const app = document.getElementById(APP_ID);

        if (!app) {
            return;
        }

        const tournaments = readTournaments();

        app.innerHTML = `
            <header class="tc-heading">
                <p class="tc-eyebrow">MATCHCRAFT CRICKET</p>
                <h1 class="tc-title">Tournaments &amp; Seasons</h1>
                <p class="tc-description">
                    Choose a tournament format, configure its rules
                    and save your tournament. Fixture generation and
                    match pairing will be added in a later step.
                </p>
            </header>

            <div id="tcNotice" aria-live="polite"></div>

            <section aria-labelledby="tcTypeHeading">
                <h2 class="tc-section-title" id="tcTypeHeading">
                    Choose Tournament Type
                </h2>

                <div class="tc-type-grid">
                    ${Object.entries(TYPES).map(([type, info]) => `
                        <button
                            type="button"
                            class="tc-type-card ${
                                selectedType === type ? "is-selected" : ""
                            }"
                            data-type="${type}"
                            aria-pressed="${selectedType === type}"
                        >
                            <span class="tc-card-top">
                                <span class="tc-card-icon">
                                    <i class="fa-solid ${info.icon}"
                                       aria-hidden="true"></i>
                                </span>
                                <span class="tc-card-tag">
                                    ${escapeHTML(info.tag)}
                                </span>
                            </span>

                            <span class="tc-card-title">
                                ${escapeHTML(info.title)}
                            </span>

                            <span class="tc-card-description">
                                ${escapeHTML(info.description)}
                            </span>

                            <span class="tc-card-action">
                                Select Format <i class="fa-solid fa-arrow-right"
                                    aria-hidden="true"></i>
                            </span>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section
                class="tc-panel"
                id="tcFormPanel"
                ${selectedType ? "" : "hidden"}
                aria-labelledby="tcFormTitle"
            >
                <div class="tc-panel-header">
                    <div>
                        <h2 class="tc-panel-title" id="tcFormTitle">
                            Configure Tournament
                        </h2>
                        <p class="tc-panel-subtitle" id="tcFormSubtitle">
                            Complete the details below.
                        </p>
                    </div>
                </div>

                <div class="tc-notice">
                    Tournament settings are saved in this browser.
                    Pairings, fixtures and live scoring are not generated
                    by this page yet.
                </div>

                <form id="tcTournamentForm">
                    <div id="tcFormFields"></div>

                    <div id="tcFormMessage"
                         class="tc-message"
                         aria-live="polite"></div>

                    <div class="tc-actions">
                        <button type="submit"
                                class="tc-btn tc-btn-primary"
                                id="tcSaveButton">
                            <i class="fa-solid fa-floppy-disk"
                               aria-hidden="true"></i>
                            Save Tournament
                        </button>

                        <button type="button"
                                class="tc-btn tc-btn-secondary"
                                id="tcCancelButton">
                            Cancel
                        </button>
                    </div>
                </form>
            </section>

            <section class="tc-panel" aria-labelledby="tcSavedHeading">
                <div class="tc-list-header">
                    <div>
                        <h2 class="tc-panel-title" id="tcSavedHeading">
                            Saved Tournaments
                        </h2>
                        <p class="tc-panel-subtitle">
                            Tournaments saved on this browser.
                        </p>
                    </div>

                    <span class="tc-count">
                        Total: <strong id="tcTournamentCount">0</strong>
                    </span>
                </div>

                <div class="tc-tournament-list" id="tcTournamentList"></div>
            </section>
        `;

        renderTournamentList();

        if (selectedType) {
            renderForm();
        }

        showNoticeFromState();
    }

    /* -----------------------------------------------------
       TYPE SELECTION
    ----------------------------------------------------- */

    function chooseType(type) {
        if (!TYPES[type]) {
            return;
        }

        selectedType = type;
        editingId = null;
        notice = null;

        renderPage();

        const panel = document.getElementById("tcFormPanel");

        if (panel) {
            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    /* -----------------------------------------------------
       TYPE-SPECIFIC FORM FIELDS
    ----------------------------------------------------- */

    function getFormValues(tournament = {}) {
        return {
            name: tournament.name || "",
            season: tournament.season || String(new Date().getFullYear()),
            totalTeams: tournament.totalTeams ?? 8,
            startDate: tournament.startDate || "",
            endDate: tournament.endDate || "",
            status: tournament.status || "Upcoming",
            matchFormat: tournament.matchFormat || "T20",
            pointsWin: tournament.pointsWin ?? 2,
            pointsTie: tournament.pointsTie ?? 1,
            pointsLoss: tournament.pointsLoss ?? 0,
            playoffs: tournament.playoffs ?? true,
            overs: tournament.overs ?? 20,
            innings: tournament.innings ?? 1,
            powerplayOvers: tournament.powerplayOvers ?? 6,
            maxOversPerBowler: tournament.maxOversPerBowler ?? 4,
            testDays: tournament.testDays ?? 5,
            followOn: tournament.followOn ?? true,
            customFormat: tournament.customFormat || "Limited Overs",
            customOvers: tournament.customOvers ?? 20,
            customInnings: tournament.customInnings ?? 1,
            customRules: tournament.customRules || "",
            notes: tournament.notes || ""
        };
    }

    function renderFormatFields(type, v) {
        if (type === "franchise") {
            return `
                <div class="tc-divider"></div>
                <h3 class="tc-subheading">League Settings</h3>

                <div class="tc-form-grid">
                    ${selectField({
                        id: "tcMatchFormat",
                        label: "League Match Format",
                        value: v.matchFormat,
                        options: [
                            { value: "T20", label: "T20 — 20 Overs" },
                            { value: "ODI", label: "ODI — 50 Overs" },
                            { value: "Custom", label: "Custom Format" }
                        ],
                        required: true
                    })}

                    ${selectField({
                        id: "tcStatus",
                        label: "Tournament Status",
                        value: v.status,
                        options: [
                            { value: "Upcoming", label: "Upcoming" },
                            { value: "Ongoing", label: "Ongoing" },
                            { value: "Completed", label: "Completed" },
                            { value: "Cancelled", label: "Cancelled" }
                        ],
                        required: true
                    })}

                    ${field({
                        id: "tcPointsWin",
                        label: "Points for Win",
                        type: "number",
                        value: v.pointsWin,
                        min: 0,
                        max: 100,
                        required: true
                    })}

                    ${field({
                        id: "tcPointsTie",
                        label: "Points for Tie / No Result",
                        type: "number",
                        value: v.pointsTie,
                        min: 0,
                        max: 100,
                        required: true
                    })}

                    ${field({
                        id: "tcPointsLoss",
                        label: "Points for Loss",
                        type: "number",
                        value: v.pointsLoss,
                        min: 0,
                        max: 100,
                        required: true
                    })}

                    ${checkboxField({
                        id: "tcPlayoffs",
                        label: "Enable Playoffs / Final",
                        value: v.playoffs,
                        help: "This saves the preference only. Playoff fixtures will be implemented later."
                    })}
                </div>
            `;
        }

        if (type === "t20") {
            return `
                <div class="tc-divider"></div>
                <h3 class="tc-subheading">T20 Match Settings</h3>

                <div class="tc-form-grid">
                    ${field({
                        id: "tcOvers",
                        label: "Overs per Innings",
                        type: "number",
                        value: 20,
                        min: 1,
                        max: 50,
                        required: true,
                        help: "Default T20 format is 20 overs."
                    })}

                    ${field({
                        id: "tcInnings",
                        label: "Innings per Team",
                        type: "number",
                        value: 1,
                        min: 1,
                        max: 2,
                        required: true
                    })}

                    ${field({
                        id: "tcPowerplayOvers",
                        label: "Powerplay Overs",
                        type: "number",
                        value: 6,
                        min: 0,
                        max: 20,
                        required: true
                    })}

                    ${field({
                        id: "tcMaxOversPerBowler",
                        label: "Maximum Overs per Bowler",
                        type: "number",
                        value: 4,
                        min: 1,
                        max: 20,
                        required: true
                    })}
                </div>
            `;
        }

        if (type === "odi") {
            return `
                <div class="tc-divider"></div>
                <h3 class="tc-subheading">ODI Match Settings</h3>

                <div class="tc-form-grid">
                    ${field({
                        id: "tcOvers",
                        label: "Overs per Innings",
                        type: "number",
                        value: 50,
                        min: 1,
                        max: 50,
                        required: true,
                        help: "Default ODI format is 50 overs."
                    })}

                    ${field({
                        id: "tcInnings",
                        label: "Innings per Team",
                        type: "number",
                        value: 1,
                        min: 1,
                        max: 2,
                        required: true
                    })}

                    ${field({
                        id: "tcPowerplayOvers",
                        label: "Powerplay Overs",
                        type: "number",
                        value: 10,
                        min: 0,
                        max: 50,
                        required: true
                    })}

                    ${field({
                        id: "tcMaxOversPerBowler",
                        label: "Maximum Overs per Bowler",
                        type: "number",
                        value: 10,
                        min: 1,
                        max: 50,
                        required: true
                    })}
                </div>
            `;
        }

        if (type === "test") {
            return `
                <div class="tc-divider"></div>
                <h3 class="tc-subheading">Test Match Settings</h3>

                <div class="tc-form-grid">
                    ${field({
                        id: "tcTestDays",
                        label: "Maximum Match Days",
                        type: "number",
                        value: 5,
                        min: 1,
                        max: 10,
                        required: true
                    })}

                    ${field({
                        id: "tcInnings",
                        label: "Innings per Team",
                        type: "number",
                        value: 2,
                        min: 1,
                        max: 2,
                        required: true
                    })}

                    ${checkboxField({
                        id: "tcFollowOn",
                        label: "Allow Follow-on",
                        value: true
                    })}
                </div>
            `;
        }

        return `
            <div class="tc-divider"></div>
            <h3 class="tc-subheading">Custom Match Settings</h3>

            <div class="tc-form-grid">
                ${selectField({
                    id: "tcCustomFormat",
                    label: "Match Format",
                    value: v.customFormat,
                    options: [
                        { value: "Limited Overs", label: "Limited Overs" },
                        { value: "T20", label: "T20" },
                        { value: "ODI", label: "ODI" },
                        { value: "Test", label: "Test" },
                        { value: "The Hundred", label: "The Hundred" },
                        { value: "Other", label: "Other / My Rules" }
                    ],
                    required: true
                })}

                ${field({
                    id: "tcCustomOvers",
                    label: "Overs per Innings",
                    type: "number",
                    value: v.customOvers,
                    min: 1,
                    max: 1000,
                    required: true,
                    help: "Set your preferred overs."
                })}

                ${field({
                    id: "tcCustomInnings",
                    label: "Innings per Team",
                    type: "number",
                    value: v.customInnings,
                    min: 1,
                    max: 10,
                    required: true
                })}

                ${textareaField({
                    id: "tcCustomRules",
                    label: "Your Custom Rules",
                    value: v.customRules,
                    placeholder: "Write your own tournament and match rules..."
                })}
            </div>
        `;
    }

    function renderForm(tournament = null) {
        const panel = document.getElementById("tcFormPanel");
        const fields = document.getElementById("tcFormFields");

        if (!panel || !fields || !selectedType) {
            return;
        }

        const v = getFormValues(tournament || {});
        const info = TYPES[selectedType];

        panel.hidden = false;

        $("#tcFormTitle").textContent = editingId
            ? `Edit: ${info.title}`
            : `Create ${info.title} Tournament`;

        $("#tcFormSubtitle").textContent = info.description;

        fields.innerHTML = `
            <h3 class="tc-subheading">Tournament Information</h3>

            <div class="tc-form-grid">
                ${field({
                    id: "tcName",
                    label: "Tournament Name",
                    value: v.name,
                    placeholder: "e.g. City Cricket Championship",
                    required: true
                })}

                ${field({
                    id: "tcSeason",
                    label: "Season / Year",
                    value: v.season,
                    placeholder: String(new Date().getFullYear()),
                    required: true
                })}

                ${field({
                    id: "tcTotalTeams",
                    label: "Number of Teams",
                    type: "number",
                    value: v.totalTeams,
                    min: 2,
                    max: 1000,
                    required: true,
                    help: "At least 2 teams are required. No fixed tournament team limit is imposed by this form."
                })}

                ${selectField({
                    id: "tcStatus",
                    label: "Tournament Status",
                    value: v.status,
                    options: [
                        { value: "Upcoming", label: "Upcoming" },
                        { value: "Ongoing", label: "Ongoing" },
                        { value: "Completed", label: "Completed" },
                        { value: "Cancelled", label: "Cancelled" }
                    ],
                    required: true
                })}

                ${field({
                    id: "tcStartDate",
                    label: "Start Date",
                    type: "date",
                    value: v.startDate
                })}

                ${field({
                    id: "tcEndDate",
                    label: "End Date",
                    type: "date",
                    value: v.endDate
                })}
            </div>

            ${renderFormatFields(selectedType, v)}

            <div class="tc-divider"></div>

            <div class="tc-form-grid">
                ${textareaField({
                    id: "tcNotes",
                    label: "Additional Notes",
                    value: v.notes,
                    placeholder: "Optional notes for this tournament..."
                })}
            </div>
        `;

        /*
         * There is one shared status field in the common section.
         * The franchise-specific section does not create a duplicate.
         */
        const saveButton = $("#tcSaveButton");
        if (saveButton) {
            saveButton.innerHTML = editingId
                ? '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Update Tournament'
                : '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save Tournament';
        }
    }

    /* -----------------------------------------------------
       FORM READ / VALIDATION
    ----------------------------------------------------- */

    function readNumber(id, fallback = 0) {
        const element = document.getElementById(id);

        if (!element || element.value.trim() === "") {
            return fallback;
        }

        return Number(element.value);
    }

    function readValue(id, fallback = "") {
        const element = document.getElementById(id);
        return element ? element.value.trim() : fallback;
    }

    function readChecked(id, fallback = false) {
        const element = document.getElementById(id);
        return element ? element.checked : fallback;
    }

    function collectFormData() {
        const existing = editingId
            ? readTournaments().find((item) => item.id === editingId)
            : null;

        const info = TYPES[selectedType];

        if (!info) {
            throw new Error("Please select a tournament type.");
        }

        const name = readValue("tcName");
        const season = readValue("tcSeason");
        const totalTeams = readNumber("tcTotalTeams", 0);
        const startDate = readValue("tcStartDate");
        const endDate = readValue("tcEndDate");
        const status = readValue("tcStatus", "Upcoming");
        const notes = readValue("tcNotes");

        if (!name) {
            throw new Error("টুর্নামেন্টের নাম লিখতে হবে।");
        }

        if (!season) {
            throw new Error("সিজন / বছর লিখতে হবে।");
        }

        if (
            !Number.isInteger(totalTeams) ||
            totalTeams < 2 ||
            totalTeams > 1000
        ) {
            throw new Error(
                "দলের সংখ্যা ২ থেকে ১০০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে।"
            );
        }

        if (startDate && endDate && endDate < startDate) {
            throw new Error(
                "শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।"
            );
        }

        const data = {
            id: editingId || makeId(),
            name,
            season,
            type: selectedType,
            typeLabel: info.shortTitle,
            totalTeams,
            startDate,
            endDate,
            status,
            notes,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (selectedType === "franchise") {
            data.matchFormat = readValue("tcMatchFormat", "T20");
            data.pointsWin = readNumber("tcPointsWin", 2);
            data.pointsTie = readNumber("tcPointsTie", 1);
            data.pointsLoss = readNumber("tcPointsLoss", 0);
            data.playoffs = readChecked("tcPlayoffs", true);

            if (
                [data.pointsWin, data.pointsTie, data.pointsLoss]
                    .some((value) => !Number.isFinite(value) || value < 0)
            ) {
                throw new Error("পয়েন্টের মান শূন্য বা তার বেশি হতে হবে।");
            }
        }

        if (selectedType === "t20" || selectedType === "odi") {
            const defaults = selectedType === "t20"
                ? { overs: 20, powerplay: 6, bowler: 4 }
                : { overs: 50, powerplay: 10, bowler: 10 };

            data.overs = readNumber("tcOvers", defaults.overs);
            data.innings = readNumber("tcInnings", 1);
            data.powerplayOvers = readNumber(
                "tcPowerplayOvers",
                defaults.powerplay
            );
            data.maxOversPerBowler = readNumber(
                "tcMaxOversPerBowler",
                defaults.bowler
            );

            if (
                !Number.isInteger(data.overs) ||
                data.overs < 1 ||
                data.overs > defaults.overs
            ) {
                throw new Error(
                    `এই ফরম্যাটে ওভারের সংখ্যা ১ থেকে ${defaults.overs}-এর মধ্যে হতে হবে।`
                );
            }

            if (
                !Number.isInteger(data.innings) ||
                data.innings < 1 ||
                data.innings > 2
            ) {
                throw new Error("ইনিংসের সংখ্যা ১ অথবা ২ হতে হবে।");
            }

            if (
                !Number.isInteger(data.powerplayOvers) ||
                data.powerplayOvers < 0 ||
                data.powerplayOvers > data.overs
            ) {
                throw new Error(
                    "পাওয়ারপ্লে ওভার ম্যাচের মোট ওভারের মধ্যে হতে হবে।"
                );
            }

            if (
                !Number.isInteger(data.maxOversPerBowler) ||
                data.maxOversPerBowler < 1 ||
                data.maxOversPerBowler > data.overs
            ) {
                throw new Error(
                    "একজন বোলারের ওভারের সংখ্যা বৈধ হতে হবে।"
                );
            }
        }

        if (selectedType === "test") {
            data.testDays = readNumber("tcTestDays", 5);
            data.innings = readNumber("tcInnings", 2);
            data.followOn = readChecked("tcFollowOn", true);

            if (
                !Number.isInteger(data.testDays) ||
                data.testDays < 1 ||
                data.testDays > 10
            ) {
                throw new Error(
                    "টেস্ট ম্যাচের দিন ১ থেকে ১০-এর মধ্যে হতে হবে।"
                );
            }

            if (
                !Number.isInteger(data.innings) ||
                data.innings < 1 ||
                data.innings > 2
            ) {
                throw new Error("ইনিংসের সংখ্যা ১ অথবা ২ হতে হবে।");
            }
        }

        if (selectedType === "custom") {
            data.customFormat = readValue(
                "tcCustomFormat",
                "Limited Overs"
            );
            data.customOvers = readNumber("tcCustomOvers", 20);
            data.customInnings = readNumber("tcCustomInnings", 1);
            data.customRules = readValue("tcCustomRules");

            if (
                !Number.isInteger(data.customOvers) ||
                data.customOvers < 1 ||
                data.customOvers > 1000
            ) {
                throw new Error(
                    "কাস্টম ওভার ১ থেকে ১০০০-এর মধ্যে হতে হবে।"
                );
            }

            if (
                !Number.isInteger(data.customInnings) ||
                data.customInnings < 1 ||
                data.customInnings > 10
            ) {
                throw new Error(
                    "কাস্টম ইনিংস ১ থেকে ১০-এর মধ্যে হতে হবে।"
                );
            }
        }

        return data;
    }

    /* -----------------------------------------------------
       SAVE TOURNAMENT
    ----------------------------------------------------- */

    function handleSubmit(event) {
        event.preventDefault();

        const form = $("#tcTournamentForm");

        if (!form || !form.reportValidity()) {
            return;
        }

        try {
            const tournament = collectFormData();
            const tournaments = readTournaments();

            const duplicate = tournaments.some((item) => {
                return (
                    item.id !== tournament.id &&
                    item.name.trim().toLowerCase() ===
                        tournament.name.trim().toLowerCase() &&
                    String(item.season) === String(tournament.season)
                );
            });

            if (duplicate) {
                showFormMessage(
                    "এই নাম ও সিজনের টুর্নামেন্ট আগে থেকেই রয়েছে।",
                    true
                );
                return;
            }

            let updated;

            if (editingId) {
                updated = tournaments.map((item) =>
                    item.id === editingId ? tournament : item
                );
            } else {
                updated = [...tournaments, tournament];
            }

            if (!saveTournaments(updated)) {
                return;
            }

            const wasEditing = Boolean(editingId);

            editingId = null;
            selectedType = "";
            notice = {
                text: wasEditing
                    ? "টুর্নামেন্টের তথ্য আপডেট হয়েছে।"
                    : "নতুন টুর্নামেন্ট সফলভাবে সংরক্ষণ হয়েছে।",
                error: false
            };

            renderPage();
        } catch (error) {
            showFormMessage(
                error.message || "টুর্নামেন্ট সংরক্ষণ করা যায়নি।",
                true
            );
        }
    }

    /* -----------------------------------------------------
       EDIT / DELETE
    ----------------------------------------------------- */

    function editTournament(id) {
        const tournament = readTournaments().find(
            (item) => item.id === id
        );

        if (!tournament || !TYPES[tournament.type]) {
            showNotice(
                "টুর্নামেন্টটি খুঁজে পাওয়া যায়নি।",
                true
            );
            return;
        }

        selectedType = tournament.type;
        editingId = tournament.id;
        notice = null;

        renderPage();
        renderForm(tournament);

        $("#tcFormPanel")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function deleteTournament(id) {
        const tournaments = readTournaments();
        const tournament = tournaments.find(
            (item) => item.id === id
        );

        if (!tournament) {
            showNotice("টুর্নামেন্টটি পাওয়া যায়নি।", true);
            return;
        }

        const confirmed = window.confirm(
            `“${tournament.name}” টুর্নামেন্টটি মুছে ফেলতে চাও?`
        );

        if (!confirmed) {
            return;
        }

        const updated = tournaments.filter(
            (item) => item.id !== id
        );

        if (!saveTournaments(updated)) {
            return;
        }

        if (editingId === id) {
            editingId = null;
            selectedType = "";
        }

        notice = {
            text: "টুর্নামেন্ট মুছে ফেলা হয়েছে।",
            error: false
        };

        renderPage();
    }

    function cancelForm() {
        selectedType = "";
        editingId = null;
        notice = null;
        renderPage();
    }

    /* -----------------------------------------------------
       RENDER SAVED TOURNAMENTS
    ----------------------------------------------------- */

    function renderTournamentList() {
        const list = $("#tcTournamentList");
        const count = $("#tcTournamentCount");

        if (!list || !count) {
            return;
        }

        const tournaments = readTournaments();

        count.textContent = String(tournaments.length);

        if (!tournaments.length) {
            list.innerHTML = `
                <div class="tc-empty">
                    <i class="fa-solid fa-trophy"
                       aria-hidden="true"></i>
                    <br>
                    এখনো কোনো টুর্নামেন্ট তৈরি করা হয়নি।
                    <br>
                    উপরের পাঁচটি কার্ডের যেকোনো একটি বেছে শুরু করো।
                </div>
            `;
            return;
        }

        list.innerHTML = tournaments
            .slice()
            .sort((a, b) =>
                String(b.updatedAt || "").localeCompare(
                    String(a.updatedAt || "")
                )
            )
            .map((tournament) => {
                const type = TYPES[tournament.type];
                const typeLabel = type
                    ? type.shortTitle
                    : tournament.typeLabel || "Tournament";

                const formatLabel = getFormatSummary(tournament);

                return `
                    <article class="tc-tournament-item">
                        <div class="tc-item-top">
                            <div>
                                <h3 class="tc-item-title">
                                    ${escapeHTML(tournament.name)}
                                </h3>
                                <div class="tc-item-meta">
                                    ${escapeHTML(typeLabel)}
                                    · Season ${escapeHTML(tournament.season)}
                                    <br>
                                    ${escapeHTML(formatLabel)}
                                    <br>
                                    ${escapeHTML(tournament.totalTeams)} teams
                                    ${tournament.startDate
                                        ? `<br>Start: ${escapeHTML(tournament.startDate)}`
                                        : ""}
                                    ${tournament.endDate
                                        ? `<br>End: ${escapeHTML(tournament.endDate)}`
                                        : ""}
                                </div>
                            </div>

                            <span class="tc-status"
                                  data-status="${escapeHTML(tournament.status)}">
                                ${escapeHTML(tournament.status)}
                            </span>
                        </div>

                        <div class="tc-actions">
                            <button
                                type="button"
                                class="tc-btn tc-btn-secondary"
                                data-action="edit"
                                data-id="${escapeHTML(tournament.id)}"
                            >
                                <i class="fa-solid fa-pen"
                                   aria-hidden="true"></i>
                                Edit
                            </button>

                            <button
                                type="button"
                                class="tc-btn tc-btn-danger"
                                data-action="delete"
                                data-id="${escapeHTML(tournament.id)}"
                            >
                                <i class="fa-solid fa-trash"
                                   aria-hidden="true"></i>
                                Delete
                            </button>
                        </div>
                    </article>
                `;
            }).join("");
    }

    function getFormatSummary(tournament) {
        switch (tournament.type) {
            case "franchise":
                return `${tournament.matchFormat || "T20"} League`;

            case "t20":
                return `${tournament.overs ?? 20} overs per innings`;

            case "odi":
                return `${tournament.overs ?? 50} overs per innings`;

            case "test":
                return `${tournament.testDays ?? 5} days · Test`;

            case "custom":
                return `${tournament.customFormat || "Custom"} · ${tournament.customOvers ?? 20} overs`;

            default:
                return "Custom format";
        }
    }

    /* -----------------------------------------------------
       NOTICES
    ----------------------------------------------------- */

    function showNotice(message, isError = false) {
        notice = {
            text: message,
            error: isError
        };

        showNoticeFromState();
    }

    function showNoticeFromState() {
        const container = $("#tcNotice");

        if (!container) {
            return;
        }

        if (!notice) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = `
            <div class="tc-notice ${notice.error ? "error" : ""}"
                 role="${notice.error ? "alert" : "status"}">
                ${escapeHTML(notice.text)}
            </div>
        `;
    }

    function showFormMessage(message, isError = false) {
        const element = $("#tcFormMessage");

        if (!element) {
            showNotice(message, isError);
            return;
        }

        element.textContent = message;
        element.classList.toggle("error", isError);
    }

    /* -----------------------------------------------------
       EVENT HANDLERS
    ----------------------------------------------------- */

    document.addEventListener("click", (event) => {
        const typeCard = event.target.closest(
            "#matchcraftTournamentApp [data-type]"
        );

        if (typeCard) {
            chooseType(typeCard.dataset.type);
            return;
        }

        const actionButton = event.target.closest(
            "#matchcraftTournamentApp [data-action]"
        );

        if (actionButton) {
            const id = actionButton.dataset.id;

            if (actionButton.dataset.action === "edit") {
                editTournament(id);
            }

            if (actionButton.dataset.action === "delete") {
                deleteTournament(id);
            }

            return;
        }

        if (event.target.closest("#tcCancelButton")) {
            cancelForm();
        }
    });

    document.addEventListener("submit", (event) => {
        if (event.target.id === "tcTournamentForm") {
            handleSubmit(event);
        }
    });

    /* -----------------------------------------------------
       INITIALIZATION
    ----------------------------------------------------- */

    function initialize() {
        mount();

        /*
         * Re-render only when this page is active.
         * Do not replace page content while it is being edited
         * on another hidden page.
         */
        document.addEventListener(
            "matchcraft:pagechange",
            (event) => {
                if (event.detail?.page === "tournaments") {
                    const app = document.getElementById(APP_ID);

                    if (!app) {
                        mount();
                    }
                }
            }
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();