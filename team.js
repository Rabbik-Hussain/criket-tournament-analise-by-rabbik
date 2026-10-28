/* =========================================================
   MATCHCRAFT CRICKET — TEAMS & SQUADS
   File: team.js

   Team Management, Squad Management & Cricket Field Setup
   LocalStorage based — No backend required

   Preserved:
   - Create / Edit / Delete Team
   - Team Logo Upload and Compression
   - Tournament Filter
   - Player Profile Team Integration
   - Captain / Wicketkeeper Management
   - Powerplay / Defensive / Attacking / Custom Field Setup
   - Saved Field Assignments
========================================================= */

(() => {
    "use strict";

    const TEAM_KEY = "matchcraft_cricket_teams";
    const PLAYER_KEY = "matchcraft_cricket_players";
    const TOURNAMENT_KEY = "matchcraft_cricket_tournaments";
    const FIELD_LAYOUT_KEY = "matchcraft_cricket_field_layouts";

    const root = document.getElementById("teams");

    if (!root) {
        console.warn('MATCHCRAFT CRICKET: section id="teams" পাওয়া যায়নি।');
        return;
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    const esc = (value = "") =>
        String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const readStore = (key, fallback = []) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return Array.isArray(value) ? value : fallback;
        } catch {
            return fallback;
        }
    };

    const readObject = key => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        } catch {
            return {};
        }
    };

    function saveStore(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key }
            }));

            return true;
        } catch (error) {
            console.error(`MATCHCRAFT: ${key} save failed.`, error);
            showNotice("ডেটা সেভ করা যায়নি। Storage খালি করে আবার চেষ্টা করুন।");
            return false;
        }
    }

    let teams = readStore(TEAM_KEY);
    let players = readStore(PLAYER_KEY);
    let tournaments = readStore(TOURNAMENT_KEY);
    let fieldLayouts = readObject(FIELD_LAYOUT_KEY);

    let activeTeamId = null;
    let currentView = "teams";
    let editingTeamId = null;
    let selectedTeamLogo = "";

    const playerRoles = [
        "Batter",
        "Bowler",
        "All-rounder",
        "Wicketkeeper"
    ];

    const positionOptions = [
        "Wicketkeeper",
        "Slip",
        "First Slip",
        "Second Slip",
        "Third Slip",
        "Point",
        "Deep Point",
        "Cover",
        "Extra Cover",
        "Deep Cover",
        "Mid-off",
        "Long-off",
        "Mid-on",
        "Long-on",
        "Bowler",
        "Midwicket",
        "Deep Midwicket",
        "Square Leg",
        "Deep Square Leg",
        "Fine Leg",
        "Long Leg",
        "Third Man",
        "Custom Position"
    ];

    /*
       Coordinates use percentages within the cricket ground.
       Position format: [position name, x%, y%]
    */

    const formats = {
        Powerplay: {
            label: "Powerplay",
            positions: [
                ["Wicketkeeper", 50, 10],
                ["Slip", 40, 17],
                ["Point", 24, 31],
                ["Cover", 37, 40],
                ["Mid-off", 46, 49],
                ["Bowler", 50, 57],
                ["Mid-on", 57, 49],
                ["Midwicket", 68, 40],
                ["Square Leg", 76, 30],
                ["Fine Leg", 67, 18],
                ["Third Man", 31, 18]
            ]
        },

        Defensive: {
            label: "Defensive",
            positions: [
                ["Wicketkeeper", 50, 10],
                ["First Slip", 39, 16],
                ["Second Slip", 32, 20],
                ["Point", 22, 32],
                ["Cover", 35, 42],
                ["Bowler", 50, 57],
                ["Mid-off", 44, 49],
                ["Mid-on", 58, 49],
                ["Midwicket", 70, 41],
                ["Deep Square Leg", 80, 29],
                ["Fine Leg", 68, 17]
            ]
        },

        Attacking: {
            label: "Attacking",
            positions: [
                ["Wicketkeeper", 50, 10],
                ["Slip", 40, 17],
                ["Second Slip", 33, 21],
                ["Point", 23, 31],
                ["Cover", 36, 40],
                ["Bowler", 50, 57],
                ["Mid-off", 44, 49],
                ["Mid-on", 58, 49],
                ["Midwicket", 69, 40],
                ["Square Leg", 78, 30],
                ["Fine Leg", 67, 18]
            ]
        },

        Custom: {
            label: "Custom",
            positions: [
                ["Wicketkeeper", 50, 10],
                ["Slip", 40, 17],
                ["Point", 23, 31],
                ["Cover", 36, 41],
                ["Mid-off", 45, 49],
                ["Bowler", 50, 57],
                ["Mid-on", 58, 49],
                ["Midwicket", 69, 40],
                ["Square Leg", 78, 30],
                ["Fine Leg", 68, 17],
                ["Long-on", 59, 14]
            ]
        }
    };

    function makeId(prefix = "id") {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function sameId(first, second) {
        return String(first ?? "") === String(second ?? "");
    }

    function getPlayerName(player) {
        return player?.name || player?.fullName || "Unnamed Player";
    }

    function getPlayerJersey(player) {
        return player?.jerseyNumber ?? player?.jersey ?? "—";
    }

    function getPlayerRole(player) {
        return player?.role || player?.playerRole || "Batter";
    }

    function syncData() {
        teams = readStore(TEAM_KEY);
        players = readStore(PLAYER_KEY);
        tournaments = readStore(TOURNAMENT_KEY);
        fieldLayouts = readObject(FIELD_LAYOUT_KEY);
    }

    function getTeam(teamId) {
        return teams.find(team => sameId(team.id, teamId));
    }

    function getTeamPlayers(teamId) {
        return players.filter(player => sameId(player.teamId, teamId));
    }

    function persistTeams() {
        return saveStore(TEAM_KEY, teams);
    }

    function persistPlayers() {
        return saveStore(PLAYER_KEY, players);
    }

    function getTournamentName(tournamentId) {
        const tournament = tournaments.find(item =>
            sameId(item.id, tournamentId)
        );

        return tournament?.name ||
            tournament?.tournamentName ||
            "No tournament";
    }

    function tournamentOptions(selected = "") {
        const options = tournaments.map(tournament => {
            const id = tournament.id || "";
            const name =
                tournament.name ||
                tournament.tournamentName ||
                "Unnamed Tournament";

            const season = tournament.season
                ? ` (${tournament.season})`
                : "";

            return `
                <option
                    value="${esc(id)}"
                    ${sameId(id, selected) ? "selected" : ""}
                >${esc(name + season)}</option>
            `;
        }).join("");

        return `
            <option value="">No tournament selected</option>
            ${options}
        `;
    }

    function showNotice(message) {
        let notice = root.querySelector(".tc-notice");

        if (!notice) {
            notice = document.createElement("div");
            notice.className = "tc-notice";
            root.prepend(notice);
        }

        notice.textContent = message;
        notice.classList.add("is-visible");

        window.setTimeout(() => {
            notice?.classList.remove("is-visible");
        }, 3000);
    }

    /* =====================================================
       FIELD LAYOUT STORAGE
    ===================================================== */

    function getDefaultPositions(format) {
        const selected = formats[format] || formats.Powerplay;

        return selected.positions.map(([label, x, y]) => ({
            label,
            x,
            y,
            playerId: ""
        }));
    }

    function getSavedLayout(teamId, format) {
        const saved = fieldLayouts[String(teamId)]?.[format];

        if (!Array.isArray(saved) || !saved.length) {
            const defaults = getDefaultPositions(format);
            const teamPlayers = getTeamPlayers(teamId);

            return defaults.map(position => {
                const assigned = teamPlayers.find(player =>
                    String(player.fieldPosition || "").toLowerCase() ===
                    position.label.toLowerCase()
                );

                return {
                    ...position,
                    playerId: assigned ? String(assigned.id) : ""
                };
            });
        }

        return saved.map((position, index) => {
            const fallback = getDefaultPositions(format)[index];

            return {
                label: position.label || fallback?.label || "Custom Position",
                x: Number.isFinite(Number(position.x))
                    ? Number(position.x)
                    : fallback?.x ?? 50,
                y: Number.isFinite(Number(position.y))
                    ? Number(position.y)
                    : fallback?.y ?? 50,
                playerId: position.playerId
                    ? String(position.playerId)
                    : ""
            };
        });
    }

    function saveFieldLayout(teamId, format, positions) {
        const nextLayouts = readObject(FIELD_LAYOUT_KEY);
        const teamKey = String(teamId);

        if (!nextLayouts[teamKey]) {
            nextLayouts[teamKey] = {};
        }

        nextLayouts[teamKey][format] = positions.map(position => ({
            label: String(position.label || "Custom Position").trim(),
            x: Math.max(0, Math.min(100, Number(position.x) || 0)),
            y: Math.max(0, Math.min(100, Number(position.y) || 0)),
            playerId: String(position.playerId || "")
        }));

        try {
            localStorage.setItem(FIELD_LAYOUT_KEY, JSON.stringify(nextLayouts));
            fieldLayouts = nextLayouts;

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key: FIELD_LAYOUT_KEY }
            }));

            return true;
        } catch (error) {
            console.error("Field layout save failed:", error);
            showNotice("Field setup সেভ করা যায়নি।");
            return false;
        }
    }

    /* =====================================================
       INITIAL RENDER
    ===================================================== */

    function mount() {
        root.innerHTML = `
            <div class="tc-app">
                <header class="tc-header">
                    <div class="tc-heading">
                        <span class="tc-eyebrow">MATCHCRAFT CRICKET</span>
                        <h2>Teams &amp; Squads</h2>
                        <p>Create teams, manage squads and view field positions.</p>
                    </div>

                    <button type="button" class="tc-primary" data-action="new-team">
                        <i class="fa-solid fa-plus"></i> Create Team
                    </button>
                </header>

                <div class="tc-stats">
                    <div class="tc-stat">
                        <span class="tc-stat-icon">
                            <i class="fa-solid fa-shield-halved"></i>
                        </span>
                        <div>
                            <span>Total Teams</span>
                            <strong id="tc-total-teams">0</strong>
                        </div>
                    </div>

                    <div class="tc-stat">
                        <span class="tc-stat-icon">
                            <i class="fa-solid fa-users"></i>
                        </span>
                        <div>
                            <span>Total Players</span>
                            <strong id="tc-total-players">0</strong>
                        </div>
                    </div>

                    <div class="tc-stat">
                        <span class="tc-stat-icon">
                            <i class="fa-solid fa-trophy"></i>
                        </span>
                        <div>
                            <span>Tournaments</span>
                            <strong id="tc-total-tournaments">0</strong>
                        </div>
                    </div>
                </div>

                <div class="tc-toolbar">
                    <div class="tc-search-wrap">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input
                            id="tc-search"
                            type="search"
                            placeholder="Search teams by name or short name..."
                            aria-label="Search teams"
                        >
                    </div>

                    <select id="tc-tournament-filter" aria-label="Filter by tournament">
                        <option value="">All tournaments</option>
                        ${tournamentOptions()}
                    </select>
                </div>

                <div id="tc-content"></div>
            </div>
        `;

        renderTeams();
        updateStats();
    }

    function updateStats() {
        const totalTeams = root.querySelector("#tc-total-teams");
        const totalPlayers = root.querySelector("#tc-total-players");
        const totalTournaments = root.querySelector("#tc-total-tournaments");

        if (totalTeams) totalTeams.textContent = teams.length;
        if (totalPlayers) totalPlayers.textContent = players.length;
        if (totalTournaments) totalTournaments.textContent = tournaments.length;
    }

    /* =====================================================
       TEAM LIST
    ===================================================== */

    function renderTeams() {
        currentView = "teams";

        const content = root.querySelector("#tc-content");
        if (!content) return;

        const search = (
            root.querySelector("#tc-search")?.value || ""
        ).trim().toLowerCase();

        const tournamentFilter =
            root.querySelector("#tc-tournament-filter")?.value || "";

        const filtered = teams.filter(team => {
            const name = String(team.name || "").toLowerCase();
            const shortName = String(team.shortName || "").toLowerCase();

            const matchesSearch =
                name.includes(search) || shortName.includes(search);

            const matchesTournament =
                !tournamentFilter ||
                sameId(team.tournamentId, tournamentFilter);

            return matchesSearch && matchesTournament;
        });

        if (!filtered.length) {
            content.innerHTML = `
                <div class="tc-empty">
                    <div class="tc-empty-icon">
                        <i class="fa-solid fa-people-group"></i>
                    </div>

                    <h3>${teams.length ? "No teams found" : "Your team list is empty"}</h3>

                    <p>
                        ${teams.length
                            ? "Try another search or tournament filter."
                            : "Create your first team and start building its squad."}
                    </p>

                    ${teams.length ? "" : `
                        <button class="tc-primary" data-action="new-team">
                            <i class="fa-solid fa-plus"></i>
                            Create Your First Team
                        </button>
                    `}
                </div>
            `;

            updateStats();
            return;
        }

        content.innerHTML = `
            <div class="tc-team-grid">
                ${filtered.map(team => {
                    const teamPlayers = getTeamPlayers(team.id);
                    const tournamentName = getTournamentName(team.tournamentId);
                    const initials = (
                        team.shortName || team.name || "TC"
                    ).slice(0, 3).toUpperCase();

                    return `
                        <article class="tc-team-card">
                            <div class="tc-team-card-top">
                                <div class="tc-team-logo">
                                    ${team.logo
                                        ? `<img src="${esc(team.logo)}" alt="${esc(team.name)} logo">`
                                        : `<span>${esc(initials)}</span>`}
                                </div>

                                <span class="tc-player-count">
                                    <i class="fa-solid fa-users"></i>
                                    ${teamPlayers.length} players
                                </span>
                            </div>

                            <div class="tc-team-info">
                                <h3>${esc(team.name || "Unnamed Team")}</h3>

                                <p class="tc-team-short">
                                    ${esc(team.shortName || "No short name")}
                                </p>

                                <div class="tc-team-meta">
                                    <span>
                                        <i class="fa-solid fa-location-dot"></i>
                                        ${esc(team.ground || "Ground not set")}
                                    </span>

                                    <span>
                                        <i class="fa-solid fa-trophy"></i>
                                        ${esc(tournamentName)}
                                    </span>
                                </div>
                            </div>

                            <div class="tc-team-card-actions">
                                <button
                                    type="button"
                                    class="tc-btn tc-btn-muted"
                                    data-action="edit-team"
                                    data-id="${esc(team.id)}"
                                >
                                    <i class="fa-solid fa-pen"></i> Edit
                                </button>

                                <button
                                    type="button"
                                    class="tc-btn tc-btn-muted"
                                    data-action="manage-squad"
                                    data-id="${esc(team.id)}"
                                >
                                    <i class="fa-solid fa-users"></i> Squad
                                </button>
                            </div>

                            <div class="tc-team-card-bottom">
                                <button
                                    type="button"
                                    class="tc-btn tc-btn-danger"
                                    data-action="delete-team"
                                    data-id="${esc(team.id)}"
                                >
                                    <i class="fa-solid fa-trash"></i> Delete
                                </button>

                                <button
                                    type="button"
                                    class="tc-btn tc-btn-position"
                                    data-action="view-positions"
                                    data-id="${esc(team.id)}"
                                >
                                    <i class="fa-solid fa-baseball"></i>
                                    Field Setup
                                </button>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;

        updateStats();
    }

    /* =====================================================
       CREATE / EDIT TEAM
    ===================================================== */

    function renderTeamForm(team = null) {
        currentView = "team-form";
        editingTeamId = team?.id || null;
        selectedTeamLogo = team?.logo || "";

        const content = root.querySelector("#tc-content");
        if (!content) return;

        content.innerHTML = `
            <section class="tc-panel">
                <div class="tc-panel-heading">
                    <div>
                        <span class="tc-eyebrow">
                            ${team ? "UPDATE TEAM" : "NEW TEAM"}
                        </span>

                        <h3>${team ? "Edit Team Details" : "Create a Team"}</h3>
                    </div>

                    <button
                        type="button"
                        class="tc-icon-button"
                        data-action="back-teams"
                        aria-label="Back to teams"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>

                <form id="tc-team-form" class="tc-form">
                    <div class="tc-form-grid">
                        <label class="tc-field tc-field-wide">
                            <span>Team Name <b>*</b></span>
                            <input
                                name="name"
                                required
                                maxlength="70"
                                value="${esc(team?.name || "")}"
                                placeholder="e.g. Dhaka Warriors"
                            >
                        </label>

                        <label class="tc-field">
                            <span>Short Name <b>*</b></span>
                            <input
                                name="shortName"
                                required
                                maxlength="8"
                                value="${esc(team?.shortName || "")}"
                                placeholder="e.g. DWR"
                            >
                        </label>

                        <label class="tc-field">
                            <span>Home Ground</span>
                            <input
                                name="ground"
                                maxlength="100"
                                value="${esc(team?.ground || "")}"
                                placeholder="e.g. Mirpur Stadium"
                            >
                        </label>

                        <label class="tc-field tc-field-wide">
                            <span>Tournament</span>
                            <select name="tournamentId">
                                ${tournamentOptions(team?.tournamentId || "")}
                            </select>
                        </label>

                        <div class="tc-field tc-field-wide">
                            <span>Team Logo (optional)</span>

                            <label class="tc-logo-picker" for="tc-team-logo-file">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <strong>Choose Logo Image</strong>
                                <small>মোবাইল বা কম্পিউটার থেকে ছবি নির্বাচন করুন</small>
                            </label>

                            <input
                                id="tc-team-logo-file"
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                hidden
                            >

                            <div class="tc-logo-preview" id="tc-logo-preview">
                                ${selectedTeamLogo
                                    ? `<img src="${esc(selectedTeamLogo)}" alt="Team logo preview">`
                                    : `<span><i class="fa-regular fa-image"></i> No image selected</span>`}
                            </div>

                            <button
                                type="button"
                                class="tc-btn tc-btn-muted"
                                id="tc-remove-logo"
                                ${selectedTeamLogo ? "" : "hidden"}
                            >
                                <i class="fa-solid fa-trash"></i> Remove Logo
                            </button>

                            <small>PNG, JPG, WEBP বা GIF ছবি নির্বাচন করুন।</small>
                        </div>

                        <label class="tc-field tc-field-wide">
                            <span>Notes</span>
                            <textarea
                                name="notes"
                                rows="3"
                                maxlength="500"
                                placeholder="Optional team notes..."
                            >${esc(team?.notes || "")}</textarea>
                        </label>
                    </div>

                    <div class="tc-form-actions">
                        <button
                            type="button"
                            class="tc-btn tc-btn-muted"
                            data-action="back-teams"
                        >Cancel</button>

                        <button type="submit" class="tc-primary">
                            <i class="fa-solid fa-floppy-disk"></i>
                            ${team ? "Save Changes" : "Create Team"}
                        </button>
                    </div>
                </form>
            </section>
        `;

        content.querySelector("#tc-team-form")
            ?.addEventListener("submit", saveTeamForm);

        const logoInput = content.querySelector("#tc-team-logo-file");
        const logoPreview = content.querySelector("#tc-logo-preview");
        const removeLogoButton = content.querySelector("#tc-remove-logo");

        logoInput?.addEventListener("change", async () => {
            const file = logoInput.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                showNotice("Please select a valid image file.");
                logoInput.value = "";
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                showNotice("ছবির সাইজ ১০ MB-এর কম হতে হবে।");
                logoInput.value = "";
                return;
            }

            try {
                selectedTeamLogo = await compressTeamLogo(file);

                logoPreview.innerHTML = `
                    <img src="${selectedTeamLogo}" alt="Team logo preview">
                `;

                removeLogoButton.hidden = false;
            } catch (error) {
                console.error("Team logo processing failed:", error);
                showNotice("ছবিটি লোড করা যায়নি। অন্য ছবি নির্বাচন করুন।");
                logoInput.value = "";
            }
        });

        removeLogoButton?.addEventListener("click", () => {
            selectedTeamLogo = "";
            if (logoInput) logoInput.value = "";

            logoPreview.innerHTML = `
                <span>
                    <i class="fa-regular fa-image"></i>
                    No image selected
                </span>
            `;

            removeLogoButton.hidden = true;
        });
    }

    function compressTeamLogo(file) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                try {
                    const maxDimension = 512;
                    const scale = Math.min(
                        1,
                        maxDimension / Math.max(image.width, image.height)
                    );

                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.round(image.width * scale));
                    canvas.height = Math.max(1, Math.round(image.height * scale));

                    const context = canvas.getContext("2d");

                    if (!context) {
                        throw new Error("Canvas is unavailable.");
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

                    URL.revokeObjectURL(objectUrl);
                    resolve(dataUrl);
                } catch (error) {
                    URL.revokeObjectURL(objectUrl);
                    reject(error);
                }
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Unable to load image."));
            };

            image.src = objectUrl;
        });
    }

    function saveTeamForm(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);

        const name = String(data.get("name") || "").trim();
        const shortName = String(data.get("shortName") || "")
            .trim()
            .toUpperCase();

        const ground = String(data.get("ground") || "").trim();
        const tournamentId = String(data.get("tournamentId") || "");
        const notes = String(data.get("notes") || "").trim();
        const logo = selectedTeamLogo;

        if (!name || !shortName) {
            showNotice("Team name and short name are required.");
            return;
        }

        const duplicate = teams.find(team =>
            !sameId(team.id, editingTeamId) &&
            String(team.name || "").toLowerCase() === name.toLowerCase() &&
            sameId(team.tournamentId || "", tournamentId)
        );

        if (duplicate) {
            showNotice(
                "This team name already exists in the selected tournament."
            );
            return;
        }

        if (editingTeamId) {
            const team = getTeam(editingTeamId);
            if (!team) return;

            Object.assign(team, {
                name,
                shortName,
                ground,
                tournamentId,
                logo,
                notes,
                updatedAt: new Date().toISOString()
            });
        } else {
            teams.push({
                id: makeId("team"),
                name,
                shortName,
                ground,
                tournamentId,
                logo,
                notes,
                createdAt: new Date().toISOString()
            });
        }

        if (!persistTeams()) return;

        showNotice(
            editingTeamId
                ? "Team updated successfully."
                : "Team created successfully."
        );

        editingTeamId = null;
        selectedTeamLogo = "";
        renderTeams();
        updateStats();
    }

    /* =====================================================
       SQUAD VIEW
       Players are created and assigned through Player Profile.
    ===================================================== */

    function renderSquad(teamId) {
        const team = getTeam(teamId);

        if (!team) {
            renderTeams();
            return;
        }

        activeTeamId = teamId;
        currentView = "squad";

        const teamPlayers = getTeamPlayers(teamId);
        const content = root.querySelector("#tc-content");

        if (!content) return;

        content.innerHTML = `
            <section class="tc-panel">
                <div class="tc-panel-heading">
                    <div class="tc-team-title-inline">
                        <div class="tc-team-logo tc-team-logo-small">
                            ${team.logo
                                ? `<img src="${esc(team.logo)}" alt="${esc(team.name)} logo">`
                                : `<span>${esc((team.shortName || team.name || "TC").slice(0, 3).toUpperCase())}</span>`}
                        </div>

                        <div>
                            <span class="tc-eyebrow">SQUAD MANAGEMENT</span>
                            <h3>${esc(team.name)} Squad</h3>
                            <p>${teamPlayers.length} players registered</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="tc-icon-button"
                        data-action="back-teams"
                        aria-label="Back to teams"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>

                <div class="tc-info-note">
                    <i class="fa-solid fa-circle-info"></i>
                    খেলোয়াড় যুক্ত বা অন্য দলে দিতে Player Profile থেকে Team নির্বাচন করুন।
                </div>

                <div class="tc-squad-heading">
                    <h4>Squad Players</h4>
                    <span>${teamPlayers.length} total</span>
                </div>

                <div class="tc-squad-list">
                    ${teamPlayers.length
                        ? teamPlayers.map(player => `
                            <article class="tc-player-row">
                                <div class="tc-player-avatar">
                                    ${player.photo
                                        ? `<img src="${esc(player.photo)}" alt="${esc(getPlayerName(player))}" onerror="this.style.display='none'">`
                                        : `<span>${esc(getPlayerName(player).slice(0, 1).toUpperCase())}</span>`}
                                </div>

                                <div class="tc-player-details">
                                    <strong>${esc(getPlayerName(player))}</strong>

                                    <span>
                                        #${esc(getPlayerJersey(player))}
                                        · ${esc(getPlayerRole(player))}
                                    </span>

                                    <small>
                                        ${esc(player.fieldPosition || "Position not set")}
                                    </small>
                                </div>

                                <div class="tc-player-flags">
                                    ${player.isCaptain
                                        ? `<span class="tc-flag">C</span>`
                                        : ""}

                                    ${player.isWicketkeeper
                                        ? `<span class="tc-flag tc-flag-keeper">WK</span>`
                                        : ""}
                                </div>

                                <div class="tc-player-actions">
                                    <button
                                        class="tc-btn tc-btn-muted"
                                        type="button"
                                        data-action="toggle-captain"
                                        data-id="${esc(player.id)}"
                                        title="Toggle captain"
                                        aria-label="Toggle captain"
                                    >
                                        <i class="fa-solid fa-crown"></i>
                                    </button>

                                    <button
                                        class="tc-btn tc-btn-muted"
                                        type="button"
                                        data-action="toggle-keeper"
                                        data-id="${esc(player.id)}"
                                        title="Toggle wicketkeeper"
                                        aria-label="Toggle wicketkeeper"
                                    >
                                        <i class="fa-solid fa-hand"></i>
                                    </button>

                                    <button
                                        class="tc-btn tc-btn-danger"
                                        type="button"
                                        data-action="delete-player"
                                        data-id="${esc(player.id)}"
                                        title="Remove player"
                                        aria-label="Remove player"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </article>
                        `).join("")
                        : `
                            <div class="tc-empty tc-empty-compact">
                                <i class="fa-solid fa-users"></i>
                                <h3>No players in this squad yet</h3>
                                <p>
                                    Player Profile থেকে এই Team নির্বাচন করে
                                    খেলোয়াড় সেভ করুন।
                                </p>
                            </div>
                        `}
                </div>

                <div class="tc-panel-footer">
                    <button
                        type="button"
                        class="tc-btn tc-btn-position"
                        data-action="view-positions"
                        data-id="${esc(team.id)}"
                    >
                        <i class="fa-solid fa-baseball"></i>
                        Configure Field Setup
                    </button>
                </div>
            </section>
        `;
    }

    /* =====================================================
       CRICKET FIELD SETUP
    ===================================================== */

    function playerSelectOptions(teamPlayers, selectedPlayerId = "") {
        return `
            <option value="">No player assigned</option>
            ${teamPlayers.map(player => `
                <option
                    value="${esc(player.id)}"
                    ${sameId(player.id, selectedPlayerId) ? "selected" : ""}
                >
                    ${esc(getPlayerName(player))}
                    (#${esc(getPlayerJersey(player))})
                </option>
            `).join("")}
        `;
    }

    function renderPositions(teamId, selectedFormat = "Powerplay") {
        const team = getTeam(teamId);

        if (!team) {
            renderTeams();
            return;
        }

        if (!formats[selectedFormat]) {
            selectedFormat = "Powerplay";
        }

        activeTeamId = teamId;
        currentView = "positions";

        const teamPlayers = getTeamPlayers(teamId);
        const layout = getSavedLayout(teamId, selectedFormat);
        const content = root.querySelector("#tc-content");

        if (!content) return;

        const fieldPositions = layout.map(position => {
            const player = teamPlayers.find(item =>
                sameId(item.id, position.playerId)
            );

            return `
                <div
                    class="tc-field-player"
                    style="left:${position.x}%;top:${position.y}%;"
                    title="${esc(position.label)}${player ? " — " + esc(getPlayerName(player)) : ""}"
                >
                    <span class="tc-field-dot">
                        ${player ? esc(String(getPlayerJersey(player))) : ""}
                    </span>

                    <span class="tc-field-label">
                        ${player ? esc(getPlayerName(player)) : ""}
                    </span>
                </div>
            `;
        }).join("");

        content.innerHTML = `
            <section class="tc-panel tc-position-panel">
                <div class="tc-panel-heading">
                    <div>
                        <span class="tc-eyebrow">CRICKET FIELD SETUP</span>
                        <h3>${esc(team.name)} — Field Positions</h3>
                        <p>
                            ${teamPlayers.length} players in this squad
                            · ${esc(formats[selectedFormat].label)} layout
                        </p>
                    </div>

                    <button
                        type="button"
                        class="tc-icon-button"
                        data-action="back-teams"
                        aria-label="Back to teams"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>

                <div class="tc-position-controls">
                    <label class="tc-field">
                        <span>Field Strategy</span>

                        <select id="tc-field-format">
                            ${Object.entries(formats).map(([key, value]) => `
                                <option
                                    value="${esc(key)}"
                                    ${key === selectedFormat ? "selected" : ""}
                                >${esc(value.label)}</option>
                            `).join("")}
                        </select>
                    </label>

                    <button
                        type="button"
                        class="tc-btn tc-btn-muted"
                        data-action="manage-squad"
                        data-id="${esc(team.id)}"
                    >
                        <i class="fa-solid fa-users"></i> Manage Squad
                    </button>
                </div>

                <div class="tc-field-legend">
                    <span><i class="tc-legend-dot"></i> Assigned player</span>
                    <span><i class="tc-legend-pitch"></i> Pitch</span>
                </div>

                <div class="tc-cricket-ground-wrap">
                    <div
                        class="tc-cricket-ground"
                        role="img"
                        aria-label="${esc(selectedFormat)} cricket field showing assigned players"
                    >
                        <div class="tc-ground-boundary"></div>
                        <div class="tc-ground-inner"></div>

                        <div class="tc-ground-pitch">
                            <div class="tc-pitch-crease tc-pitch-crease-top"></div>
                            <div class="tc-pitch-crease tc-pitch-crease-bottom"></div>
                            <div class="tc-pitch-stumps tc-pitch-stumps-top"></div>
                            <div class="tc-pitch-stumps tc-pitch-stumps-bottom"></div>
                        </div>

                        ${fieldPositions}

                        <span class="tc-ground-caption">
                            ${esc(selectedFormat.toUpperCase())} FIELD LAYOUT
                        </span>
                    </div>
                </div>

                ${teamPlayers.length > 11 ? `
                    <div class="tc-info-note">
                        <i class="fa-solid fa-circle-info"></i>
                        এই Squad-এ ${teamPlayers.length} জন খেলোয়াড় আছে।
                        মাঠের একাদশ পজিশনে সর্বোচ্চ ১১ জনকে বসানো যাবে।
                    </div>
                ` : ""}

                ${teamPlayers.length < 11 ? `
                    <div class="tc-info-note">
                        <i class="fa-solid fa-circle-info"></i>
                        এই Squad-এ ${teamPlayers.length} জন খেলোয়াড় আছে।
                        মাঠের ফাঁকা পজিশনগুলোতে কোনো ভুয়া খেলোয়াড় দেখানো হবে না।
                    </div>
                ` : ""}

                <div class="tc-position-table-wrap">
                    <h4>Assign Players to Field Positions</h4>

                    <p>
                        প্রতিটি পজিশনের জন্য Squad থেকে একজন খেলোয়াড় বেছে নাও।
                        Custom layout-এ পজিশনের নামও পরিবর্তন করা যাবে।
                    </p>

                    <div class="tc-position-table">
                        ${layout.map((position, index) => `
                            <div
                                class="tc-position-row"
                                data-field-row="${index}"
                            >
                                <span class="tc-position-number">
                                    ${index + 1}
                                </span>

                                <span class="tc-position-name">
                                    ${selectedFormat === "Custom"
                                        ? `
                                            <input
                                                type="text"
                                                class="tc-custom-position-label"
                                                data-position-label="${index}"
                                                value="${esc(position.label)}"
                                                maxlength="40"
                                                aria-label="Custom field position name"
                                            >
                                        `
                                        : esc(position.label)}
                                </span>

                                <span class="tc-position-player">
                                    <select
                                        class="tc-field-player-select"
                                        data-position-player="${index}"
                                        aria-label="Assign player to ${esc(position.label)}"
                                    >
                                        ${playerSelectOptions(
                                            teamPlayers,
                                            position.playerId
                                        )}
                                    </select>
                                </span>
                            </div>
                        `).join("")}
                    </div>

                    <div class="tc-form-actions">
                        <button
                            type="button"
                            class="tc-btn tc-btn-muted"
                            data-action="reset-field-layout"
                            data-id="${esc(team.id)}"
                            data-format="${esc(selectedFormat)}"
                        >
                            <i class="fa-solid fa-rotate-left"></i>
                            Reset Layout
                        </button>

                        <button
                            type="button"
                            class="tc-primary"
                            data-action="save-field-layout"
                            data-id="${esc(team.id)}"
                            data-format="${esc(selectedFormat)}"
                        >
                            <i class="fa-solid fa-floppy-disk"></i>
                            Save Field Setup
                        </button>
                    </div>
                </div>
            </section>
        `;

        content.querySelector("#tc-field-format")
            ?.addEventListener("change", event => {
                renderPositions(teamId, event.target.value);
            });
    }

    function collectFieldLayout(teamId, format) {
        const original = getSavedLayout(teamId, format);
        const content = root.querySelector("#tc-content");

        return original.map((position, index) => {
            const playerSelect = content.querySelector(
                `[data-position-player="${index}"]`
            );

            const labelInput = content.querySelector(
                `[data-position-label="${index}"]`
            );

            return {
                ...position,
                label: labelInput
                    ? String(labelInput.value || "").trim() || "Custom Position"
                    : position.label,
                playerId: playerSelect?.value || ""
            };
        });
    }

    function saveCurrentFieldLayout(teamId, format) {
        const teamPlayers = getTeamPlayers(teamId);
        const positions = collectFieldLayout(teamId, format);

        const assignedIds = positions
            .map(position => position.playerId)
            .filter(Boolean);

        if (new Set(assignedIds).size !== assignedIds.length) {
            showNotice("একই খেলোয়াড়কে একাধিক পজিশনে দেওয়া হয়েছে।");
            return;
        }

        const validPlayerIds = new Set(
            teamPlayers.map(player => String(player.id))
        );

        if (assignedIds.some(id => !validPlayerIds.has(String(id)))) {
            showNotice("নির্বাচিত খেলোয়াড় এই Team-এর Squad-এ নেই।");
            return;
        }

        if (saveFieldLayout(teamId, format, positions)) {
            showNotice(`${formats[format].label} field setup সেভ হয়েছে।`);
            renderPositions(teamId, format);
        }
    }

    function resetFieldLayout(teamId, format) {
        const confirmed = window.confirm(
            `${formats[format].label} layout-এর saved assignments reset করতে চাও?`
        );

        if (!confirmed) return;

        const nextLayouts = readObject(FIELD_LAYOUT_KEY);
        const teamKey = String(teamId);

        if (nextLayouts[teamKey]) {
            delete nextLayouts[teamKey][format];

            if (!Object.keys(nextLayouts[teamKey]).length) {
                delete nextLayouts[teamKey];
            }
        }

        try {
            localStorage.setItem(FIELD_LAYOUT_KEY, JSON.stringify(nextLayouts));
            fieldLayouts = nextLayouts;

            showNotice("Field layout reset হয়েছে।");
            renderPositions(teamId, format);
        } catch (error) {
            console.error("Field layout reset failed:", error);
            showNotice("Layout reset করা যায়নি।");
        }
    }

    /* =====================================================
       DELETE TEAM / PLAYER
    ===================================================== */

    function deleteTeam(teamId) {
        const team = getTeam(teamId);
        if (!team) return;

        const count = getTeamPlayers(teamId).length;

        const confirmed = window.confirm(
            `Delete "${team.name}" and its ${count} squad player(s)? This cannot be undone.`
        );

        if (!confirmed) return;

        teams = teams.filter(item => !sameId(item.id, teamId));
        players = players.filter(player => !sameId(player.teamId, teamId));

        const nextLayouts = readObject(FIELD_LAYOUT_KEY);
        delete nextLayouts[String(teamId)];

        try {
            localStorage.setItem(TEAM_KEY, JSON.stringify(teams));
            localStorage.setItem(PLAYER_KEY, JSON.stringify(players));
            localStorage.setItem(FIELD_LAYOUT_KEY, JSON.stringify(nextLayouts));

            fieldLayouts = nextLayouts;

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key: TEAM_KEY }
            }));

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key: PLAYER_KEY }
            }));
        } catch (error) {
            console.error("Team deletion save failed:", error);
            showNotice("দল মুছে ফেলার সময় ডেটা সেভ করা যায়নি।");
            syncData();
            return;
        }

        activeTeamId = null;
        showNotice("Team and its squad players deleted.");
        renderTeams();
        updateStats();
    }

    function deletePlayer(playerId) {
        const player = players.find(item => sameId(item.id, playerId));
        if (!player) return;

        const confirmed = window.confirm(
            `Remove ${getPlayerName(player)} from this squad?`
        );

        if (!confirmed) return;

        players = players.filter(item => !sameId(item.id, playerId));

        /*
           Remove this player from saved field assignments too.
        */

        const nextLayouts = readObject(FIELD_LAYOUT_KEY);

        Object.keys(nextLayouts).forEach(teamKey => {
            Object.keys(nextLayouts[teamKey] || {}).forEach(format => {
                nextLayouts[teamKey][format] =
                    (nextLayouts[teamKey][format] || []).map(position => ({
                        ...position,
                        playerId: sameId(position.playerId, playerId)
                            ? ""
                            : position.playerId
                    }));
            });
        });

        try {
            localStorage.setItem(PLAYER_KEY, JSON.stringify(players));
            localStorage.setItem(FIELD_LAYOUT_KEY, JSON.stringify(nextLayouts));

            fieldLayouts = nextLayouts;

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key: PLAYER_KEY }
            }));
        } catch (error) {
            console.error("Player removal save failed:", error);
            showNotice("Player remove করার সময় ডেটা সেভ করা যায়নি।");
            syncData();
            return;
        }

        if (activeTeamId) {
            renderSquad(activeTeamId);
        }

        updateStats();
        showNotice("Player removed from squad.");
    }

    function togglePlayerFlag(playerId, flag) {
        const player = players.find(item => sameId(item.id, playerId));
        if (!player) return;

        if (flag === "isCaptain" && !player.isCaptain) {
            players.forEach(item => {
                if (sameId(item.teamId, player.teamId)) {
                    item.isCaptain = false;
                }
            });
        }

        if (flag === "isWicketkeeper" && !player.isWicketkeeper) {
            players.forEach(item => {
                if (sameId(item.teamId, player.teamId)) {
                    item.isWicketkeeper = false;
                }
            });
        }

        player[flag] = !player[flag];

        if (!persistPlayers()) {
            syncData();
            return;
        }

        renderSquad(activeTeamId);

        showNotice(
            flag === "isCaptain"
                ? "Captain setting updated."
                : "Wicketkeeper setting updated."
        );
    }

    /* =====================================================
       ACTION HANDLERS
    ===================================================== */

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button || !root.contains(button)) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const format = button.dataset.format;

        switch (action) {
            case "new-team":
                renderTeamForm();
                break;

            case "edit-team":
                renderTeamForm(getTeam(id));
                break;

            case "back-teams":
                activeTeamId = null;
                editingTeamId = null;
                selectedTeamLogo = "";
                renderTeams();
                break;

            case "manage-squad":
                renderSquad(id);
                break;

            case "view-positions":
                renderPositions(id, "Powerplay");
                break;

            case "delete-team":
                deleteTeam(id);
                break;

            case "delete-player":
                deletePlayer(id);
                break;

            case "toggle-captain":
                togglePlayerFlag(id, "isCaptain");
                break;

            case "toggle-keeper":
                togglePlayerFlag(id, "isWicketkeeper");
                break;

            case "save-field-layout":
                if (formats[format]) {
                    saveCurrentFieldLayout(id, format);
                }
                break;

            case "reset-field-layout":
                if (formats[format]) {
                    resetFieldLayout(id, format);
                }
                break;
        }
    });

    root.addEventListener("input", event => {
        if (event.target.id === "tc-search") {
            renderTeams();
        }
    });

    root.addEventListener("change", event => {
        if (event.target.id === "tc-tournament-filter") {
            renderTeams();
        }
    });

    /* =====================================================
       CROSS-PAGE DATA SYNCHRONIZATION
    ===================================================== */

    function refreshCurrentView() {
        syncData();

        const filter = root.querySelector("#tc-tournament-filter");
        const previousFilter = filter?.value || "";

        if (filter) {
            filter.innerHTML = `
                <option value="">All tournaments</option>
                ${tournamentOptions()}
            `;

            filter.value = previousFilter;
        }

        if (currentView === "positions" && activeTeamId) {
            renderPositions(
                activeTeamId,
                root.querySelector("#tc-field-format")?.value || "Powerplay"
            );
        } else if (currentView === "squad" && activeTeamId) {
            renderSquad(activeTeamId);
        } else if (currentView === "teams") {
            renderTeams();
        } else if (currentView === "team-form") {
            /*
               Do not destroy an open form while another page saves data.
            */
        }

        updateStats();
    }

    window.addEventListener("storage", event => {
        if (
            !event.key ||
            [
                TEAM_KEY,
                PLAYER_KEY,
                TOURNAMENT_KEY,
                FIELD_LAYOUT_KEY
            ].includes(event.key)
        ) {
            refreshCurrentView();
        }
    });

    window.addEventListener("matchcraft:datachange", event => {
        const changedKey = event.detail?.key;

        if (
            [
                TEAM_KEY,
                PLAYER_KEY,
                TOURNAMENT_KEY,
                FIELD_LAYOUT_KEY
            ].includes(changedKey)
        ) {
            refreshCurrentView();
        }
    });

    /* =====================================================
       START
    ===================================================== */

    mount();

})();