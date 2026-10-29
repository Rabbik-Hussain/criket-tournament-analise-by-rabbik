/* =========================================================
   MATCHCRAFT CRICKET
   File: tournaments.js

   Tournament types:
   1. BPL / IPL League
   2. T20 Cricket
   3. ODI Cricket
   4. Test Cricket
   5. Your Wish / Custom

   Custom Tournament Formats:
   - League
   - Knockout
   - Group + Knockout

   Includes:
   - Tournament type selection
   - Type-specific match settings
   - Custom tournament structure
   - User-defined number of groups
   - Create, edit and delete
   - LocalStorage persistence
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "matchcraft_cricket_tournaments";
    const APP_ID = "matchcraftTournamentApp";

    const TYPES = {
        franchise: {
            title: "BPL / IPL League",
            shortTitle: "Franchise League",
            description: "Create a franchise-style league with configurable match format, points and playoffs.",
            icon: "fa-trophy",
            tag: "LEAGUE"
        },
        t20: {
            title: "T20 Cricket",
            shortTitle: "T20",
            description: "Create a 20-over cricket tournament with T20 match settings.",
            icon: "fa-bolt",
            tag: "20 OVERS"
        },
        odi: {
            title: "ODI Cricket",
            shortTitle: "ODI",
            description: "Create a one-day tournament with 50-over match settings.",
            icon: "fa-calendar-days",
            tag: "50 OVERS"
        },
        test: {
            title: "Test Cricket",
            shortTitle: "Test",
            description: "Create a traditional Test tournament with days and innings settings.",
            icon: "fa-shield-halved",
            tag: "TEST"
        },
        custom: {
            title: "Your Wish",
            shortTitle: "Custom",
            description: "Choose your own match format, tournament structure, overs and innings.",
            icon: "fa-sliders",
            tag: "CUSTOM"
        }
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    let selectedType = "";
    let editingId = null;
    let notice = null;

    /* STORAGE */

    function readTournaments() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];

            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("MATCHCRAFT: Could not read tournaments.", error);
            return [];
        }
    }

    function saveTournaments(tournaments) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));

            document.dispatchEvent(
                new CustomEvent("matchcraft:datachange")
            );

            return true;
        } catch (error) {
            console.error("MATCHCRAFT: Could not save tournaments.", error);
            showNotice(
                "ডেটা সংরক্ষণ করা যায়নি। ব্রাউজারের স্টোরেজ পরীক্ষা করো।",
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

        return "tournament-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 10);
    }

    /* SAFE HTML */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
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

        if (min !== undefined) attrs.push(`min="${min}"`);
        if (max !== undefined) attrs.push(`max="${max}"`);
        if (required) attrs.push("required");

        return `
            <div class="tc-field ${full ? "full-width" : ""}">
                <label for="${id}">
                    ${escapeHTML(label)}${required ? " *" : ""}
                </label>
                <input ${attrs.join(" ")}>
                ${help ? `<span class="tc-help">${escapeHTML(help)}</span>` : ""}
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
                    ${options.map(option => `
                        <option value="${escapeHTML(option.value)}"
                            ${selected(value, option.value)}>
                            ${escapeHTML(option.label)}
                        </option>
                    `).join("")}
                </select>
                ${help ? `<span class="tc-help">${escapeHTML(help)}</span>` : ""}
            </div>
        `;
    }

    function checkboxField({ id, label, value = false, help = "" }) {
        return `
            <div class="tc-field">
                <label class="tc-checkbox-field" for="${id}">
                    <input type="checkbox" id="${id}" name="${id}"
                        ${checked(value)}>
                    <span>${escapeHTML(label)}</span>
                </label>
                ${help ? `<span class="tc-help">${escapeHTML(help)}</span>` : ""}
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
                <textarea id="${id}" name="${id}"
                    placeholder="${escapeHTML(placeholder)}">${escapeHTML(value)}</textarea>
                ${help ? `<span class="tc-help">${escapeHTML(help)}</span>` : ""}
            </div>
        `;
    }

    /* MOUNT */

    function mount() {
        const section = document.getElementById("tournaments");

        if (!section) {
            console.warn("MATCHCRAFT: #tournaments section not found.");
            return;
        }

        Array.from(section.children).forEach(child => {
            if (child.id !== APP_ID) child.hidden = true;
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

    /* PAGE */

    function renderPage() {
        const app = document.getElementById(APP_ID);
        if (!app) return;

        app.innerHTML = `
            <header class="tc-heading">
                <p class="tc-eyebrow">MATCHCRAFT CRICKET</p>
                <h1 class="tc-title">Tournaments &amp; Seasons</h1>
                <p class="tc-description">
                    Choose a tournament type, configure its match rules
                    and save your tournament settings.
                </p>
            </header>

            <div id="tcNotice" aria-live="polite"></div>

            <section aria-labelledby="tcTypeHeading">
                <h2 class="tc-section-title" id="tcTypeHeading">
                    Choose Tournament Type
                </h2>

                <div class="tc-type-grid">
                    ${Object.entries(TYPES).map(([type, info]) => `
                        <button type="button"
                            class="tc-type-card ${selectedType === type ? "is-selected" : ""}"
                            data-type="${type}"
                            aria-pressed="${selectedType === type}">
                            <span class="tc-card-top">
                                <span class="tc-card-icon">
                                    <i class="fa-solid ${info.icon}" aria-hidden="true"></i>
                                </span>
                                <span class="tc-card-tag">${escapeHTML(info.tag)}</span>
                            </span>
                            <span class="tc-card-title">${escapeHTML(info.title)}</span>
                            <span class="tc-card-description">${escapeHTML(info.description)}</span>
                            <span class="tc-card-action">
                                Select Format
                                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                            </span>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="tc-panel" id="tcFormPanel"
                ${selectedType ? "" : "hidden"}
                aria-labelledby="tcFormTitle">
                <div class="tc-panel-header">
                    <div>
                        <h2 class="tc-panel-title" id="tcFormTitle">
                            Configure Tournament
                        </h2>
                        <p class="tc-panel-subtitle" id="tcFormSubtitle"></p>
                    </div>
                </div>

                <div class="tc-notice">
                    Tournament settings are saved in this browser.
                    Fixture generation and playoffs are handled by their respective modules.
                </div>

                <form id="tcTournamentForm">
                    <div id="tcFormFields"></div>
                    <div id="tcFormMessage" class="tc-message"
                        aria-live="polite"></div>

                    <div class="tc-actions">
                        <button type="submit" class="tc-btn tc-btn-primary"
                            id="tcSaveButton">
                            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                            Save Tournament
                        </button>
                        <button type="button" class="tc-btn tc-btn-secondary"
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

        if (selectedType) renderForm();

        showNoticeFromState();
    }

    function chooseType(type) {
        if (!TYPES[type]) return;

        selectedType = type;
        editingId = null;
        notice = null;

        renderPage();

        $("#tcFormPanel")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    /* FORM VALUES */

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
            tournamentFormat: tournament.tournamentFormat || "knockout",
            numberOfGroups: tournament.numberOfGroups ?? 2,
            notes: tournament.notes || ""
        };
    }

    /* TYPE-SPECIFIC FIELDS */

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
                        value: v.playoffs
                    })}
                </div>
            `;
        }

        if (type === "t20" || type === "odi") {
            const isT20 = type === "t20";
            const defaultOvers = isT20 ? 20 : 50;
            const defaultPowerplay = isT20 ? 6 : 10;
            const defaultBowlerOvers = isT20 ? 4 : 10;

            return `
                <div class="tc-divider"></div>
                <h3 class="tc-subheading">${isT20 ? "T20" : "ODI"} Match Settings</h3>
                <div class="tc-form-grid">
                    ${field({
                        id: "tcOvers",
                        label: "Overs per Innings",
                        type: "number",
                        value: v.overs === defaultOvers ? defaultOvers : v.overs,
                        min: 1,
                        max: defaultOvers,
                        required: true
                    })}
                    ${field({
                        id: "tcInnings",
                        label: "Innings per Team",
                        type: "number",
                        value: v.innings,
                        min: 1,
                        max: 2,
                        required: true
                    })}
                    ${field({
                        id: "tcPowerplayOvers",
                        label: "Powerplay Overs",
                        type: "number",
                        value: defaultPowerplay,
                        min: 0,
                        max: defaultOvers,
                        required: true
                    })}
                    ${field({
                        id: "tcMaxOversPerBowler",
                        label: "Maximum Overs per Bowler",
                        type: "number",
                        value: defaultBowlerOvers,
                        min: 1,
                        max: defaultOvers,
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
                        value: v.testDays,
                        min: 1,
                        max: 10,
                        required: true
                    })}
                    ${field({
                        id: "tcInnings",
                        label: "Innings per Team",
                        type: "number",
                        value: v.innings === 1 ? 2 : v.innings,
                        min: 1,
                        max: 2,
                        required: true
                    })}
                    ${checkboxField({
                        id: "tcFollowOn",
                        label: "Allow Follow-on",
                        value: v.followOn
                    })}
                </div>
            `;
        }

        const tournamentFormat = v.tournamentFormat || "knockout";
        const needsGroups = tournamentFormat === "group-knockout";

        return `
            <div class="tc-divider"></div>
            <h3 class="tc-subheading">Custom Tournament Settings</h3>

            <div class="tc-form-grid">
                ${selectField({
                    id: "tcTournamentFormat",
                    label: "Tournament Format",
                    value: tournamentFormat,
                    options: [
                        { value: "league", label: "League" },
                        { value: "knockout", label: "Knockout" },
                        { value: "group-knockout", label: "Group + Knockout" }
                    ],
                    required: true,
                    help: "This is the tournament structure, separate from the cricket match format."
                })}

                <div class="tc-field ${needsGroups ? "" : ""}"
                    id="tcGroupsWrapper" ${needsGroups ? "" : "hidden"}>
                    ${field({
                        id: "tcNumberOfGroups",
                        label: "Number of Groups",
                        type: "number",
                        value: v.numberOfGroups,
                        min: 2,
                        max: v.totalTeams,
                        required: needsGroups,
                        help: "Choose any valid group count. Each group must contain at least two teams."
                    })}
                </div>

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
                    required: true
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
                    label: "Your Custom Match Rules",
                    value: v.customRules,
                    placeholder: "Write any additional cricket match rules..."
                })}
            </div>
        `;
    }

    function renderForm(tournament = null) {
        const panel = $("#tcFormPanel");
        const fieldsContainer = $("#tcFormFields");

        if (!panel || !fieldsContainer || !selectedType) return;

        const v = getFormValues(tournament || {});
        const info = TYPES[selectedType];

        panel.hidden = false;

        $("#tcFormTitle").textContent = editingId
            ? `Edit: ${info.title}`
            : `Create ${info.title} Tournament`;

        $("#tcFormSubtitle").textContent = info.description;

        fieldsContainer.innerHTML = `
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
                    required: true
                })}
                ${field({
                    id: "tcTotalTeams",
                    label: "Number of Teams",
                    type: "number",
                    value: v.totalTeams,
                    min: 2,
                    max: 1000,
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

        const saveButton = $("#tcSaveButton");
        if (saveButton) {
            saveButton.innerHTML = editingId
                ? '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Update Tournament'
                : '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save Tournament';
        }
    }

    /* DYNAMIC GROUP FIELD */

    function updateGroupField() {
        const formatSelect = $("#tcTournamentFormat");
        const wrapper = $("#tcGroupsWrapper");
        const input = $("#tcNumberOfGroups");

        if (!formatSelect || !wrapper || !input) return;

        const needsGroups = formatSelect.value === "group-knockout";

        wrapper.hidden = !needsGroups;
        input.required = needsGroups;
        input.disabled = !needsGroups;

        const totalTeams = Number($("#tcTotalTeams")?.value || 0);
        input.max = String(Math.max(2, totalTeams));
    }

    /* COLLECT AND VALIDATE */

    function collectFormData() {
        const existing = editingId
            ? readTournaments().find(item => item.id === editingId)
            : null;

        const info = TYPES[selectedType];
        if (!info) throw new Error("Please select a tournament type.");

        const name = ($("#tcName")?.value || "").trim();
        const season = ($("#tcSeason")?.value || "").trim();
        const totalTeams = Number($("#tcTotalTeams")?.value);
        const startDate = $("#tcStartDate")?.value || "";
        const endDate = $("#tcEndDate")?.value || "";
        const status = $("#tcStatus")?.value || "Upcoming";
        const notes = ($("#tcNotes")?.value || "").trim();

        if (!name) throw new Error("টুর্নামেন্টের নাম লিখতে হবে।");
        if (!season) throw new Error("সিজন / বছর লিখতে হবে।");

        if (!Number.isInteger(totalTeams) || totalTeams < 2 || totalTeams > 1000) {
            throw new Error("দলের সংখ্যা ২ থেকে ১০০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে।");
        }

        if (startDate && endDate && endDate < startDate) {
            throw new Error("শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।");
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

        const num = (id, fallback) => {
            const input = $("#" + id);
            return input && input.value.trim() !== ""
                ? Number(input.value)
                : fallback;
        };

        const val = (id, fallback = "") =>
            $("#" + id)?.value ?? fallback;

        const bool = (id, fallback = false) =>
            $("#" + id) ? $("#" + id).checked : fallback;

        if (selectedType === "franchise") {
            data.matchFormat = val("tcMatchFormat", "T20");
            data.pointsWin = num("tcPointsWin", 2);
            data.pointsTie = num("tcPointsTie", 1);
            data.pointsLoss = num("tcPointsLoss", 0);
            data.playoffs = bool("tcPlayoffs", true);

            if ([data.pointsWin, data.pointsTie, data.pointsLoss]
                .some(value => !Number.isFinite(value) || value < 0)) {
                throw new Error("পয়েন্টের মান শূন্য বা তার বেশি হতে হবে।");
            }
        }

        if (selectedType === "t20" || selectedType === "odi") {
            const defaults = selectedType === "t20"
                ? { overs: 20, powerplay: 6, bowler: 4 }
                : { overs: 50, powerplay: 10, bowler: 10 };

            data.overs = num("tcOvers", defaults.overs);
            data.innings = num("tcInnings", 1);
            data.powerplayOvers = num("tcPowerplayOvers", defaults.powerplay);
            data.maxOversPerBowler = num("tcMaxOversPerBowler", defaults.bowler);

            if (!Number.isInteger(data.overs) || data.overs < 1 || data.overs > defaults.overs) {
                throw new Error(`ওভারের সংখ্যা ১ থেকে ${defaults.overs}-এর মধ্যে হতে হবে।`);
            }

            if (!Number.isInteger(data.innings) || data.innings < 1 || data.innings > 2) {
                throw new Error("ইনিংসের সংখ্যা ১ অথবা ২ হতে হবে।");
            }

            if (!Number.isInteger(data.powerplayOvers) ||
                data.powerplayOvers < 0 || data.powerplayOvers > data.overs) {
                throw new Error("পাওয়ারপ্লে ওভার ম্যাচের মোট ওভারের মধ্যে হতে হবে।");
            }

            if (!Number.isInteger(data.maxOversPerBowler) ||
                data.maxOversPerBowler < 1 || data.maxOversPerBowler > data.overs) {
                throw new Error("একজন বোলারের ওভারের সংখ্যা বৈধ হতে হবে।");
            }
        }

        if (selectedType === "test") {
            data.testDays = num("tcTestDays", 5);
            data.innings = num("tcInnings", 2);
            data.followOn = bool("tcFollowOn", true);

            if (!Number.isInteger(data.testDays) || data.testDays < 1 || data.testDays > 10) {
                throw new Error("টেস্ট ম্যাচের দিন ১ থেকে ১০-এর মধ্যে হতে হবে।");
            }

            if (!Number.isInteger(data.innings) || data.innings < 1 || data.innings > 2) {
                throw new Error("ইনিংসের সংখ্যা ১ অথবা ২ হতে হবে।");
            }
        }

        if (selectedType === "custom") {
            data.tournamentFormat = val("tcTournamentFormat", "knockout");
            data.customFormat = val("tcCustomFormat", "Limited Overs");
            data.customOvers = num("tcCustomOvers", 20);
            data.customInnings = num("tcCustomInnings", 1);
            data.customRules = ($("#tcCustomRules")?.value || "").trim();

            if (!["league", "knockout", "group-knockout"].includes(data.tournamentFormat)) {
                throw new Error("একটি বৈধ Tournament Format নির্বাচন করো।");
            }

            if (!Number.isInteger(data.customOvers) ||
                data.customOvers < 1 || data.customOvers > 1000) {
                throw new Error("কাস্টম ওভার ১ থেকে ১০০০-এর মধ্যে হতে হবে।");
            }

            if (!Number.isInteger(data.customInnings) ||
                data.customInnings < 1 || data.customInnings > 10) {
                throw new Error("কাস্টম ইনিংস ১ থেকে ১০-এর মধ্যে হতে হবে।");
            }

            if (data.tournamentFormat === "group-knockout") {
                data.numberOfGroups = num("tcNumberOfGroups", 0);

                if (!Number.isInteger(data.numberOfGroups) ||
                    data.numberOfGroups < 2 ||
                    data.numberOfGroups > totalTeams) {
                    throw new Error("গ্রুপের সংখ্যা কমপক্ষে ২ হতে হবে এবং মোট দলের সংখ্যার বেশি হতে পারবে না।");
                }

                if (data.numberOfGroups > Math.floor(totalTeams / 2)) {
                    throw new Error("প্রতিটি গ্রুপে অন্তত ২টি দল রাখতে গ্রুপের সংখ্যা কমাতে হবে।");
                }
            } else {
                data.numberOfGroups = 0;
            }
        }

        return data;
    }

    /* SAVE */

    function handleSubmit(event) {
        event.preventDefault();

        const form = $("#tcTournamentForm");
        if (!form || !form.reportValidity()) return;

        try {
            const tournament = collectFormData();
            const tournaments = readTournaments();

            const duplicate = tournaments.some(item =>
                item.id !== tournament.id &&
                String(item.name).trim().toLowerCase() ===
                    tournament.name.trim().toLowerCase() &&
                String(item.season) === String(tournament.season)
            );

            if (duplicate) {
                showFormMessage("এই নাম ও সিজনের টুর্নামেন্ট আগে থেকেই রয়েছে।", true);
                return;
            }

            const updated = editingId
                ? tournaments.map(item => item.id === editingId ? tournament : item)
                : [...tournaments, tournament];

            if (!saveTournaments(updated)) return;

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
            showFormMessage(error.message || "টুর্নামেন্ট সংরক্ষণ করা যায়নি।", true);
        }
    }

    /* EDIT */

    function editTournament(id) {
        const tournament = readTournaments().find(item => item.id === id);

        if (!tournament || !TYPES[tournament.type]) {
            showNotice("টুর্নামেন্টটি খুঁজে পাওয়া যায়নি।", true);
            return;
        }

        selectedType = tournament.type;
        editingId = tournament.id;
        notice = null;

        renderPage();
        renderForm(tournament);
        updateGroupField();

        $("#tcFormPanel")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    /* DELETE */

   /* =====================================================
   SAFE TOURNAMENT DATA CLEANUP
   Keeps team and player profiles intact.
===================================================== */

function cleanTournamentRecords(tournamentId) {
    const keys = [
        "matchcraft_cricket_matches",
        "matchcraft_cricket_fixtures",
        "matchcraft_cricket_matches_fixtures",
        "cricketMatches",
        "cricket_matches",
        "matches",
        "matchcraft_matches",
        "matchcraft_fixtures",
        "matchcraft_scheduled_matches",
        "matchcraft_match_center_sessions",
        "matchcraft_cricket_standings",
        "matchcraft_cricket_statistics",
        "matchcraft_cricket_results",
        "matchcraft_cricket_playoffs",
        "matchcraft_cricket_brackets",
        "matchcraft_cricket_awards"
    ];

    const id = String(tournamentId);

    const tournamentFields = [
        "tournamentId",
        "tournament_id",
        "competitionId",
        "competition_id"
    ];

    function belongsToTournament(record) {
        if (!record || typeof record !== "object") return false;

        if (
            tournamentFields.some(field =>
                record[field] != null &&
                String(record[field]) === id
            )
        ) {
            return true;
        }

        if (
            record.tournament &&
            typeof record.tournament === "object" &&
            record.tournament.id != null &&
            String(record.tournament.id) === id
        ) {
            return true;
        }

        return false;
    }

    function clean(value) {
        if (Array.isArray(value)) {
            return value
                .filter(item => !belongsToTournament(item))
                .map(item => clean(item));
        }

        if (value && typeof value === "object") {
            if (belongsToTournament(value)) return null;

            const result = {};

            Object.entries(value).forEach(([key, item]) => {
                const cleaned = clean(item);

                if (cleaned !== null) {
                    result[key] = cleaned;
                }
            });

            return result;
        }

        return value;
    }

    const updates = [];

    // Prepare all changes before writing them.
    keys.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw === null) return;

        try {
            const original = JSON.parse(raw);
            const cleaned = clean(original);

            if (JSON.stringify(cleaned) !== JSON.stringify(original)) {
                updates.push({
                    key,
                    value: JSON.stringify(cleaned)
                });
            }
        } catch (error) {
            console.warn("Skipped unreadable storage:", key, error);
        }
    });

    // Do not touch team/player profile storage.
    const previous = updates.map(item => ({
        key: item.key,
        value: localStorage.getItem(item.key)
    }));

    try {
        updates.forEach(item => {
            localStorage.setItem(item.key, item.value);
        });

        updates.forEach(item => {
            window.dispatchEvent(new CustomEvent(
                "matchcraft:datachange",
                { detail: { key: item.key } }
            ));
        });

        return true;
    } catch (error) {
        console.error("Tournament cleanup failed:", error);

        // Roll back changes if a storage write fails.
        previous.forEach(item => {
            try {
                if (item.value === null) {
                    localStorage.removeItem(item.key);
                } else {
                    localStorage.setItem(item.key, item.value);
                }
            } catch (_) {}
        });

        showNotice("টুর্নামেন্টের ডেটা পরিষ্কার করা যায়নি।");
        return false;
    }
}

/* =====================================================
   REPLACE THE OLD deleteTournament(id)
===================================================== */

function deleteTournament(id) {
    const tournaments = readTournaments();
    const tournament = tournaments.find(item =>
        String(item.id) === String(id)
    );

    if (!tournament) {
        showNotice("টুর্নামেন্টটি পাওয়া যায়নি।", true);
        return;
    }

    const confirmed = window.confirm(
        `“${tournament.name}” টুর্নামেন্ট এবং এর সংশ্লিষ্ট ম্যাচ ও রেকর্ড মুছে ফেলতে চাও? টিম ও প্লেয়ারের প্রোফাইল থাকবে।`
    );

    if (!confirmed) return;

    // Clean related records first.
    if (!cleanTournamentRecords(id)) return;

    // Remove only this tournament.
    const updatedTournaments = tournaments.filter(item =>
        String(item.id) !== String(id)
    );

    if (!saveTournaments(updatedTournaments)) {
        showNotice("টুর্নামেন্ট তালিকা সেভ করা যায়নি।", true);
        return;
    }

    if (editingId === id) {
        editingId = null;
        selectedType = "";
    }

    notice = {
        text: "টুর্নামেন্ট ও শনাক্ত করা সংশ্লিষ্ট রেকর্ড মুছে ফেলা হয়েছে।",
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

    /* SAVED TOURNAMENT LIST */

    function getFormatSummary(tournament) {
        if (tournament.type === "franchise") {
            return `${tournament.matchFormat || "T20"} League`;
        }

        if (tournament.type === "t20") {
            return `${tournament.overs ?? 20} overs per innings`;
        }

        if (tournament.type === "odi") {
            return `${tournament.overs ?? 50} overs per innings`;
        }

        if (tournament.type === "test") {
            return `${tournament.testDays ?? 5} days · Test`;
        }

        if (tournament.type === "custom") {
            const formatNames = {
                league: "League",
                knockout: "Knockout",
                "group-knockout": "Group + Knockout"
            };

            const structure = formatNames[tournament.tournamentFormat] || "Knockout";
            const matchFormat = tournament.customFormat || "Limited Overs";
            const overs = tournament.customOvers ?? 20;

            if (tournament.tournamentFormat === "group-knockout") {
                const groups = Number(tournament.numberOfGroups) || 2;
                return `${structure} · ${groups} groups · ${matchFormat} · ${overs} overs`;
            }

            return `${structure} · ${matchFormat} · ${overs} overs`;
        }

        return "Custom format";
    }

    function renderTournamentList() {
        const list = $("#tcTournamentList");
        const count = $("#tcTournamentCount");

        if (!list || !count) return;

        const tournaments = readTournaments();
        count.textContent = String(tournaments.length);

        if (!tournaments.length) {
            list.innerHTML = `
                <div class="tc-empty">
                    <i class="fa-solid fa-trophy" aria-hidden="true"></i>
                    <br>
                    এখনো কোনো টুর্নামেন্ট তৈরি করা হয়নি।
                    <br>
                    উপরের কার্ড থেকে একটি বেছে শুরু করো।
                </div>
            `;
            return;
        }

        list.innerHTML = tournaments
            .slice()
            .sort((a, b) =>
                String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
            )
            .map(tournament => {
                const info = TYPES[tournament.type];
                const typeLabel = info
                    ? info.shortTitle
                    : tournament.typeLabel || "Tournament";

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
                                    ${escapeHTML(getFormatSummary(tournament))}
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
                            <button type="button"
                                class="tc-btn tc-btn-secondary"
                                data-action="edit"
                                data-id="${escapeHTML(tournament.id)}">
                                <i class="fa-solid fa-pen" aria-hidden="true"></i>
                                Edit
                            </button>

                            <button type="button"
                                class="tc-btn tc-btn-danger"
                                data-action="delete"
                                data-id="${escapeHTML(tournament.id)}">
                                <i class="fa-solid fa-trash" aria-hidden="true"></i>
                                Delete
                            </button>
                        </div>
                    </article>
                `;
            }).join("");
    }

    /* NOTICES */

    function showNotice(message, isError = false) {
        notice = { text: message, error: isError };
        showNoticeFromState();
    }

    function showNoticeFromState() {
        const container = $("#tcNotice");
        if (!container) return;

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

    /* EVENTS */

    document.addEventListener("click", event => {
        const root = document.getElementById(APP_ID);
        if (!root || !root.contains(event.target)) return;

        const typeCard = event.target.closest("[data-type]");

        if (typeCard) {
            chooseType(typeCard.dataset.type);
            return;
        }

        const actionButton = event.target.closest("[data-action]");

        if (actionButton) {
            if (actionButton.dataset.action === "edit") {
                editTournament(actionButton.dataset.id);
            }

            if (actionButton.dataset.action === "delete") {
                deleteTournament(actionButton.dataset.id);
            }

            return;
        }

        if (event.target.closest("#tcCancelButton")) {
            cancelForm();
        }
    });

    document.addEventListener("submit", event => {
        if (event.target.id === "tcTournamentForm") {
            handleSubmit(event);
        }
    });

    document.addEventListener("change", event => {
        if (event.target.id === "tcTournamentFormat") {
            updateGroupField();
        }

        if (event.target.id === "tcTotalTeams") {
            updateGroupField();
        }
    });

    /* INITIALIZE */

    function initialize() {
        mount();

        document.addEventListener("matchcraft:pagechange", event => {
            if (event.detail?.page === "tournaments") {
                if (!document.getElementById(APP_ID)) {
                    mount();
                }
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();