/* =========================================================
   MATCHCRAFT CRICKET — FEATURES
   File: features.js

   Tournament Match Pairing & Schedule

   Cricket-only storage:
   - matchcraft_cricket_tournaments
   - matchcraft_cricket_teams
   - matchcraft_cricket_matches

   Features:
   - Existing tournament and team data
   - Team logos in tournament preview and match schedule
   - Cricket-only fixture loading
   - Duplicate pairing prevention
   - Existing fixture preservation
========================================================= */

(() => {
    "use strict";

    const STORAGE = {
        tournaments: "matchcraft_cricket_tournaments",
        teams: "matchcraft_cricket_teams",
        fixtures: "matchcraft_cricket_matches"
    };

    const PAGE_ID = "features";

    let selectedTournamentId = "";
    let initialized = false;
    let noticeTimer = null;

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);

    /* =====================================================
       STORAGE — CRICKET APP ONLY
    ===================================================== */

    function readArray(key) {
        try {
            const raw = localStorage.getItem(key);

            if (!raw) return [];

            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) return parsed;

            if (parsed && typeof parsed === "object") {
                for (const property of [
                    "data",
                    "items",
                    "records",
                    "tournaments",
                    "teams",
                    "fixtures",
                    "matches"
                ]) {
                    if (Array.isArray(parsed[property])) {
                        return parsed[property];
                    }
                }
            }

            return [];
        } catch (error) {
            console.error(`[Features] Could not read ${key}:`, error);
            return [];
        }
    }

    function saveTournamentGroupData(tournament, groupDefinitions) {
    try {
        const tournaments = readTournaments();
        const tournamentId = getId(tournament);

        const index = tournaments.findIndex(item =>
            getId(item) === tournamentId
        );

        if (index === -1) {
            throw new Error("Tournament record not found.");
        }

        const groupAssignments = {};

        groupDefinitions.forEach(group => {
            group.teamIds.forEach(teamId => {
                groupAssignments[String(teamId)] = group.name;
            });
        });

        tournaments[index] = {
            ...tournaments[index],
            numberOfGroups: groupDefinitions.length,
            groupAssignments,
            groupNames: groupDefinitions.map(group => group.name),
            groupPairingGenerated: true,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(
            STORAGE.tournaments,
            JSON.stringify(tournaments)
        );

        return true;

    } catch (error) {
        console.error("[Features] Group data save failed:", error);
        throw error;
    }
}

    function readTournaments() {
        return readArray(STORAGE.tournaments);
    }

    function readTeams() {
        return readArray(STORAGE.teams);
    }

    // শুধু ক্রিকেট অ্যাপের fixture storage পড়বে।
    // অন্য অ্যাপের generic fixture alias পড়বে না।
    function readFixtures() {
        return readArray(STORAGE.fixtures);
    }

    function writeFixtures(fixtures) {
        try {
            localStorage.setItem(
                STORAGE.fixtures,
                JSON.stringify(fixtures)
            );

            return true;
        } catch (error) {
            console.error("[Features] Could not save fixtures:", error);

            showNotice(
                "শিডিউল সংরক্ষণ করা যায়নি। ব্রাউজারের স্টোরেজ খালি আছে কি না পরীক্ষা করো।",
                "error"
            );

            return false;
        }
    }

    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    function getId(item) {
        return String(
            item?.id ??
            item?._id ??
            item?.tournamentId ??
            item?.teamId ??
            ""
        );
    }

    function getTournamentName(tournament) {
        return String(
            tournament?.name ??
            tournament?.tournamentName ??
            tournament?.title ??
            "Unnamed Tournament"
        );
    }

    function getTeamName(team) {
        return String(
            team?.name ??
            team?.teamName ??
            team?.title ??
            "Unnamed Team"
        );
    }

    /*
     * টিমের ID দিয়ে ক্রিকেটের টিম স্টোরেজ থেকে
     * আসল টিম রেকর্ড খুঁজে বের করবে।
     */
    function getTeamById(teamId) {
        const id = String(teamId ?? "");

        if (!id) return null;

        return readTeams().find(team =>
            getId(team) === id
        ) || null;
    }

    /*
     * টিমের নাম এবং logo একসঙ্গে দেখায়।
     * লোগো না থাকলে default cricket icon দেখায়।
     */
    function renderTeamIdentity(teamId, fallbackName, compact = false) {
        const team = getTeamById(teamId);
        const name = team ? getTeamName(team) : (fallbackName || "Unknown Team");
        const logo = typeof team?.logo === "string"
            ? team.logo.trim()
            : "";

        const size = compact ? 34 : 46;

        const imageMarkup = logo
            ? `
                <img
                    class="features-team-logo"
                    src="${escapeHTML(logo)}"
                    alt="${escapeHTML(name)} logo"
                    loading="lazy"
                    style="
                        width:${size}px;
                        height:${size}px;
                        min-width:${size}px;
                        object-fit:cover;
                        border-radius:50%;
                        display:block;
                    "
                >
            `
            : `
                <span
                    class="features-team-logo features-team-logo--fallback"
                    aria-hidden="true"
                    style="
                        width:${size}px;
                        height:${size}px;
                        min-width:${size}px;
                        display:inline-flex;
                        align-items:center;
                        justify-content:center;
                        border-radius:50%;
                    "
                >
                    <i class="fa-solid fa-shield-halved"></i>
                </span>
            `;

        return `
            <span
                class="features-team-identity ${compact ? "features-team-identity--compact" : ""}"
                style="
                    display:inline-flex;
                    align-items:center;
                    gap:10px;
                    min-width:0;
                    max-width:100%;
                "
            >
                ${imageMarkup}
                <span class="features-team-identity-name">
                    ${escapeHTML(name)}
                </span>
            </span>
        `;
    }

    function getTournamentFormat(tournament) {
    return String(
        tournament?.tournamentFormat ??
        tournament?.format ??
        tournament?.tournamentType ??
        tournament?.type ??
        tournament?.typeLabel ??
        ""
    ).trim();
}

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ");
    }

    function normalizeFormat(value) {
    const format = normalizeText(value);

    // Group + Knockout-কে আগে শনাক্ত করতে হবে।
    // কারণ এই নামে "knockout" এবং "group" দুটোই আছে।
    if (
        format.includes("group") &&
        (
            format.includes("knockout") ||
            format.includes("knock out") ||
            format.includes("elimination")
        )
    ) {
        return "group-knockout";
    }

    if (
        format.includes("knockout") ||
        format.includes("knock out") ||
        format.includes("elimination")
    ) {
        return "knockout";
    }

    if (
        format.includes("league") ||
        format.includes("round robin")
    ) {
        return "league";
    }

    if (format.includes("group") || format.includes("mixed")) {
        return "group";
    }

    return "custom";
}

    /* =====================================================
       TOURNAMENT TEAMS
    ===================================================== */

    function getTournamentTeamIds(tournament) {
        const possibleArrays = [
            tournament?.teamIds,
            tournament?.teams,
            tournament?.selectedTeams,
            tournament?.participatingTeams,
            tournament?.registeredTeamIds
        ];

        for (const value of possibleArrays) {
            if (!Array.isArray(value)) continue;

            return value.map(item => {
                if (item && typeof item === "object") {
                    return String(
                        item.id ??
                        item.teamId ??
                        item._id ??
                        ""
                    );
                }

                return String(item ?? "");
            }).filter(Boolean);
        }

        return [];
    }

    function teamBelongsToTournament(team, tournament) {
        const tournamentId = getId(tournament);

        const tournamentName = normalizeText(
            getTournamentName(tournament)
        );

        const teamTournamentIds = [
            team?.tournamentId,
            team?.tournament_id,
            team?.competitionId,
            team?.competition_id,
            team?.seasonTournamentId
        ]
            .filter(value => value !== undefined && value !== null)
            .map(String);

        if (
            tournamentId &&
            teamTournamentIds.includes(tournamentId)
        ) {
            return true;
        }

        const multiIds = [
            team?.tournamentIds,
            team?.tournaments
        ];

        for (const list of multiIds) {
            if (!Array.isArray(list)) continue;

            const matches = list.some(item => {
                if (item && typeof item === "object") {
                    return String(
                        item.id ??
                        item.tournamentId ??
                        ""
                    ) === tournamentId;
                }

                return String(item) === tournamentId;
            });

            if (matches) return true;
        }

        const linkedName = normalizeText(
            team?.tournamentName ??
            team?.competitionName ??
            ""
        );

        if (linkedName && linkedName === tournamentName) {
            return true;
        }

        const linkedIds = getTournamentTeamIds(tournament);

        if (linkedIds.includes(getId(team))) {
            return true;
        }

        return false;
    }

    function getTournamentTeams(tournament) {
        const allTeams = readTeams();
        const selectedIds = getTournamentTeamIds(tournament);

        // প্রথমে টুর্নামেন্টে নির্বাচিত Team ID দিয়ে খুঁজবে।
        if (selectedIds.length) {
            const selectedTeams = selectedIds
                .map(id => allTeams.find(team => getId(team) === id))
                .filter(Boolean);

            if (selectedTeams.length) {
                return selectedTeams;
            }
        }

        // বিকল্প হিসেবে দলের নিজস্ব tournament assignment পরীক্ষা করবে।
        return allTeams.filter(team =>
            teamBelongsToTournament(team, tournament)
        );
    }

    /* =====================================================
       FIXTURE HELPERS
    ===================================================== */

    function getFixtureTournamentId(fixture) {
        return String(
            fixture?.tournamentId ??
            fixture?.tournament_id ??
            fixture?.competitionId ??
            fixture?.tournament?.id ??
            ""
        );
    }

    function getFixtureTournamentName(fixture) {
        return normalizeText(
            fixture?.tournamentName ??
            fixture?.competitionName ??
            fixture?.tournament?.name ??
            ""
        );
    }

    function getTournamentFixtures(tournament) {
        const id = getId(tournament);
        const name = normalizeText(getTournamentName(tournament));

        return readFixtures().filter(fixture => {
            const fixtureId = getFixtureTournamentId(fixture);

            if (id && fixtureId) {
                return fixtureId === id;
            }

            return getFixtureTournamentName(fixture) === name;
        });
    }

    function getHomeTeamId(fixture) {
        return String(
            fixture?.homeTeamId ??
            fixture?.teamAId ??
            fixture?.team1Id ??
            fixture?.homeTeam?.id ??
            ""
        );
    }

    function getAwayTeamId(fixture) {
        return String(
            fixture?.awayTeamId ??
            fixture?.teamBId ??
            fixture?.team2Id ??
            fixture?.awayTeam?.id ??
            ""
        );
    }

    function getHomeTeamName(fixture) {
        const team = getTeamById(getHomeTeamId(fixture));

        return String(
            team ? getTeamName(team) :
            fixture?.homeTeamName ??
            fixture?.teamAName ??
            fixture?.team1Name ??
            fixture?.homeTeam?.name ??
            "Team A"
        );
    }

    function getAwayTeamName(fixture) {
        const team = getTeamById(getAwayTeamId(fixture));

        return String(
            team ? getTeamName(team) :
            fixture?.awayTeamName ??
            fixture?.teamBName ??
            fixture?.team2Name ??
            fixture?.awayTeam?.name ??
            "Team B"
        );
    }

    function getFixtureStatus(fixture) {
        const raw = normalizeText(
            fixture?.status ?? fixture?.matchStatus ?? "upcoming"
        );

        if (
            raw.includes("complete") ||
            raw.includes("finished") ||
            raw.includes("result")
        ) return "completed";

        if (raw === "live" || raw.includes("in progress")) {
            return "live";
        }

        if (raw.includes("cancel")) return "cancelled";

        return "upcoming";
    }

    function getFixtureDate(fixture) {
        return String(
            fixture?.date ??
            fixture?.matchDate ??
            fixture?.scheduledDate ??
            ""
        );
    }

    function getFixtureTime(fixture) {
        return String(
            fixture?.time ??
            fixture?.matchTime ??
            fixture?.startTime ??
            ""
        );
    }

    function getFixtureVenue(fixture) {
        return String(
            fixture?.venue ??
            fixture?.groundName ??
            fixture?.venueName ??
            ""
        );
    }

    /* =====================================================
       PAIRING HELPERS
    ===================================================== */

    function makePairKey(teamA, teamB, round) {
        const pair = [String(teamA), String(teamB)].sort();

        return `${pair[0]}::${pair[1]}::${round ?? ""}`;
    }

   function getExistingPairKeys(fixtures) {
    const keys = new Set();

    fixtures.forEach(fixture => {
        const a = getHomeTeamId(fixture);
        const b = getAwayTeamId(fixture);

        if (!a || !b) return;

        const stage = normalizeText(
            fixture.stage ??
            fixture.roundName ??
            fixture.round ??
            ""
        );

        const pair = [a, b].sort();

        keys.add(`${pair[0]}::${pair[1]}::${stage}`);
    });

    return keys;
}

    function makeRoundRobinPairs(teams) {
        const participants = teams.map(team => ({
            id: getId(team),
            name: getTeamName(team)
        }));

        if (participants.length < 2) return [];

        const rotation = [...participants];

        if (rotation.length % 2 !== 0) {
            rotation.push(null);
        }

        const totalRounds = rotation.length - 1;
        const matchesPerRound = rotation.length / 2;
        const pairs = [];

        for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
            const roundTeams = [...rotation];

            for (let index = 0; index < matchesPerRound; index++) {
                const first = roundTeams[index];
                const second = roundTeams[rotation.length - 1 - index];

                if (!first || !second) continue;

                let teamA = first;
                let teamB = second;

                if (roundIndex % 2 === 1 && index === 0) {
                    [teamA, teamB] = [teamB, teamA];
                }

                pairs.push({
                    teamA,
                    teamB,
                    round: roundIndex + 1,
                    stage: `League Round ${roundIndex + 1}`
                });
            }

            const fixed = rotation[0];
            const moving = rotation.slice(1);

            moving.unshift(moving.pop());

            rotation.splice(0, rotation.length, fixed, ...moving);
        }

        return pairs;
    }

  function makeGroupKnockoutPairs(teams, tournament) {
    const totalTeams = teams.length;

    const groupCount = Number(
        tournament?.numberOfGroups ??
        tournament?.groupCount ??
        0
    );

    if (
        !Number.isInteger(groupCount) ||
        groupCount < 2 ||
        groupCount > totalTeams
    ) {
        throw new Error("সঠিক Group সংখ্যা নির্বাচন করা হয়নি।");
    }

    // প্রতিটি গ্রুপে সমান সংখ্যক দল থাকতে হবে।
    if (totalTeams % groupCount !== 0) {
        throw new Error(
            `মোট ${totalTeams}টি দলকে ${groupCount}টি সমান গ্রুপে ভাগ করা যাচ্ছে না। Group সংখ্যা পরিবর্তন করো।`
        );
    }

    const groupNames = Array.from(
        { length: groupCount },
        (_, index) => `Group ${String.fromCharCode(65 + index)}`
    );

    const savedAssignments = tournament?.groupAssignments || {};

    const savedGroupNames = Array.isArray(tournament?.groupNames)
        ? tournament.groupNames
        : [];

    const savedAssignmentValid =
        savedGroupNames.length === groupCount &&
        teams.every(team =>
            groupNames.includes(
                String(savedAssignments[getId(team)] || "")
            )
        );

    const groups = groupNames.map(name => ({
        name,
        teams: []
    }));

    if (savedAssignmentValid) {
        // আগে সংরক্ষিত গ্রুপ থাকলে সেটিই ব্যবহার করবে।
        teams.forEach(team => {
            const groupName = savedAssignments[getId(team)];
            const group = groups.find(item => item.name === groupName);

            if (group) {
                group.teams.push({
                    id: getId(team),
                    name: getTeamName(team)
                });
            }
        });
    } else {
        // নতুন গ্রুপ তৈরি: দলগুলো ধারাবাহিকভাবে ভাগ হবে।
        const teamsPerGroup = totalTeams / groupCount;

        teams.forEach((team, index) => {
            const groupIndex = Math.floor(index / teamsPerGroup);

            groups[groupIndex].teams.push({
                id: getId(team),
                name: getTeamName(team)
            });
        });
    }

    // Group Assignment সংরক্ষণ করার আগে পরীক্ষা:
    // কোনো Group Stage ম্যাচ Live/Completed থাকলে
    // পুরোনো গ্রুপের বিন্যাস পরিবর্তন করা যাবে না।
    const existingFixtures = getTournamentFixtures(tournament);

    const protectedGroupFixtures = existingFixtures.filter(fixture => {
        const isGroup =
            fixture.bracketStage === "group" ||
            Boolean(fixture.groupName) ||
            Boolean(fixture.group);

        return isGroup && isProtectedFixture(fixture);
    });

    if (protectedGroupFixtures.length && !savedAssignmentValid) {
        throw new Error(
            "Group Stage-এ Live বা Completed ম্যাচ আছে। ফলাফল নষ্ট হওয়ার ঝুঁকি থাকায় গ্রুপ পুনর্বিন্যাস করা হয়নি।"
        );
    }

    // Tournament record-এ গ্রুপ ও দলগুলোর সম্পর্ক সংরক্ষণ।
    const groupDefinitions = groups.map(group => ({
        name: group.name,
        teamIds: group.teams.map(team => team.id)
    }));

    saveTournamentGroupData(tournament, groupDefinitions);

    // প্রত্যেক গ্রুপের ভিতরে Round Robin Pairing।
    const pairs = [];

    groups.forEach(group => {
        const groupPairs = makeRoundRobinPairs(group.teams);

        groupPairs.forEach(pair => {
            pairs.push({
                ...pair,

                groupName: group.name,
                groupCount,

                groupTeamIds: group.teams.map(team => team.id),

                stage: `${group.name} · Group Stage · Round ${pair.round}`,

                bracketStage: "group",
                matchType: "group-knockout"
            });
        });
    });

    pairs.groupCount = groupCount;
    pairs.groupDefinitions = groupDefinitions;

    return pairs;
}

function makeKnockoutPairs(teams, standings = []) {
    if (!Array.isArray(teams) || teams.length < 2) return [];

    const rankMap = new Map();

    standings.forEach((row, index) => {
        const id = String(
            row.id ?? row.teamId ?? row._id ?? ""
        );

        if (id) {
            rankMap.set(id, {
                rank: index + 1,
                points: Number(row.points) || 0
            });
        }
    });

    const rankedTeams = [...teams].sort((a, b) => {
        const ra = rankMap.get(getId(a));
        const rb = rankMap.get(getId(b));

        if (ra && rb) return ra.rank - rb.rank;
        if (ra) return -1;
        if (rb) return 1;

        return getTeamName(a).localeCompare(getTeamName(b));
    });

    const count = rankedTeams.length;

    if (count === 2) {
        return [{
            teamA: rankedTeams[0],
            teamB: rankedTeams[1],
            round: 1,
            stage: "Final",
            bracketStage: "final",
            knockoutRound: 1,
            progressionKey: "final",
            seedA: 1,
            seedB: 2,
            matchType: "knockout"
        }];
    }

    const bracketSize = 2 ** Math.ceil(Math.log2(count));
    const byeCount = bracketSize - count;
    const preliminaryCount = byeCount;

    const pairs = [];

    // যেসব দল সরাসরি পরের রাউন্ডে যাবে
    const byeTeams = rankedTeams.slice(0, byeCount);

    // Preliminary-তে অংশগ্রহণকারী দল
    const preliminaryTeams = rankedTeams.slice(byeCount);

    for (let i = 0; i < preliminaryCount / 2; i++) {
        const teamA = preliminaryTeams[i];
        const teamB = preliminaryTeams[preliminaryTeams.length - 1 - i];

        pairs.push({
            teamA,
            teamB,
            round: 1,
            stage: "Preliminary Round",
            bracketStage: "preliminary",
            knockoutRound: 1,
            progressionKey: `preliminary-${i + 1}`,
            seedA: rankedTeams.indexOf(teamA) + 1,
            seedB: rankedTeams.indexOf(teamB) + 1,
            matchType: "knockout"
        });
    }

    pairs.byeTeams = byeTeams;
    pairs.rankedTeams = rankedTeams;
    pairs.bracketSize = bracketSize;
    pairs.byeCount = byeCount;

    return pairs;
}

    function createFixture(pair, tournament, index, existingFixtures) {
    const now = new Date().toISOString();

    const roundLabel = pair.stage || `Round ${pair.round || 1}`;

    const id = (
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === "function"
    )
        ? globalThis.crypto.randomUUID()
        : `mc-fixture-${Date.now()}-${index}-${Math.random()
            .toString(36).slice(2, 8)}`;

    const isGroupStage = pair.bracketStage === "group";
    const isKnockout = !isGroupStage && (
        pair.bracketStage ||
        pair.knockoutRound ||
        pair.progressionKey
    );

    return {
        id,

        tournamentId: getId(tournament),
        tournamentName: getTournamentName(tournament),

        homeTeamId: pair.teamA.id,
        homeTeamName: pair.teamA.name,
        awayTeamId: pair.teamB.id,
        awayTeamName: pair.teamB.name,

        teamAId: pair.teamA.id,
        teamAName: pair.teamA.name,
        teamBId: pair.teamB.id,
        teamBName: pair.teamB.name,

        team1Id: pair.teamA.id,
        team1Name: pair.teamA.name,
        team2Id: pair.teamB.id,
        team2Name: pair.teamB.name,

        round: pair.round || 1,
        roundName: roundLabel,
        stage: roundLabel,

        bracketStage: pair.bracketStage || "",
        groupStage: isGroupStage,
        knockoutStage: Boolean(isKnockout),

        groupName: pair.groupName || "",
        groupCount: pair.groupCount || null,
        groupTeamIds: Array.isArray(pair.groupTeamIds)
            ? pair.groupTeamIds
            : [],

        qualificationPosition: pair.qualificationPosition || null,
        seedA: pair.seedA ?? null,
        seedB: pair.seedB ?? null,

        matchNumber: existingFixtures.length + index + 1,
        matchType: isGroupStage
            ? "Group Stage"
            : (getTournamentFormat(tournament) || "Knockout"),

        date: "",
        matchDate: "",
        time: "",
        matchTime: "",

        venue: "",
        venueId: "",
        groundId: "",
        groundName: "",

        notes: "",
        status: "Upcoming",
        completed: false,
        isLive: false,

        source: "MATCHCRAFT_FEATURES",
        generatedFixture: true,

        knockoutRound: pair.knockoutRound || null,
        knockoutRoundIndex: pair.knockoutRoundIndex ?? null,
        progressionKey: pair.progressionKey || "",

        winnerTeamId: "",
        winnerTeamName: "",
        sourceFixtureIds: pair.sourceFixtureIds || [],

        createdAt: now,
        updatedAt: now
    };
}

    /* =====================================================
       PAGE HELPERS
    ===================================================== */

    function getPage() {
        return document.getElementById(PAGE_ID);
    }

    function showNotice(message, type = "info") {
        const page = getPage();

        if (!page) return;

        let notice = $("#featuresNotice", page);

        if (!notice) {
            notice = document.createElement("div");
            notice.id = "featuresNotice";
            notice.className = "features-notice";
            notice.setAttribute("role", "status");
            notice.setAttribute("aria-live", "polite");

            const header = $(".features-header", page);

            if (header) {
                header.insertAdjacentElement("afterend", notice);
            } else {
                page.prepend(notice);
            }
        }

        notice.className = `features-notice features-notice--${type}`;

        notice.innerHTML = `
            <i class="fa-solid ${
                type === "error" ? "fa-circle-exclamation" :
                type === "success" ? "fa-circle-check" :
                type === "warning" ? "fa-triangle-exclamation" :
                "fa-circle-info"
            }" aria-hidden="true"></i>
            <span>${escapeHTML(message)}</span>
        `;

        if (noticeTimer) clearTimeout(noticeTimer);

        noticeTimer = setTimeout(() => {
            if (notice.isConnected) notice.remove();
        }, 6500);
    }

    /* =====================================================
       BUILD PAGE
    ===================================================== */

    function buildPage() {
        const page = getPage();

        if (!page) return;

        page.innerHTML = `
            <div class="features-header">
                <div>
                    <p class="features-eyebrow">MATCHCRAFT CRICKET / SCHEDULING</p>
                    <h1 class="features-title">Match Pairing &amp; Schedule</h1>
                    <p class="features-subtitle">
                        Select an existing tournament to view its teams and create
                        match pairings according to its format.
                    </p>
                </div>

                <div class="features-header-icon" aria-hidden="true">
                    <i class="fa-solid fa-calendar-check"></i>
                </div>
            </div>

            <div class="features-stats">
                <article class="features-stat-card">
                    <div class="features-stat-icon">
                        <i class="fa-solid fa-calendar-days"></i>
                    </div>
                    <div>
                        <p class="features-stat-label">Tournament Matches</p>
                        <p class="features-stat-value" id="featuresTotalMatches">0</p>
                    </div>
                </article>

                <article class="features-stat-card">
                    <div class="features-stat-icon">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <div>
                        <p class="features-stat-label">Participating Teams</p>
                        <p class="features-stat-value" id="featuresTotalTeams">0</p>
                    </div>
                </article>

                <article class="features-stat-card">
                    <div class="features-stat-icon">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <div>
                        <p class="features-stat-label">Upcoming Matches</p>
                        <p class="features-stat-value" id="featuresUpcomingMatches">0</p>
                    </div>
                </article>
            </div>

            <section class="features-panel">
                <div class="features-panel-heading">
                    <div>
                        <h2>Select Tournament</h2>
                        <p>
                            Existing tournament and team data will be used.
                            You do not need to create them again.
                        </p>
                    </div>
                    <i class="fa-solid fa-trophy" aria-hidden="true"></i>
                </div>

                <div class="features-form-grid">
                    <div class="features-field features-field--full">
                        <label class="features-label" for="featuresTournamentSelect">
                            Tournament <span class="features-required">*</span>
                        </label>
                        <select class="features-select" id="featuresTournamentSelect">
                            <option value="">Loading tournaments...</option>
                        </select>
                        <p class="features-field-help">
                            Choose a saved tournament to load its teams and schedule.
                        </p>
                    </div>
                </div>
            </section>

            <section class="features-panel" id="featuresTournamentPanel" hidden>
                <div class="features-panel-heading">
                    <div>
                        <h2>Selected Tournament</h2>
                        <p>Review the tournament format and participating teams.</p>
                    </div>
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                </div>

                <div class="features-selected-tournament">
                    <div>
                        <h3 id="featuresSelectedName">—</h3>
                        <p id="featuresSelectedDetails">Select a tournament.</p>
                    </div>
                    <span class="features-pill" id="featuresFormatBadge">FORMAT</span>
                </div>

                <div class="features-team-preview" id="featuresTeamPreview"></div>

                <div class="features-form-actions">
                    <button type="button" class="features-btn features-btn--primary"
                        id="featuresGenerateBtn">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        Generate Match Pairing
                    </button>

                    <button type="button" class="features-btn features-btn--secondary"
                        id="featuresRefreshBtn">
                        <i class="fa-solid fa-rotate"></i>
                        Refresh Data
                    </button>
                </div>

                <div class="features-footer-note">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>
                        Existing fixtures are preserved. Group Stage matches are
generated here. After all Group Stage matches are completed,
qualified teams and Knockout rounds are generated automatically.
                    </span>
                </div>
            </section>

            <section class="features-panel" id="featuresKnockoutPanel">
    <div class="features-panel-heading">
        <div>
            <h2>Knockout Schedule</h2>
            <p>Qualified teams, byes and knockout match progression.</p>
        </div>
        <i class="fa-solid fa-trophy" aria-hidden="true"></i>
    </div>

    <div id="featuresKnockoutList">
        <div class="features-empty">
            <h3>Knockout Schedule Not Available</h3>
            <p>Generate the Group Stage schedule and complete its matches first.</p>
        </div>
    </div>
</section>

            <section class="features-panel">
                <div class="features-panel-heading">
                    <div>
                        <h2>Match Schedule</h2>
                        <p>All saved fixtures for the selected tournament.</p>
                    </div>
                    <i class="fa-solid fa-calendar-week" aria-hidden="true"></i>
                </div>

                <div class="features-schedule-toolbar">
                    <p id="featuresScheduleDescription">
                        Select a tournament to view its schedule.
                    </p>
                    <button type="button" class="features-btn features-btn--secondary"
                        id="featuresScheduleRefreshBtn">
                        <i class="fa-solid fa-arrows-rotate"></i>
                        Reload Schedule
                    </button>
                </div>

                <div class="features-match-list" id="featuresMatchList"></div>

                <div class="features-empty" id="featuresScheduleEmpty">
                    <div class="features-empty-icon">
                        <i class="fa-solid fa-calendar-xmark"></i>
                    </div>
                    <h3>No Schedule to Display</h3>
                    <p>
                        Select a tournament above. If its teams are linked correctly,
                        the pairing can be generated according to the tournament format.
                    </p>
                </div>
            </section>
        `;

        bindEvents();
        refreshTournamentOptions();
    }

    /* =====================================================
       TOURNAMENT SELECT
    ===================================================== */

    function refreshTournamentOptions() {
        const page = getPage();
        const select = $("#featuresTournamentSelect", page);

        if (!select) return;

        const tournaments = readTournaments();
        const previousValue = selectedTournamentId || select.value;

        select.innerHTML = `
            <option value="">Select Tournament</option>
            ${tournaments.map(tournament => {
                const name = getTournamentName(tournament);

                const season = tournament.season
                    ? ` — Season ${tournament.season}`
                    : "";

                const format = tournament.typeLabel ||
                    getTournamentFormat(tournament);

                return `
                    <option value="${escapeHTML(getId(tournament))}">
                        ${escapeHTML(name)}
                        ${escapeHTML(season)}
                        ${format ? ` (${escapeHTML(format)})` : ""}
                    </option>
                `;
            }).join("")}
        `;

        if (!tournaments.length) {
            select.innerHTML = `
                <option value="">No saved tournaments found</option>
            `;

            selectedTournamentId = "";

            renderSelectedTournament();
            renderSchedule();

            return;
        }

        const stillExists = tournaments.some(
            tournament => getId(tournament) === previousValue
        );

        if (stillExists) {
            select.value = previousValue;
        } else {
            select.value = "";
            selectedTournamentId = "";
        }

        if (select.value) {
            selectedTournamentId = select.value;
        }

        renderSelectedTournament();
        renderSchedule();
    }

    function getSelectedTournament() {
        return readTournaments().find(
            tournament => getId(tournament) === selectedTournamentId
        ) || null;
    }

    /* =====================================================
       RENDER SELECTED TOURNAMENT + TEAM LOGOS
    ===================================================== */

    function renderSelectedTournament() {
        const page = getPage();

        if (!page) return;

        const panel = $("#featuresTournamentPanel", page);
        const tournament = getSelectedTournament();
        const generateButton = $("#featuresGenerateBtn", page);

        if (generateButton) {
            generateButton.hidden = false;
            generateButton.style.display = "";
        }

        if (!panel) return;

        if (!tournament) {
            panel.hidden = true;

            const totalTeams = $("#featuresTotalTeams", page);
            const totalMatches = $("#featuresTotalMatches", page);
            const upcomingMatches = $("#featuresUpcomingMatches", page);

            if (totalTeams) totalTeams.textContent = "0";
            if (totalMatches) totalMatches.textContent = "0";
            if (upcomingMatches) upcomingMatches.textContent = "0";

            return;
        }

        panel.hidden = false;

        const teams = getTournamentTeams(tournament);
        const fixtures = getTournamentFixtures(tournament);
        const format = getTournamentFormat(tournament) || "Custom";

        const selectedName = $("#featuresSelectedName", page);
        const selectedDetails = $("#featuresSelectedDetails", page);
        const formatBadge = $("#featuresFormatBadge", page);
        const totalTeams = $("#featuresTotalTeams", page);
        const totalMatches = $("#featuresTotalMatches", page);
        const upcomingMatches = $("#featuresUpcomingMatches", page);

        if (selectedName) {
            selectedName.textContent = getTournamentName(tournament);
        }

        if (selectedDetails) {
            selectedDetails.textContent =
                `${format} · ${teams.length} linked team${teams.length === 1 ? "" : "s"}`;
        }

        if (formatBadge) {
            formatBadge.textContent = format.toUpperCase();
        }

        if (totalTeams) {
            totalTeams.textContent = String(teams.length);
        }

        if (totalMatches) {
            totalMatches.textContent = String(fixtures.length);
        }

        if (upcomingMatches) {
            upcomingMatches.textContent = String(
                fixtures.filter(
                    fixture => getFixtureStatus(fixture) === "upcoming"
                ).length
            );
        }

        const preview = $("#featuresTeamPreview", page);

        if (!preview) return;

        if (teams.length === 0) {
            preview.innerHTML = `
                <div class="features-empty" style="grid-column:1/-1">
                    <div class="features-empty-icon">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <h3>No Linked Teams Found</h3>
                    <p>
                        No teams could be matched to this tournament.
                        Check the team-to-tournament assignment in Teams &amp; Squads.
                        No unrelated teams will be added automatically.
                    </p>
                </div>
            `;

            return;
        }

     const isGroupKnockout =
    normalizeFormat(getTournamentFormat(tournament)) === "group-knockout";

if (isGroupKnockout) {
    const groupCount = Number(
        tournament.numberOfGroups ??
        tournament.groupCount ??
        0
    );

    const groupNames = Array.from(
        { length: groupCount },
        (_, index) => `Group ${String.fromCharCode(65 + index)}`
    );

    const assignments = tournament.groupAssignments || {};

    const validSavedGroups =
        Array.isArray(tournament.groupNames) &&
        tournament.groupNames.length === groupCount &&
        teams.every(team =>
            groupNames.includes(
                String(assignments[getId(team)] || "")
            )
        );

    const teamsPerGroup =
        groupCount > 0 && teams.length % groupCount === 0
            ? teams.length / groupCount
            : 0;

    const groups = groupNames.map((groupName, groupIndex) => {
        const groupTeams = validSavedGroups
            ? teams.filter(team =>
                String(assignments[getId(team)] || "") === groupName
            )
            : teams.slice(
                groupIndex * teamsPerGroup,
                (groupIndex + 1) * teamsPerGroup
            );

        return {
            name: groupName,
            teams: groupTeams
        };
    });

    preview.innerHTML = groups.map(group => `
        <section class="features-group-card"
            style="
                grid-column:1/-1;
                padding:18px;
                margin-bottom:12px;
                border:1px solid rgba(255,255,255,.12);
                border-radius:14px;
                background:rgba(255,255,255,.035);
            ">

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-bottom:14px;
                flex-wrap:wrap;
            ">
                <h3 style="margin:0;font-size:16px;">
                    <i class="fa-solid fa-people-group"
                        style="margin-right:8px;"></i>
                    ${escapeHTML(group.name)}
                </h3>

                <span class="features-pill">
                    ${group.teams.length} Teams
                </span>
            </div>

            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
                gap:10px;
            ">
                ${group.teams.map((team, index) => `
                    <article class="features-team-card">
                        <div class="features-team-avatar">
                            ${
                                team.logo
                                    ? `<img
                                        src="${escapeHTML(team.logo)}"
                                        alt="${escapeHTML(getTeamName(team))} logo"
                                        loading="lazy"
                                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                                    >`
                                    : `<i class="fa-solid fa-shield-halved"
                                        aria-hidden="true"></i>`
                            }
                        </div>

                        <div>
                            <h4>${escapeHTML(getTeamName(team))}</h4>
                            <p>${escapeHTML(group.name)} · Team ${index + 1}</p>
                        </div>
                    </article>
                `).join("")}
            </div>
        </section>
    `).join("");

} else {
    preview.innerHTML = teams.map((team, index) => {
        const teamName = getTeamName(team);
        const logo = typeof team.logo === "string"
            ? team.logo.trim()
            : "";

        return `
            <article class="features-team-card">
                <div class="features-team-avatar">
                    ${
                        logo
                            ? `<img
                                src="${escapeHTML(logo)}"
                                alt="${escapeHTML(teamName)} logo"
                                loading="lazy"
                                style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                            >`
                            : `<i class="fa-solid fa-shield-halved"
                                aria-hidden="true"></i>`
                    }
                </div>

                <div>
                    <h4>${escapeHTML(teamName)}</h4>
                    <p>Team ${index + 1}</p>
                </div>
            </article>
        `;
    }).join("");
}

renderKnockoutSchedule();

    }

    /* =====================================================
       RENDER MATCH SCHEDULE + TEAM LOGOS
    ===================================================== */

    function renderSchedule() {
        const page = getPage();

        if (!page) return;

        const list = $("#featuresMatchList", page);
        const empty = $("#featuresScheduleEmpty", page);
        const description = $("#featuresScheduleDescription", page);

        const tournament = getSelectedTournament();

        if (!tournament) {
            list.innerHTML = "";

            empty.hidden = false;

            description.textContent =
                "Select a tournament to view its schedule.";

                renderKnockoutSchedule();

            $("#featuresTotalMatches", page).textContent = "0";
            $("#featuresUpcomingMatches", page).textContent = "0";

            return;
        }

        const fixtures = getTournamentFixtures(tournament);

        $("#featuresTotalMatches", page).textContent =
            String(fixtures.length);

        $("#featuresUpcomingMatches", page).textContent = String(
            fixtures.filter(fixture =>
                getFixtureStatus(fixture) === "upcoming"
            ).length
        );

        description.textContent =
            `${getTournamentName(tournament)} · ${fixtures.length} saved match(es)`;

        if (!fixtures.length) {
    list.innerHTML = "";
    empty.hidden = false;
    renderKnockoutSchedule();
    return;
}

        empty.hidden = true;

        list.innerHTML = fixtures.map((fixture, index) => {
            const status = getFixtureStatus(fixture);

            const statusLabel = {
                upcoming: "UPCOMING",
                live: "LIVE",
                completed: "COMPLETED",
                cancelled: "CANCELLED"
            }[status] || "UPCOMING";

            const statusClass = status === "live"
                ? "features-match-status--live"
                : status === "completed"
                    ? "features-match-status--completed"
                    : "";

            const date = getFixtureDate(fixture);
            const time = getFixtureTime(fixture);
            const venue = getFixtureVenue(fixture);

            const round = String(
                fixture.roundName ??
                fixture.stage ??
                fixture.round ??
                "Scheduled Match"
            );

            const homeId = getHomeTeamId(fixture);
            const awayId = getAwayTeamId(fixture);

            return `
                <article class="features-match-card">
                    <div class="features-match-top">
                        <span class="features-match-number">
                            MATCH ${escapeHTML(fixture.matchNumber ?? index + 1)}
                        </span>

                        <span class="features-match-status ${statusClass}">
                            ${escapeHTML(statusLabel)}
                        </span>
                    </div>

                    <div class="features-match-body">
                        <div class="features-match-stage">
                            ${escapeHTML(round)}
                        </div>

                        <div class="features-match-teams">
                            <div class="features-match-team">
                                ${renderTeamIdentity(
                                    homeId,
                                    getHomeTeamName(fixture),
                                    true
                                )}
                                <small>Team A</small>
                            </div>

                            <span class="features-match-vs">VS</span>

                            <div class="features-match-team">
                                ${renderTeamIdentity(
                                    awayId,
                                    getAwayTeamName(fixture),
                                    true
                                )}
                                <small>Team B</small>
                            </div>
                        </div>

                        <div class="features-match-meta">
                            ${date ? `
                                <span>
                                    <i class="fa-regular fa-calendar"
                                        aria-hidden="true"></i>
                                    ${escapeHTML(date)}
                                </span>
                            ` : ""}

                            ${time ? `
                                <span>
                                    <i class="fa-regular fa-clock"
                                        aria-hidden="true"></i>
                                    ${escapeHTML(time)}
                                </span>
                            ` : ""}

                            ${venue ? `
                                <span>
                                    <i class="fa-solid fa-location-dot"
                                        aria-hidden="true"></i>
                                    ${escapeHTML(venue)}
                                </span>
                            ` : ""}
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        renderKnockoutSchedule();

    }

 function renderKnockoutSchedule() {
    const page = getPage();
    if (!page) return;

    const container = $("#featuresKnockoutList", page);
    const tournament = getSelectedTournament();

    if (!container) return;

    if (!tournament) {
        container.innerHTML = `
            <div class="features-empty">
                <h3>Knockout Schedule Not Available</h3>
                <p>Select a tournament to view its knockout schedule.</p>
            </div>
        `;
        return;
    }

    const fixtures = getTournamentFixtures(tournament);

    /*
     * Statistics.js থেকে তৈরি Knockout fixture শনাক্ত করবে।
     * Group Stage-এর ম্যাচ এখানে দেখানো হবে না।
     */
    const knockoutFixtures = fixtures.filter(fixture => {
        const stage = normalizeText(
            fixture.bracketStage ??
            fixture.stage ??
            fixture.roundName ??
            ""
        );

        const isGroup = (
            fixture.groupStage === true ||
            fixture.bracketStage === "group" ||
            stage === "group" ||
            stage.includes("group stage") ||
            Boolean(fixture.groupName)
        );

        if (isGroup) return false;

        return (
            fixture.knockoutStage === true ||
            (
                fixture.knockoutRoundIndex !== undefined &&
                fixture.knockoutRoundIndex !== null
            ) ||
            (
                fixture.knockoutRound !== undefined &&
                fixture.knockoutRound !== null
            ) ||
            stage.includes("preliminary") ||
            stage.includes("quarter") ||
            stage.includes("semi") ||
            stage.includes("final") ||
            stage.includes("knockout")
        );
    });

    /*
     * Statistics.js-এর সংরক্ষিত Knockout State।
     */
    const state = tournament.knockoutState || {};

    const qualifiers = Array.isArray(state.qualifiers)
        ? state.qualifiers
        : [];

    const byeTeamIds = Array.isArray(state.byeTeamIds)
        ? state.byeTeamIds.map(String)
        : [];

    /*
     * Qualifier-এর ID বের করবে।
     * Statistics.js-এর বিভিন্ন object structure
     * থাকলেও যেন কাজ করে।
     */
    const getQualifierId = item => {
        if (item && typeof item === "object") {
            return String(
                item.id ??
                item.teamId ??
                item._id ??
                ""
            );
        }

        return String(item ?? "");
    };

    const getQualifierName = item => {
        if (item && typeof item === "object") {
            return String(
                item.name ??
                item.teamName ??
                getTeamName(getTeamById(getQualifierId(item)) || {})
            );
        }

        const team = getTeamById(item);

        return team
            ? getTeamName(team)
            : "Unknown Team";
    };

    /*
     * Round-এর ক্রম নির্ধারণ।
     * knockoutRoundIndex থাকলে সেটিই প্রধান।
     */
    const getRoundOrder = fixture => {
        const roundIndex = Number(fixture.knockoutRoundIndex);

        if (Number.isFinite(roundIndex) && roundIndex > 0) {
            return roundIndex;
        }

        const text = normalizeText(
            fixture.roundName ??
            fixture.stage ??
            fixture.bracketStage ??
            ""
        );

        if (text.includes("preliminary")) return 1;
        if (text.includes("quarter")) return 1;
        if (text.includes("semi")) return 2;
        if (text.includes("final")) return 3;

        return 99;
    };

    knockoutFixtures.sort((a, b) => {
        const difference =
            getRoundOrder(a) - getRoundOrder(b);

        if (difference !== 0) return difference;

        return Number(a.matchNumber || 0) -
            Number(b.matchNumber || 0);
    });

    /*
     * Qualifier ও Bye-এর তথ্য দেখাবে।
     */
    let qualificationMarkup = "";

    if (qualifiers.length) {
        const byeTeams = qualifiers.filter(item =>
            byeTeamIds.includes(getQualifierId(item))
        );

        qualificationMarkup = `
            <div style="
                padding:16px;
                margin-bottom:16px;
                border:1px solid rgba(255,255,255,.12);
                border-radius:14px;
                background:rgba(255,255,255,.035);
            ">
                <h3 style="margin:0 0 14px;">
                    <i class="fa-solid fa-circle-check"></i>
                    Qualified Teams
                </h3>

                <div style="
                    display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
                    gap:10px;
                ">
                    ${qualifiers.map((item, index) => {
                        const id = getQualifierId(item);
                        const isBye = byeTeamIds.includes(id);

                        return `
                            <article style="
                                padding:12px;
                                border-radius:10px;
                                background:rgba(255,255,255,.045);
                            ">
                                <div style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:space-between;
                                    gap:8px;
                                ">
                                    <strong>${index + 1}. ${escapeHTML(
                                        getQualifierName(item)
                                    )}</strong>

                                    ${isBye ? `
                                        <span class="features-pill">
                                            BYE
                                        </span>
                                    ` : ""}
                                </div>
                            </article>
                        `;
                    }).join("")}
                </div>

                ${byeTeams.length ? `
                    <div style="
                        margin-top:14px;
                        padding:12px;
                        border-radius:10px;
                        background:rgba(255,255,255,.035);
                    ">
                        <strong>
                            <i class="fa-solid fa-forward"></i>
                            Direct Semi-Final Qualification
                        </strong>

                        <div style="
                            display:grid;
                            gap:8px;
                            margin-top:10px;
                        ">
                            ${byeTeams.map(item => `
                                <div>
                                    ${escapeHTML(getQualifierName(item))}
                                    — Direct Bye
                                </div>
                            `).join("")}
                        </div>
                    </div>
                ` : ""}
            </div>
        `;
    }

    /*
     * Knockout ম্যাচ এখনো তৈরি না হলে
     * Qualification-এর অবস্থা দেখাবে।
     */
    if (!knockoutFixtures.length) {
        container.innerHTML = `
            ${qualificationMarkup}

            <div class="features-empty">
                <h3>No Knockout Matches Yet</h3>
                <p>
                    All Group Stage matches must be completed.
                    Qualified teams and knockout fixtures will
                    then appear automatically.
                </p>
            </div>
        `;
        return;
    }

    /*
     * Round অনুযায়ী ম্যাচ সাজানো।
     */
    const grouped = new Map();

    knockoutFixtures.forEach(fixture => {
        const roundIndex = getRoundOrder(fixture);

        const stage = String(
            fixture.roundName ??
            fixture.stage ??
            fixture.bracketStage ??
            "Knockout"
        );

        const groupKey = `${roundIndex}::${stage}`;

        if (!grouped.has(groupKey)) {
            grouped.set(groupKey, {
                order: roundIndex,
                name: stage,
                matches: []
            });
        }

        grouped.get(groupKey).matches.push(fixture);
    });

    const rounds = Array.from(grouped.values())
        .sort((a, b) => a.order - b.order);

    const roundsMarkup = rounds.map(round => `
        <div style="
            padding:16px;
            margin-bottom:14px;
            border:1px solid rgba(255,255,255,.12);
            border-radius:14px;
            background:rgba(255,255,255,.035);
        ">
            <h3 style="margin:0 0 14px;">
                <i class="fa-solid fa-trophy"></i>
                ${escapeHTML(round.name)}
            </h3>

            <div style="display:grid;gap:12px;">
                ${round.matches.map((fixture, index) => {
                    const status = getFixtureStatus(fixture);

                    const statusLabel = {
                        upcoming: "UPCOMING",
                        live: "LIVE",
                        completed: "COMPLETED",
                        cancelled: "CANCELLED"
                    }[status] || "UPCOMING";

                    return `
                        <article style="
                            padding:14px;
                            border-radius:10px;
                            background:rgba(255,255,255,.045);
                        ">
                            <div style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:10px;
                                margin-bottom:12px;
                                flex-wrap:wrap;
                            ">
                                <strong>
                                    Match ${escapeHTML(
                                        fixture.matchNumber ?? index + 1
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(statusLabel)}
                                </span>
                            </div>

                            <div style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:10px;
                                flex-wrap:wrap;
                            ">
                                ${renderTeamIdentity(
                                    getHomeTeamId(fixture),
                                    getHomeTeamName(fixture),
                                    true
                                )}

                                <strong>VS</strong>

                                ${renderTeamIdentity(
                                    getAwayTeamId(fixture),
                                    getAwayTeamName(fixture),
                                    true
                                )}
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        </div>
    `).join("");

    container.innerHTML = `
        ${qualificationMarkup}
        ${roundsMarkup}
    `;
}

    function isProtectedFixture(fixture) {
    const status = String(fixture.status || "").toLowerCase();

    const hasScore =
        Number(fixture.team1Score ?? fixture.homeScore ?? 0) > 0 ||
        Number(fixture.team2Score ?? fixture.awayScore ?? 0) > 0 ||
        Number(fixture.runs1 ?? 0) > 0 ||
        Number(fixture.runs2 ?? 0) > 0;

    return (
        fixture.completed === true ||
        fixture.isLive === true ||
        ["live", "completed", "finished", "full time"].includes(status) ||
        hasScore
    );
}

    /* =====================================================
       GENERATE MATCH PAIRINGS
    ===================================================== */

 function generatePairings() {
    try {
        const tournament = getSelectedTournament();

        if (!tournament) {
            showNotice("প্রথমে একটি টুর্নামেন্ট নির্বাচন করো।", "warning");
            return;
        }

        const teams = getTournamentTeams(tournament);

        if (!Array.isArray(teams) || teams.length < 2) {
            showNotice(
                "এই টুর্নামেন্টের সঙ্গে অন্তত ২টি দল যুক্ত থাকতে হবে।",
                "warning"
            );
            return;
        }

        const format = normalizeFormat(getTournamentFormat(tournament));

        console.log("========== MATCHCRAFT DEBUG ==========");
        console.log("Selected Tournament:", tournament);
        console.log("Tournament ID:", getId(tournament));
        console.log("Tournament Format:", getTournamentFormat(tournament));
        console.log("Normalized Format:", format);
        console.log("Number of Groups:", tournament.numberOfGroups);
        console.log("Selected Teams:", teams);
        console.log("Total Teams:", teams.length);

        if (format === "custom") {
            showNotice("এই টুর্নামেন্টের ফরম্যাটটি চেনা যায়নি।", "warning");
            return;
        }

        let pairs = [];

        if (format === "group-knockout") {
            pairs = makeGroupKnockoutPairs(teams, tournament);

        } else if (format === "knockout") {
            let standings = [];

            if (
                window.CricketStatistics &&
                typeof window.CricketStatistics.readAll === "function" &&
                typeof window.CricketStatistics.buildStandings === "function"
            ) {
                const data = window.CricketStatistics.readAll();

                if (
                    data &&
                    Array.isArray(data.teams) &&
                    Array.isArray(data.matches)
                ) {
                    standings = window.CricketStatistics.buildStandings(data);
                }
            }

            pairs = makeKnockoutPairs(teams, standings);

        } else if (format === "league" || format === "group") {
            pairs = makeRoundRobinPairs(teams);

        } else {
            showNotice("এই ফরম্যাটের পেয়ারিং তৈরি করা যাচ্ছে না।", "warning");
            return;
        }

        console.log("Generated Pair Count:", pairs.length);
        console.log("Generated Group Count:", pairs.groupCount);
        console.log("Generated Groups:", pairs.groupDefinitions);
        console.log("Generated Pairs:", pairs);
        console.log("====================================");

        if (!Array.isArray(pairs) || pairs.length === 0) {
            showNotice("কোনো ম্যাচ পেয়ারিং তৈরি করা যায়নি।", "warning");
            return;
        }

        const allFixtures = readFixtures();
        const tournamentFixtures = getTournamentFixtures(tournament);

        // আগের সব টুর্নামেন্টের ম্যাচ সংরক্ষণ।
        const retainedFixtures = allFixtures.slice();

        // শুধু এই Features পেজ থেকে তৈরি Group Stage ম্যাচ শনাক্ত।
        const isGroupGenerated = fixture =>
            fixture.generatedFixture === true &&
            fixture.source === "MATCHCRAFT_FEATURES" &&
            (
                fixture.groupStage === true ||
                fixture.bracketStage === "group" ||
                Boolean(fixture.groupName) ||
                String(fixture.matchType || "")
                    .toLowerCase()
                    .includes("group")
            );

        const existingGroupFixtures = tournamentFixtures.filter(
            isGroupGenerated
        );

        // Duplicate prevention।
        const existingKeys = new Set();

        if (format === "group-knockout") {
            existingGroupFixtures.forEach(fixture => {
                const a = String(
                    fixture.teamAId ??
                    fixture.homeTeamId ??
                    fixture.team1Id ??
                    ""
                );

                const b = String(
                    fixture.teamBId ??
                    fixture.awayTeamId ??
                    fixture.team2Id ??
                    ""
                );

                if (!a || !b) return;

                const ids = [a, b].sort();

                const stage = String(
                    fixture.roundName ??
                    fixture.stage ??
                    fixture.groupName ??
                    ""
                ).trim().toLowerCase();

                existingKeys.add(
                    `${ids[0]}::${ids[1]}::${stage}`
                );
            });

        } else {
            getExistingPairKeys(tournamentFixtures).forEach(key => {
                existingKeys.add(key);
            });
        }

        const newPairs = pairs.filter(pair => {
            let key;

            if (format === "group-knockout") {
                const ids = [
                    String(pair.teamA.id),
                    String(pair.teamB.id)
                ].sort();

                const stage = String(
                    pair.stage || ""
                ).trim().toLowerCase();

                key = `${ids[0]}::${ids[1]}::${stage}`;

            } else {
                key = makePairKey(
                    pair.teamA.id,
                    pair.teamB.id,
                    pair.round
                );
            }

            if (existingKeys.has(key)) {
                return false;
            }

            existingKeys.add(key);
            return true;
        });

        if (newPairs.length === 0) {
            renderSelectedTournament();
            renderSchedule();

            showNotice(
                "নতুন কোনো ম্যাচ তৈরি করার প্রয়োজন নেই।",
                "info"
            );
            return;
        }

        console.log("NEW PAIRS:", newPairs);
        console.log("EXISTING TOURNAMENT FIXTURES:", tournamentFixtures);
        console.log("RETAINED FIXTURES:", retainedFixtures);
        console.log("GENERATED FIXTURES WILL BE CREATED:", newPairs.length);

        const generatedFixtures = newPairs.map((pair, index) =>
            createFixture(
                pair,
                tournament,
                index + 1,
                retainedFixtures
            )
        );

        console.log("NEW FIXTURE DETAILS:", generatedFixtures);

        console.table(
            generatedFixtures.map(fixture => ({
                tournamentId: fixture.tournamentId,
                tournamentName: fixture.tournamentName,
                groupName: fixture.groupName,
                stage: fixture.stage,
                teamA: fixture.teamAName,
                teamB: fixture.teamBName,
                teamAId: fixture.teamAId,
                teamBId: fixture.teamBId,
                status: fixture.status
            }))
        );

        if (!generatedFixtures.length) {
            showNotice("ম্যাচ তৈরি করা যায়নি।", "error");
            return;
        }

        const updatedFixtures = [
            ...retainedFixtures,
            ...generatedFixtures
        ];

        if (!writeFixtures(updatedFixtures)) {
            showNotice("ম্যাচ LocalStorage-এ সংরক্ষণ করা যায়নি।", "error");
            return;
        }

        window.dispatchEvent(
            new CustomEvent("matchcraft:matches-updated")
        );

        if (
            window.MATCHCRAFT_MATCH &&
            typeof window.MATCHCRAFT_MATCH.refresh === "function"
        ) {
            window.MATCHCRAFT_MATCH.refresh();
        }

        renderSelectedTournament();
        renderSchedule();

        showNotice(
            `${generatedFixtures.length}টি নতুন ম্যাচ তৈরি ও সংরক্ষণ হয়েছে।`,
            "success"
        );

    } catch (error) {
        console.error("[MATCHCRAFT] Generate Pairings Error:", error);

        showNotice(
            "ম্যাচ তৈরির সমস্যা: " + (error.message || error),
            "error"
        );
    }
}

    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {
        const page = getPage();

        if (!page) return;

        const tournamentSelect = $("#featuresTournamentSelect", page);

        if (tournamentSelect) {
            tournamentSelect.addEventListener("change", () => {
                selectedTournamentId = tournamentSelect.value || "";

                renderSelectedTournament();
                renderSchedule();
            });
        }

        const generateButton = $("#featuresGenerateBtn", page);

        if (generateButton) {
            generateButton.addEventListener("click", event => {
                event.preventDefault();

                try {
                    generatePairings();
                } catch (error) {
                    console.error(
                        "[MATCHCRAFT FEATURES] Pairing error:",
                        error
                    );

                    showNotice(
                        "ম্যাচ পেয়ারিং তৈরি করতে সমস্যা হয়েছে।",
                        "error"
                    );
                }
            });
        }

        const refreshButton = $("#featuresRefreshBtn", page);

        if (refreshButton) {
            refreshButton.addEventListener("click", event => {
                event.preventDefault();

                refreshTournamentOptions();

                if (selectedTournamentId) {
                    renderSelectedTournament();
                    renderSchedule();
                }

                showNotice(
                    "টুর্নামেন্ট ও শিডিউলের তথ্য রিফ্রেশ করা হয়েছে।",
                    "success"
                );
            });
        }

        const scheduleRefreshButton = $(
            "#featuresScheduleRefreshBtn",
            page
        );

        if (scheduleRefreshButton) {
            scheduleRefreshButton.addEventListener("click", event => {
                event.preventDefault();

                renderSelectedTournament();
                renderSchedule();

                showNotice(
                    "ম্যাচ শিডিউল রিলোড করা হয়েছে।",
                    "success"
                );
            });
        }
    }

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initialize() {
        if (initialized) return;

        const page = getPage();

        if (!page) return;

        buildPage();

        initialized = true;
    }

    document.addEventListener("click", event => {
        const link = event.target.closest('[data-page="features"]');

        if (!link) return;

        initialize();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }

    window.MATCHCRAFT_FEATURES = {
        refresh() {
            initialize();
            refreshTournamentOptions();

            if (selectedTournamentId) {
                renderSelectedTournament();
                renderSchedule();
            }
        }
    };

    /* =====================================================
       AUTOMATIC SCHEDULE REFRESH
       Match Center / Statistics থেকে ম্যাচ আপডেট হলে
       Features page-ও রিফ্রেশ হবে।
    ===================================================== */

    function refreshFeatureViews() {
        if (!initialized || !getPage()) return;

        refreshTournamentOptions();

        if (selectedTournamentId) {
            renderSelectedTournament();
            renderSchedule();
        }
    }

    window.addEventListener("matchcraft:matches-updated", () => {
        refreshFeatureViews();
    });

    window.addEventListener("matchcraft:datachange", () => {
        refreshFeatureViews();
    });

    window.addEventListener("storage", event => {
        if (
            event.key === STORAGE.fixtures ||
            event.key === STORAGE.tournaments ||
            event.key === STORAGE.teams
        ) {
            refreshFeatureViews();
        }
    });

})();