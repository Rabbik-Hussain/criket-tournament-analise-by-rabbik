/* =========================================================
   MATCHCRAFT CRICKET — PLAYERS & ROLES
   File: player.js
   Player profiles, batting/bowling styles and career details
   Team assignment support added; existing layout preserved.
========================================================= */

(() => {
    "use strict";

    const PLAYER_KEY = "matchcraft_cricket_players";
    const TEAM_KEY = "matchcraft_cricket_teams";

    const MATCH_KEYS = [
        "matchcraft_cricket_matches",
        "cricketMatches",
        "matches"
    ];

    const TOURNAMENT_KEY = "matchcraft_cricket_tournaments";

    const root = document.getElementById("players");

    if (!root) {
        console.warn('MATCHCRAFT CRICKET: section id="players" পাওয়া যায়নি।');
        return;
    }

    const roles = ["Batter", "Bowler", "Wicketkeeper", "All-rounder"];

    const bowlingTypes = [
        "Right-arm fast",
        "Right-arm fast-medium",
        "Right-arm medium-fast",
        "Right-arm medium",
        "Right-arm off-spin",
        "Right-arm leg-spin",
        "Right-arm googly / wrist spin",
        "Left-arm fast",
        "Left-arm fast-medium",
        "Left-arm medium",
        "Left-arm orthodox spin",
        "Left-arm wrist spin / chinaman",
        "Slow left-arm orthodox",
        "Slow left-arm wrist spin",
        "Underarm",
        "Other"
    ];

    const battingStyles = [
        "Aggressive", "Attacking", "Balanced", "Defensive",
        "Anchor", "Power hitter", "Other"
    ];

    const bowlingStyles = [
        "Swing", "Seam", "Swing and seam", "Yorker specialist",
        "Death-over specialist", "Powerplay specialist",
        "Spin and flight", "Control / economy",
        "Variation bowler", "Other"
    ];

    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

    // Generate a new Player ID and check for collisions.
    // Existing player IDs are never reused for new profiles.
    function makeId() {
        let id;

        do {
            id = "PLY-" +
                Date.now().toString(36).toUpperCase() +
                "-" +
                Math.random().toString(36).slice(2, 9).toUpperCase();
        } while (players.some(player => String(player.id) === id));

        return id;
    }

    function readArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.warn(
                "MATCHCRAFT: LocalStorage data could not be read:",
                key,
                error
            );
            return [];
        }
    }

    function savePlayers() {
        try {
            localStorage.setItem(PLAYER_KEY, JSON.stringify(players));

            window.dispatchEvent(new CustomEvent("matchcraft:datachange", {
                detail: { key: PLAYER_KEY }
            }));

            return true;
        } catch (error) {
            console.error("MATCHCRAFT: Player data could not be saved.", error);
            notify("ডেটা সংরক্ষণ করা যায়নি। ছবির সাইজ কমিয়ে আবার চেষ্টা করুন।");
            return false;
        }
    }

    let players = readArray(PLAYER_KEY);
    let teams = readArray(TEAM_KEY);
    let tournaments = readArray(TOURNAMENT_KEY);

    let view = "list";
    let editingId = null;

    function refreshData() {
        players = readArray(PLAYER_KEY);
        teams = readArray(TEAM_KEY);
        tournaments = readArray(TOURNAMENT_KEY);
    }

    function getPlayer(id) {
        return players.find(player => String(player.id) === String(id));
    }

    function getName(player) {
        return player?.name || player?.fullName || "Unnamed Player";
    }

    function getRole(player) {
        return player?.role || player?.playerRole || "Batter";
    }

    /* =====================================================
       TEAM HELPERS
    ===================================================== */

    function getTeamId(team) {
        return String(team?.id ?? team?._id ?? "");
    }

    function getPlayerTeamId(player) {
        return String(player?.teamId ?? "");
    }

    function getTeam(teamId) {
        if (!teamId) return null;

        return teams.find(team =>
            getTeamId(team) === String(teamId)
        ) || null;
    }

    function getTeamName(teamId) {
        const team = getTeam(teamId);

        if (!team) {
            return teamId ? "Team not found" : "Not assigned";
        }

        return String(
            team.name ||
            team.teamName ||
            team.fullName ||
            "Unnamed Team"
        );
    }

    function getTeamTournamentId(team) {
        return String(
            team?.tournamentId ??
            team?.tournamentID ??
            ""
        );
    }

    /*
     * Team dropdown options.
     * Keeps the original form field helper and existing CSS classes.
     */
    function teamOptionsAsArray() {
        return [
            { value: "", label: "Not assigned yet" },
            ...teams.map(team => ({
                value: getTeamId(team),
                label: String(
                    team.name ||
                    team.teamName ||
                    team.fullName ||
                    "Unnamed Team"
                )
            }))
        ];
    }

    function notify(message) {
        let notice = root.querySelector(".pl-notice");

        if (!notice) {
            notice = document.createElement("div");
            notice.className = "pl-notice";
            root.prepend(notice);
        }

        notice.textContent = message;
        notice.classList.add("is-visible");

        window.clearTimeout(notice._timer);

        notice._timer = window.setTimeout(() => {
            notice.classList.remove("is-visible");
        }, 3000);
    }

    /* =====================================================
       MAIN LAYOUT — ORIGINAL DESIGN PRESERVED
    ===================================================== */

    function mount() {
        root.innerHTML = `
            <div class="pl-app">
                <header class="pl-header">
                    <div>
                        <span class="pl-eyebrow">MATCHCRAFT CRICKET</span>
                        <h2>Players &amp; Roles</h2>
                        <p>Build your player directory and manage cricket profiles.</p>
                    </div>
                    <button class="pl-primary" type="button" data-action="new-player">
                        <i class="fa-solid fa-user-plus"></i> Add Player
                    </button>
                </header>

                <div class="pl-stats">
                    <article class="pl-stat">
                        <span class="pl-stat-icon pl-green"><i class="fa-solid fa-users"></i></span>
                        <div><span>Total Players</span><strong id="pl-total">0</strong></div>
                    </article>
                    <article class="pl-stat">
                        <span class="pl-stat-icon pl-purple"><i class="fa-solid fa-baseball-bat-ball"></i></span>
                        <div><span>Batters</span><strong id="pl-batters">0</strong></div>
                    </article>
                    <article class="pl-stat">
                        <span class="pl-stat-icon pl-orange"><i class="fa-solid fa-bullseye"></i></span>
                        <div><span>Bowlers</span><strong id="pl-bowlers">0</strong></div>
                    </article>
                    <article class="pl-stat">
                        <span class="pl-stat-icon pl-blue"><i class="fa-solid fa-hand"></i></span>
                        <div><span>Wicketkeepers</span><strong id="pl-keepers">0</strong></div>
                    </article>
                </div>

                <div class="pl-toolbar">
                    <label class="pl-search">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input id="pl-search" type="search"
                            placeholder="Search by name, player ID or country..."
                            aria-label="Search players">
                    </label>
                    <select id="pl-role-filter" aria-label="Filter by role">
                        <option value="">All roles</option>
                        ${roles.map(role =>
                            `<option value="${esc(role)}">${esc(role)}</option>`
                        ).join("")}
                    </select>
                    <select id="pl-hand-filter" aria-label="Filter by batting hand">
                        <option value="">All batting hands</option>
                        <option value="Right-hand">Right-hand</option>
                        <option value="Left-hand">Left-hand</option>
                    </select>
                </div>

                <div id="pl-content"></div>
            </div>
        `;

        renderList();
        updateStats();
    }

    function updateStats() {
        const total = root.querySelector("#pl-total");
        const batters = root.querySelector("#pl-batters");
        const bowlers = root.querySelector("#pl-bowlers");
        const keepers = root.querySelector("#pl-keepers");

        if (total) total.textContent = players.length;

        if (batters) {
            batters.textContent = players.filter(
                player => getRole(player) === "Batter"
            ).length;
        }

        if (bowlers) {
            bowlers.textContent = players.filter(
                player => ["Bowler", "All-rounder"].includes(getRole(player))
            ).length;
        }

        if (keepers) {
            keepers.textContent = players.filter(
                player => getRole(player) === "Wicketkeeper"
            ).length;
        }
    }

    /* =====================================================
       PLAYER DIRECTORY — ORIGINAL CARD CLASSES PRESERVED
    ===================================================== */

    function renderList() {
        view = "list";

        const content = root.querySelector("#pl-content");
        if (!content) return;

        const search = (
            root.querySelector("#pl-search")?.value || ""
        ).trim().toLowerCase();

        const roleFilter = root.querySelector("#pl-role-filter")?.value || "";
        const handFilter = root.querySelector("#pl-hand-filter")?.value || "";

        const filtered = players.filter(player => {
            const haystack = [
                getName(player),
                player.id,
                player.country,
                player.battingHand,
                player.bowlingType,
                getRole(player),
                getTeamName(getPlayerTeamId(player))
            ].join(" ").toLowerCase();

            return haystack.includes(search) &&
                (!roleFilter || getRole(player) === roleFilter) &&
                (!handFilter || player.battingHand === handFilter);
        });

        if (!filtered.length) {
            content.innerHTML = `
                <div class="pl-empty">
                    <div class="pl-empty-icon"><i class="fa-solid fa-user-group"></i></div>
                    <h3>${players.length ? "No players found" : "No players added yet"}</h3>
                    <p>${players.length
                        ? "Change your search or filters."
                        : "Create your first player profile to get started."}</p>
                    ${players.length ? "" : `
                        <button class="pl-primary" type="button" data-action="new-player">
                            <i class="fa-solid fa-user-plus"></i> Add First Player
                        </button>
                    `}
                </div>
            `;

            updateStats();
            return;
        }

        content.innerHTML = `
            <div class="pl-list-heading">
                <h3>Player Directory</h3>
                <span>${filtered.length} player${filtered.length === 1 ? "" : "s"}</span>
            </div>

            <div class="pl-player-grid">
                ${filtered.map(player => {
                    const name = getName(player);
                    const role = getRole(player);
                    const initials = name.trim().slice(0, 1).toUpperCase() || "?";

                    return `
                        <article class="pl-player-card">
                            <div class="pl-card-top">
                                <div class="pl-avatar">
                                    ${player.photo
                                        ? `<img src="${esc(player.photo)}"
                                            alt="${esc(name)}"
                                            onerror="this.style.display='none'">`
                                        : `<span>${esc(initials)}</span>`}
                                </div>
                                <span class="pl-role-badge">${esc(role)}</span>
                            </div>

                            <div class="pl-player-main">
                                <h3>${esc(name)}</h3>
                                <span class="pl-player-id">${esc(player.id)}</span>
                            </div>

                            <div class="pl-player-facts">
                                <span><i class="fa-solid fa-hand"></i>
                                    ${esc(player.battingHand || "Hand not set")}</span>

                                <span><i class="fa-solid fa-shirt"></i>
                                    ${player.jerseyNumber !== "" && player.jerseyNumber != null
                                        ? "#" + esc(player.jerseyNumber)
                                        : "No jersey number"}</span>

                                ${["Bowler", "All-rounder"].includes(role)
                                    ? `<span><i class="fa-solid fa-baseball"></i>
                                        ${esc(player.bowlingType || "Bowling type not set")}</span>`
                                    : ""}

                                <span><i class="fa-solid fa-flag"></i>
                                    ${esc(player.country || "Country not set")}</span>

                                <span><i class="fa-solid fa-users"></i>
                                    ${esc(getTeamName(getPlayerTeamId(player)))}</span>
                            </div>

                            <div class="pl-card-actions">
                                <button class="pl-btn pl-btn-primary-soft"
                                    type="button" data-action="details"
                                    data-id="${esc(player.id)}">
                                    <i class="fa-solid fa-eye"></i> View Details
                                </button>
                                <button class="pl-btn pl-btn-muted"
                                    type="button" data-action="edit-player"
                                    data-id="${esc(player.id)}" aria-label="Edit player">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="pl-btn pl-btn-danger"
                                    type="button" data-action="delete-player"
                                    data-id="${esc(player.id)}" aria-label="Delete player">
                                    <i class="fa-solid fa-trash"></i>
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
       ORIGINAL FORM FIELD HELPER
    ===================================================== */

    function field(
        label,
        name,
        value = "",
        type = "text",
        options = null,
        extra = ""
    ) {
        const safeValue = value ?? "";

        if (options) {
            return `
                <label class="pl-field">
                    <span>${label}</span>
                    <select name="${esc(name)}" ${extra}>
                        ${options.map(option => {
                            const optionValue = typeof option === "string"
                                ? option : option.value;

                            const optionLabel = typeof option === "string"
                                ? option : option.label;

                            return `<option value="${esc(optionValue)}"
                                ${String(safeValue) === String(optionValue) ? "selected" : ""}>
                                ${esc(optionLabel)}
                            </option>`;
                        }).join("")}
                    </select>
                </label>
            `;
        }

        return `
            <label class="pl-field">
                <span>${label}</span>
                <input name="${esc(name)}" type="${esc(type)}"
                    value="${esc(safeValue)}" ${extra}>
            </label>
        `;
    }

    function tournamentOptionsAsArray() {
        return [
            { value: "", label: "Not assigned yet" },
            ...tournaments.map(tournament => ({
                value: tournament.id || "",
                label: `${tournament.name || tournament.tournamentName || "Unnamed Tournament"}${tournament.season ? " (" + tournament.season + ")" : ""}`
            }))
        ];
    }

    /* =====================================================
       PLAYER FORM — ORIGINAL LAYOUT PRESERVED
       Only the Tournament field is replaced by Team.
    ===================================================== */

    function renderForm(player = null) {
        view = "form";
        editingId = player?.id || null;

        const content = root.querySelector("#pl-content");
        const role = player ? getRole(player) : "Batter";

        const countryOptions = [
            { value: "", label: "Select country (optional)" },
            "Bangladesh", "India", "Pakistan", "Sri Lanka", "Afghanistan",
            "Nepal", "Australia", "England", "New Zealand", "South Africa",
            "West Indies", "Zimbabwe", "Ireland", "Other"
        ];

        const handOptions = [
            { value: "", label: "Select batting hand" },
            "Right-hand", "Left-hand"
        ];

        const roleOptions = roles.map(item => ({
            value: item,
            label: item
        }));

        const battingStyleOptions = [
            { value: "", label: "Select style (optional)" },
            ...battingStyles.map(item => ({ value: item, label: item }))
        ];

        const bowlingTypeOptions = [
            { value: "", label: "Select bowling type" },
            ...bowlingTypes.map(item => ({ value: item, label: item }))
        ];

        const bowlingStyleOptions = [
            { value: "", label: "Select bowling style (optional)" },
            ...bowlingStyles.map(item => ({ value: item, label: item }))
        ];

        content.innerHTML = `
            <section class="pl-panel">
                <div class="pl-panel-heading">
                    <div>
                        <span class="pl-eyebrow">${player ? "UPDATE PLAYER" : "NEW PLAYER"}</span>
                        <h3>${player ? "Edit Player Profile" : "Create Player Profile"}</h3>
                        <p>Fields marked * are required.</p>
                    </div>
                    <button type="button" class="pl-icon-btn"
                        data-action="back-list" aria-label="Back to players">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>

                <form id="pl-player-form">
                    <div class="pl-form-section">
                        <h4><i class="fa-solid fa-id-card"></i> Personal Information</h4>

                        <div class="pl-form-grid">
                            ${field("Full Name *", "name",
                                player ? getName(player) : "",
                                "text", null,
                                'required maxlength="80" placeholder="Enter player full name"')}

                            ${field("Player ID", "playerIdDisplay",
                                player?.id || "Generated automatically",
                                "text", null, "readonly")}

                            ${field("Date of Birth", "dateOfBirth",
                                player?.dateOfBirth || "",
                                "date", null,
                                'max="' + new Date().toISOString().slice(0, 10) + '"')}

                            ${field("Country / Nationality", "country",
                                player?.country || "",
                                "text", countryOptions)}

                            ${field("Jersey Number", "jerseyNumber",
                                player?.jerseyNumber ?? "",
                                "number", null,
                                'min="0" max="999" placeholder="Optional"')}

                            ${field("Height (cm)", "heightCm",
                                player?.heightCm ?? "",
                                "number", null,
                                'min="50" max="250" step="0.1" placeholder="Optional"')}

                            ${field("Photo URL", "photoUrl",
                                player?.photo && !player.photo.startsWith("data:")
                                    ? player.photo : "",
                                "url", null,
                                'placeholder="https://example.com/player.jpg"')}

                            <label class="pl-field">
                                <span>Upload Photo from Device</span>
                                <input name="photoFile" id="pl-photo-file"
                                    type="file" accept="image/*">
                                <small>Choose a photo from your phone or computer. A smaller image is recommended.</small>
                            </label>

                            ${field("Phone (optional)", "phone",
                                player?.phone || "",
                                "tel", null,
                                'maxlength="30" placeholder="Contact number"')}

                            ${field("Email (optional)", "email",
                                player?.email || "",
                                "email", null,
                                'maxlength="100" placeholder="player@example.com"')}
                        </div>
                    </div>

                    <div class="pl-form-section">
                        <h4><i class="fa-solid fa-baseball-bat-ball"></i> Cricket Profile</h4>

                        <div class="pl-form-grid">
                            ${field("Player Role *", "role", role,
                                "text", roleOptions, "required")}

                            ${field("Batting Hand *", "battingHand",
                                player?.battingHand || "",
                                "text", handOptions, "required")}

                            <div class="pl-field pl-field-wide">
                                <span>Bowling Type <b class="pl-optional">Required for Bowler / All-rounder</b></span>
                                <select name="bowlingType" id="pl-bowling-type">
                                    ${bowlingTypeOptions.map(option =>
                                        `<option value="${esc(option.value)}"
                                            ${String(player?.bowlingType || "") === String(option.value) ? "selected" : ""}>
                                            ${esc(option.label)}
                                        </option>`
                                    ).join("")}
                                </select>
                            </div>

                            ${field("Batting Style", "battingStyle",
                                player?.battingStyle || "",
                                "text", battingStyleOptions)}

                            ${field("Bowling Style", "bowlingStyle",
                                player?.bowlingStyle || "",
                                "text", bowlingStyleOptions)}

                            ${field("Wicketkeeping Ability", "wicketkeeping",
                                player?.wicketkeeping || "Not specified",
                                "text", ["Not specified", "Yes", "No"])}

                            ${field("Preferred Batting Position", "preferredBattingPosition",
                                player?.preferredBattingPosition || "",
                                "text", [
                                    { value: "", label: "Not specified" },
                                    "Opener", "Top order", "Middle order",
                                    "Lower order", "Finisher", "Flexible"
                                ])}

                            ${field("Bowling Arm", "bowlingArm",
                                player?.bowlingArm || "",
                                "text", [
                                    { value: "", label: "Select (optional)" },
                                    "Right-arm", "Left-arm", "Both arms", "Not specified"
                                ])}

                            ${field("Player Status", "status",
                                player?.status || "Active",
                                "text", ["Active", "Inactive", "Injured", "Retired"])}
                        </div>

                        <div id="pl-bowling-hint" class="pl-hint" hidden>
                            <i class="fa-solid fa-circle-info"></i>
                            Select the player's specific bowling type. This information will help the match module filter bowling options.
                        </div>
                    </div>

                    <div class="pl-form-section">
                        <h4><i class="fa-solid fa-clipboard-list"></i> Additional Information</h4>

                        <div class="pl-form-grid">
                            ${field("Batting / Bowling Notes", "notes",
                                player?.notes || "",
                                "text", null,
                                'maxlength="300" placeholder="Optional notes"')}

                            ${field("Assigned Team", "teamId",
                                getPlayerTeamId(player || {}),
                                "text", teamOptionsAsArray())}

                            <label class="pl-field pl-field-wide">
                                <span>Biography / Notes</span>
                                <textarea name="bio" rows="3" maxlength="1000"
                                    placeholder="Achievements, experience or other relevant details...">${esc(player?.bio || "")}</textarea>
                            </label>
                        </div>
                    </div>

                    <div class="pl-form-actions">
                        <button class="pl-btn pl-btn-muted" type="button" data-action="back-list">
                            Cancel
                        </button>
                        <button class="pl-primary" type="submit">
                            <i class="fa-solid fa-floppy-disk"></i>
                            ${player ? "Save Changes" : "Create Player"}
                        </button>
                    </div>
                </form>
            </section>
        `;

        const form = content.querySelector("#pl-player-form");
        const roleSelect = form.elements.role;
        const bowlingType = form.elements.bowlingType;
        const bowlingHint = content.querySelector("#pl-bowling-hint");

        function updateBowlingField() {
            const needsBowling = ["Bowler", "All-rounder"].includes(roleSelect.value);

            bowlingType.required = needsBowling;
            bowlingType.disabled = !needsBowling;

            bowlingType.closest(".pl-field").classList.toggle(
                "pl-field-disabled", !needsBowling
            );

            bowlingHint.hidden = !needsBowling;

            if (!needsBowling) bowlingType.value = "";
        }

        roleSelect.addEventListener("change", updateBowlingField);
        updateBowlingField();

        form.addEventListener("submit", saveForm);
    }

    /* =====================================================
       PHOTO HANDLING — ORIGINAL BEHAVIOUR PRESERVED
    ===================================================== */

    function readPhotoFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve("");
                return;
            }

            if (!file.type.startsWith("image/")) {
                reject(new Error("Please select an image file."));
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                reject(new Error("ছবির সাইজ ২ MB-এর কম হতে হবে।"));
                return;
            }

            const reader = new FileReader();

            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("ছবি পড়া যায়নি।"));

            reader.readAsDataURL(file);
        });
    }

    /* =====================================================
       SAVE PLAYER
       Added teamId. Existing profile fields and ID preserved.
    ===================================================== */

    async function saveForm(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);

        const name = String(data.get("name") || "").trim();
        const role = String(data.get("role") || "");
        const battingHand = String(data.get("battingHand") || "");
        const bowlingType = String(data.get("bowlingType") || "");

        if (!name || !roles.includes(role) || !battingHand) {
            notify("Name, player role and batting hand are required.");
            return;
        }

        if (["Bowler", "All-rounder"].includes(role) && !bowlingType) {
            notify("Please select a bowling type for this role.");
            return;
        }

        const photoUrl = String(data.get("photoUrl") || "").trim();

        if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
            notify("Photo URL must begin with http:// or https://.");
            return;
        }

        const jerseyNumber = String(data.get("jerseyNumber") || "").trim();

        if (jerseyNumber && players.some(player =>
            player.id !== editingId &&
            String(player.jerseyNumber ?? "") === jerseyNumber &&
            String(getName(player)).toLowerCase() === name.toLowerCase()
        )) {
            notify("A player with this name and jersey number already exists.");
            return;
        }

        // Preserve the existing player and ID while editing.
        const previous = editingId ? getPlayer(editingId) : null;

        if (editingId && !previous) {
            notify("প্লেয়ারটি আর পাওয়া যাচ্ছে না। তালিকা রিফ্রেশ করে আবার চেষ্টা করুন।");
            refreshData();
            renderList();
            return;
        }

        const teamId = String(data.get("teamId") || "").trim();
        const selectedTeam = getTeam(teamId);

        if (teamId && !selectedTeam) {
            notify("নির্বাচিত দলটি পাওয়া যায়নি। আবার দল নির্বাচন করুন।");
            return;
        }

        const photoFile = form.elements.photoFile.files?.[0] || null;
        let photo = previous?.photo || "";

        try {
            if (photoFile) {
                photo = await readPhotoFile(photoFile);
            } else if (photoUrl) {
                photo = photoUrl;
            }
        } catch (error) {
            notify(error.message || "ছবি সংরক্ষণ করা যায়নি।");
            return;
        }

        const now = new Date().toISOString();
        const playerId = previous ? previous.id : makeId();

        if (!previous && players.some(player =>
            String(player.id) === String(playerId)
        )) {
            notify("ইউনিক Player ID তৈরি করা যায়নি। আবার চেষ্টা করুন।");
            return;
        }

        /*
         * If the selected team belongs to a tournament, use that
         * tournament ID. Otherwise preserve the player's previous
         * tournament ID so existing information is not discarded.
         */
        const teamTournamentId = selectedTeam
            ? getTeamTournamentId(selectedTeam)
            : "";

        const profile = {
            ...(previous || {}),

            id: playerId,
            name,

            dateOfBirth: String(data.get("dateOfBirth") || ""),
            country: String(data.get("country") || ""),
            jerseyNumber,
            heightCm: String(data.get("heightCm") || ""),

            photo,
            phone: String(data.get("phone") || "").trim(),
            email: String(data.get("email") || "").trim(),

            role,
            battingHand,

            bowlingType: ["Bowler", "All-rounder"].includes(role)
                ? bowlingType : "",

            battingStyle: String(data.get("battingStyle") || ""),

            bowlingStyle: ["Bowler", "All-rounder"].includes(role)
                ? String(data.get("bowlingStyle") || "") : "",

            wicketkeeping: String(
                data.get("wicketkeeping") || "Not specified"
            ),

            preferredBattingPosition: String(
                data.get("preferredBattingPosition") || ""
            ),

            bowlingArm: String(data.get("bowlingArm") || ""),
            status: String(data.get("status") || "Active"),
            notes: String(data.get("notes") || "").trim(),

            // NEW: Team Management uses this field to find squad members.
            teamId,

            // Retain tournament compatibility for existing features.
            tournamentId: teamTournamentId ||
                String(previous?.tournamentId || ""),

            bio: String(data.get("bio") || "").trim(),
            updatedAt: now
        };

        if (!previous) {
            profile.createdAt = now;
        }

        const oldPlayers = players;

        if (previous) {
            players = players.map(player =>
                player.id === previous.id ? profile : player
            );
        } else {
            players.push(profile);
        }

        if (!savePlayers()) {
            players = oldPlayers;
            return;
        }

        editingId = null;

        renderList();
        updateStats();

        notify(
            previous
                ? "Player profile updated."
                : `Player created. ID: ${profile.id}`
        );
    }

    /* =====================================================
       MATCH STATISTICS — ORIGINAL FUNCTIONS PRESERVED
    ===================================================== */

    function getMatches() {
        for (const key of MATCH_KEYS) {
            const list = readArray(key);
            if (list.length) return list;
        }

        return [];
    }

    function emptyStats() {
        return {
            matches: 0,
            battingInnings: 0,
            runs: 0,
            ballsFaced: 0,
            outs: 0,
            notOuts: 0,
            highestScore: 0,
            fifties: 0,
            hundreds: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            ballsBowled: 0,
            runsConceded: 0,
            catches: 0,
            stumpings: 0,
            runOuts: 0,
            wins: 0,
            inningsScores: []
        };
    }

    function playerIdMatches(value, player) {
        if (value == null) return false;

        if (typeof value === "object") {
            return String(value.id || value.playerId || "") === String(player.id);
        }

        return String(value) === String(player.id);
    }

    function isCompletedMatch(match) {
        const status = String(match.status || "").toLowerCase();

        return [
            "completed", "complete", "finished", "full time", "full-time"
        ].includes(status) || match.completed === true;
    }

    function aggregatePlayerStats(player) {
        const stats = emptyStats();
        const matches = getMatches();
        const seenMatches = new Set();

        for (const match of matches) {
            if (!isCompletedMatch(match)) continue;

            const matchId = String(match.id || match.matchId || "");
            const inningsList = Array.isArray(match.innings)
                ? match.innings
                : [];

            let appeared = false;

            for (const innings of inningsList) {
                const batting = Array.isArray(innings.batting)
                    ? innings.batting
                    : [];

                const bowling = Array.isArray(innings.bowling)
                    ? innings.bowling
                    : [];

                const battingLine = batting.find(row =>
                    playerIdMatches(
                        row.playerId ?? row.id ?? row.player,
                        player
                    )
                );

                if (battingLine) {
                    appeared = true;

                    const runs = Number(battingLine.runs || 0);
                    const balls = Number(
                        battingLine.ballsFaced ?? battingLine.balls ?? 0
                    );

                    const notOut =
                        String(battingLine.dismissal || "").toLowerCase() === "not out" ||
                        battingLine.notOut === true ||
                        battingLine.isOut === false;

                    stats.battingInnings++;
                    stats.runs += runs;
                    stats.ballsFaced += balls;
                    stats.fours += Number(battingLine.fours || 0);
                    stats.sixes += Number(battingLine.sixes || 0);
                    stats.highestScore = Math.max(stats.highestScore, runs);

                    if (notOut) stats.notOuts++;
                    else stats.outs++;

                    if (runs >= 100) stats.hundreds++;
                    else if (runs >= 50) stats.fifties++;

                    stats.inningsScores.push(runs);
                }

                const bowlingLine = bowling.find(row =>
                    playerIdMatches(
                        row.playerId ?? row.id ?? row.player,
                        player
                    )
                );

                if (bowlingLine) {
                    appeared = true;

                    stats.wickets += Number(bowlingLine.wickets || 0);

                    stats.ballsBowled += Number(
                        bowlingLine.ballsBowled ?? bowlingLine.balls ?? 0
                    );

                    stats.runsConceded += Number(
                        bowlingLine.runsConceded ?? bowlingLine.runs ?? 0
                    );
                }
            }

            const events = Array.isArray(match.events) ? match.events : [];

            for (const event of events) {
                const involved = [
                    event.playerId,
                    event.batterId,
                    event.bowlerId,
                    event.fielderId,
                    event.assistPlayerId
                ].some(id => playerIdMatches(id, player));

                if (!involved) continue;

                if (event.type === "catch" || event.type === "caught") {
                    if (playerIdMatches(event.fielderId || event.playerId, player)) {
                        stats.catches++;
                    }

                    appeared = true;
                } else if (
                    event.type === "stumping" ||
                    event.type === "stumped"
                ) {
                    if (playerIdMatches(event.fielderId || event.playerId, player)) {
                        stats.stumpings++;
                    }

                    appeared = true;
                } else if (
                    event.type === "run_out" ||
                    event.type === "runout"
                ) {
                    if (playerIdMatches(event.fielderId || event.playerId, player)) {
                        stats.runOuts++;
                    }

                    appeared = true;
                }
            }

            const playerInMatch = Array.isArray(match.playerIds) &&
                match.playerIds.some(id => playerIdMatches(id, player));

            if (appeared || playerInMatch) {
                const uniqueId = matchId ||
                    `${match.date || ""}_${stats.matches}`;

                if (!seenMatches.has(uniqueId)) {
                    stats.matches++;
                    seenMatches.add(uniqueId);
                }

                if (
                    match.winnerId &&
                    playerIdMatches(match.winnerId, player)
                ) {
                    stats.wins++;
                } else if (
                    Array.isArray(match.winnerPlayerIds) &&
                    match.winnerPlayerIds.some(id =>
                        playerIdMatches(id, player)
                    )
                ) {
                    stats.wins++;
                }
            }
        }

        stats.battingAverage = stats.outs
            ? stats.runs / stats.outs
            : null;

        stats.strikeRate = stats.ballsFaced
            ? (stats.runs / stats.ballsFaced) * 100
            : null;

        stats.economy = stats.ballsBowled
            ? stats.runsConceded / (stats.ballsBowled / 6)
            : null;

        return stats;
    }

    function statCard(label, value, icon) {
        return `
            <article class="pl-detail-stat">
                <span><i class="fa-solid ${icon}"></i></span>
                <div>
                    <small>${esc(label)}</small>
                    <strong>${esc(value)}</strong>
                </div>
            </article>
        `;
    }

    function infoRow(label, value) {
        return `
            <div class="pl-info-row">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
            </div>
        `;
    }

    /* =====================================================
       PLAYER DETAILS — ORIGINAL DESIGN PRESERVED
    ===================================================== */

    function renderDetails(playerId) {
        const player = getPlayer(playerId);

        if (!player) {
            renderList();
            return;
        }

        view = "details";

        const content = root.querySelector("#pl-content");
        const stats = aggregatePlayerStats(player);
        const role = getRole(player);

        const average = stats.battingAverage == null
            ? "—" : stats.battingAverage.toFixed(2);

        const strikeRate = stats.strikeRate == null
            ? "—" : stats.strikeRate.toFixed(2);

        const economy = stats.economy == null
            ? "—" : stats.economy.toFixed(2);

        const tournament = tournaments.find(item =>
            String(item.id) === String(player.tournamentId)
        );

        const assignedTeamName = getTeamName(getPlayerTeamId(player));

        content.innerHTML = `
            <section class="pl-panel pl-details-panel">
                <div class="pl-panel-heading">
                    <div>
                        <span class="pl-eyebrow">PLAYER PROFILE</span>
                        <h3>Player Details</h3>
                    </div>
                    <button class="pl-icon-btn" type="button"
                        data-action="back-list" aria-label="Back to players">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                </div>

                <div class="pl-profile-banner">
                    <div class="pl-profile-avatar">
                        ${player.photo
                            ? `<img src="${esc(player.photo)}"
                                alt="${esc(getName(player))}"
                                onerror="this.style.display='none'">`
                            : `<span>${esc(getName(player).slice(0, 1).toUpperCase())}</span>`}
                    </div>

                    <div class="pl-profile-main">
                        <span class="pl-role-badge">${esc(role)}</span>
                        <h2>${esc(getName(player))}</h2>
                        <p>Player ID: <strong>${esc(player.id)}</strong></p>

                        <div class="pl-profile-tags">
                            <span><i class="fa-solid fa-hand"></i>
                                ${esc(player.battingHand || "Hand not set")}</span>
                            <span><i class="fa-solid fa-flag"></i>
                                ${esc(player.country || "Country not set")}</span>
                            <span><i class="fa-solid fa-circle-check"></i>
                                ${esc(player.status || "Active")}</span>
                        </div>
                    </div>

                    <button class="pl-btn pl-btn-muted" type="button"
                        data-action="edit-player" data-id="${esc(player.id)}">
                        <i class="fa-solid fa-pen"></i> Edit Profile
                    </button>
                </div>

                <div class="pl-section-title">
                    <h3>Career Overview</h3>
                    <span>Based on completed matches saved in this app</span>
                </div>

                <div class="pl-detail-stats-grid">
                    ${statCard("Matches", stats.matches, "fa-calendar-check")}
                    ${statCard("Runs", stats.runs, "fa-baseball-bat-ball")}
                    ${statCard("Batting Innings", stats.battingInnings, "fa-list-ol")}
                    ${statCard("Highest Score", stats.highestScore, "fa-arrow-trend-up")}
                    ${statCard("Batting Average", average, "fa-chart-line")}
                    ${statCard("Strike Rate", strikeRate, "fa-gauge-high")}
                    ${statCard("Half-centuries", stats.fifties, "fa-star")}
                    ${statCard("Centuries", stats.hundreds, "fa-trophy")}
                    ${statCard("Wickets", stats.wickets, "fa-bullseye")}
                    ${statCard("Bowling Economy", economy, "fa-chart-column")}
                    ${statCard("Catches", stats.catches, "fa-hand")}
                    ${statCard("Stumpings", stats.stumpings, "fa-shield")}
                    ${statCard("Run Outs", stats.runOuts, "fa-person-running")}
                    ${statCard("Fours", stats.fours, "fa-arrows-left-right")}
                    ${statCard("Sixes", stats.sixes, "fa-arrow-up")}
                    ${statCard("Match Wins", stats.wins, "fa-medal")}
                </div>

                <div class="pl-detail-columns">
                    <section class="pl-info-card">
                        <h4><i class="fa-solid fa-id-card"></i> Personal Information</h4>
                        ${infoRow("Player ID", player.id)}
                        ${infoRow("Date of Birth", player.dateOfBirth || "Not provided")}
                        ${infoRow("Country", player.country || "Not provided")}
                        ${infoRow("Jersey Number", player.jerseyNumber || "Not provided")}
                        ${infoRow("Height", player.heightCm ? `${player.heightCm} cm` : "Not provided")}
                        ${infoRow("Phone", player.phone || "Not provided")}
                        ${infoRow("Email", player.email || "Not provided")}
                    </section>

                    <section class="pl-info-card">
                        <h4><i class="fa-solid fa-baseball-bat-ball"></i> Cricket Information</h4>
                        ${infoRow("Role", role)}
                        ${infoRow("Batting Hand", player.battingHand || "Not provided")}
                        ${infoRow("Batting Style", player.battingStyle || "Not provided")}
                        ${infoRow("Bowling Type", player.bowlingType || "Not applicable")}
                        ${infoRow("Bowling Style", player.bowlingStyle || "Not provided")}
                        ${infoRow("Bowling Arm", player.bowlingArm || "Not provided")}
                        ${infoRow("Wicketkeeping", player.wicketkeeping || "Not specified")}
                        ${infoRow("Preferred Batting Position", player.preferredBattingPosition || "Not specified")}
                        ${infoRow("Assigned Team", assignedTeamName)}
                        ${infoRow("Tournament", tournament?.name || tournament?.tournamentName || "Not assigned yet")}
                    </section>
                </div>

                <section class="pl-info-card pl-bio-card">
                    <h4><i class="fa-solid fa-file-lines"></i> Biography &amp; Notes</h4>
                    <p>${esc(player.bio || player.notes || "No additional biography has been added.")}</p>
                </section>

                <div class="pl-data-note">
                    <i class="fa-solid fa-circle-info"></i>
                    ${stats.matches
                        ? "Statistics are calculated from completed matches whose saved data contains matching player IDs and supported innings/batting/bowling fields. Matches using another data structure must be connected in the match module."
                        : "No matching completed-match statistics were found yet. Career figures will populate when completed matches save compatible innings data using this player's ID."}
                </div>
            </section>
        `;
    }

    /* =====================================================
       ACTION HANDLER
    ===================================================== */

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        switch (action) {
            case "new-player":
                editingId = null;
                renderForm();
                break;

            case "edit-player":
                renderForm(getPlayer(id));
                break;

            case "details":
                renderDetails(id);
                break;

            case "back-list":
                editingId = null;
                renderList();
                break;

            case "delete-player": {
                const player = getPlayer(id);
                if (!player) break;

                const confirmed = window.confirm(
                    `Delete player "${getName(player)}"? This removes the profile from this browser's player list.`
                );

                if (!confirmed) break;

                const oldPlayers = players;
                players = players.filter(item => item.id !== id);

                if (!savePlayers()) {
                    players = oldPlayers;
                    break;
                }

                renderList();
                updateStats();
                notify("Player profile deleted.");
                break;
            }
        }
    });

    root.addEventListener("input", event => {
        if (event.target.id === "pl-search") {
            renderList();
        }
    });

    root.addEventListener("change", event => {
        if (["pl-role-filter", "pl-hand-filter"].includes(event.target.id)) {
            renderList();
        }
    });

    /* =====================================================
       STORAGE & LIVE SYNCHRONIZATION
    ===================================================== */

    window.addEventListener("storage", event => {
        if (
            !event.key ||
            [
                PLAYER_KEY,
                TEAM_KEY,
                TOURNAMENT_KEY,
                ...MATCH_KEYS
            ].includes(event.key)
        ) {
            refreshData();

            if (view === "list") {
                renderList();
            } else if (view === "details") {
                const detailId = root.querySelector(
                    ".pl-profile-main strong"
                )?.textContent;

                const player = players.find(
                    item => String(item.id) === String(detailId)
                );

                if (player) {
                    renderDetails(player.id);
                } else {
                    renderList();
                }
            }

            updateStats();
        }
    });

    window.addEventListener("matchcraft:datachange", event => {
        const changedKey = event.detail?.key;

        if (
            changedKey === PLAYER_KEY ||
            changedKey === TEAM_KEY
        ) {
            refreshData();

            if (view === "list") {
                renderList();
            } else if (view === "details") {
                const detailId = root.querySelector(
                    ".pl-profile-main strong"
                )?.textContent;

                const player = players.find(
                    item => String(item.id) === String(detailId)
                );

                if (player) {
                    renderDetails(player.id);
                } else {
                    renderList();
                }
            }

            updateStats();
        }

        if (changedKey === TOURNAMENT_KEY) {
            tournaments = readArray(TOURNAMENT_KEY);
        }

        if (
            MATCH_KEYS.includes(changedKey) &&
            view === "details"
        ) {
            const detailId = root.querySelector(
                ".pl-profile-main strong"
            )?.textContent;

            if (detailId && getPlayer(detailId)) {
                renderDetails(detailId);
            }
        }
    });

    /* =====================================================
       START
    ===================================================== */

    mount();
})();