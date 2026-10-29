/* =========================================================
MATCHCRAFT CRICKET — STATISTICS & AWARDS
File: award.js

Compatible with match.js:
liveData.innings[].batters = Object
liveData.innings[].bowlers = Object
liveData.innings[].events = Array

Includes:

- Tournament overview and filters
- Correct batting / bowling analytics
- Orange Cap / Purple Cap
- Most Fours / Sixes / Best Strike Rate / Economy
- Player profiles and team statistics
- Automatic and manual awards
- Match-wise Man of the Match
- Final Man of the Match
- LocalStorage persistence
- Print / Save PDF
- QR placeholder for future integration
  ========================================================= */

(() => {
"use strict";

const MODULE_ID = "matchcraft-awards";
const ROOT_ID = "statistics";
const AWARDS_KEY = "matchcraft_cricket_awards";

const STORAGE = {
    tournaments: [
        "matchcraft_cricket_tournaments",
        "cricket_tournaments",
        "tournaments"
    ],
    teams: [
        "matchcraft_cricket_teams",
        "cricket_teams",
        "teams"
    ],
    players: [
        "matchcraft_cricket_players",
        "cricket_players",
        "players"
    ],
    matches: [
        "matchcraft_cricket_matches",
        "cricket_matches",
        "matches"
    ],
    fixtures: [
        "matchcraft_cricket_fixtures",
        "cricket_fixtures",
        "fixtures"
    ]
};

const state = {
    root: null,
    tournaments: [],
    teams: [],
    players: [],
    matches: [],
    tournamentId: "all",
    search: "",
    message: ""
};

const $ = (selector, root = state.root) =>
    root ? root.querySelector(selector) : null;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function readJSON(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("[MATCHCRAFT Awards] Storage read failed:", key, error);
        return null;
    }
}

function readFirstArray(keys) {
    for (const key of keys) {
        const value = readJSON(key);

        if (Array.isArray(value)) return value;

        if (value && typeof value === "object") {
            for (const property of [
                "items", "data", "records", "tournaments",
                "teams", "players", "matches", "fixtures"
            ]) {
                if (Array.isArray(value[property])) return value[property];
            }
        }
    }

    return [];
}

function getId(item) {
    return item?.id ??
        item?._id ??
        item?.matchId ??
        item?.tournamentId ??
        item?.playerId ??
        item?.teamId ??
        "";
}

function textValue(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null &&
            String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
}

function numberValue(...values) {
    for (const value of values) {
        if (value === "" || value === null || value === undefined) continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return 0;
}

function readData() {
    state.tournaments = readFirstArray(STORAGE.tournaments);
    state.teams = readFirstArray(STORAGE.teams);
    state.players = readFirstArray(STORAGE.players);
    state.matches = readFirstArray(STORAGE.matches);

    const knownIds = new Set(
        state.matches.map(match => String(getId(match))).filter(Boolean)
    );

    readFirstArray(STORAGE.fixtures).forEach(fixture => {
        const id = String(getId(fixture));

        if (!id || !knownIds.has(id)) {
            state.matches.push(fixture);
            if (id) knownIds.add(id);
        }
    });
}

function getTournamentId(item) {
    return String(
        item?.tournamentId ??
        item?.tournament_id ??
        item?.tournament?.id ??
        item?.tournament?.tournamentId ??
        ""
    );
}

function getTournamentName(tournament) {
    return textValue(
        tournament?.name,
        tournament?.tournamentName,
        tournament?.title,
        tournament?.tournament_name
    ) || "Unnamed Tournament";
}

function getTeamId(item) {
    return String(
        item?.teamId ??
        item?.team_id ??
        item?.team?.id ??
        item?.team?.teamId ??
        ""
    );
}

function getTeamName(teamOrId) {
    if (teamOrId && typeof teamOrId === "object") {
        return textValue(
            teamOrId.name,
            teamOrId.teamName,
            teamOrId.shortName,
            teamOrId.short_name
        ) || "Unknown Team";
    }

    const id = String(teamOrId ?? "");
    const team = state.teams.find(item =>
        String(getId(item)) === id ||
        String(item.teamId ?? "") === id
    );

    return team
        ? textValue(team.name, team.teamName, team.shortName) || "Unknown Team"
        : (id || "Unknown Team");
}

function getPlayerName(playerOrId) {
    if (playerOrId && typeof playerOrId === "object") {
        return textValue(
            playerOrId.name,
            playerOrId.playerName,
            playerOrId.fullName
        ) || "Unknown Player";
    }

    const id = String(playerOrId ?? "");
    const player = state.players.find(item =>
        String(getId(item)) === id ||
        String(item.playerId ?? "") === id
    );

    return player
        ? textValue(player.name, player.playerName, player.fullName) || "Unknown Player"
        : (id || "Unknown Player");
}

function getPlayerTeamId(player) {
    return String(
        player?.teamId ??
        player?.team_id ??
        player?.team?.id ??
        player?.team?.teamId ??
        ""
    );
}

function getMatchTeamIds(match) {
    const live = match?.liveData || {};

    return [
        match?.teamAId, match?.teamBId,
        match?.team1Id, match?.team2Id,
        match?.homeTeamId, match?.awayTeamId,
        match?.teamA?.id, match?.teamB?.id,
        match?.team1?.id, match?.team2?.id,
        live?.team1Id, live?.team2Id
    ].filter(value => value !== undefined && value !== null && value !== "")
        .map(String);
}

function getMatchStatus(match) {
    const raw = textValue(
        match?.status,
        match?.phase,
        match?.matchStatus,
        match?.state,
        match?.liveData?.phase
    ).toLowerCase();

    if (
        match?.completed === true ||
        raw.includes("complete") ||
        raw.includes("finished") ||
        raw.includes("full time") ||
        raw === "result" ||
        raw === "won"
    ) return "completed";

    if (
        match?.isLive === true ||
        raw.includes("live") ||
        raw.includes("progress") ||
        raw === "started"
    ) return "live";

    return "scheduled";
}

function isCompleted(match) {
    return getMatchStatus(match) === "completed";
}

function isLive(match) {
    return getMatchStatus(match) === "live";
}

function selectedTournamentMatches() {
    return state.tournamentId === "all"
        ? state.matches
        : state.matches.filter(match =>
            getTournamentId(match) === String(state.tournamentId)
        );
}

function selectedTournamentPlayers() {
    if (state.tournamentId === "all") return state.players;

    const teamIds = new Set();

    state.teams.forEach(team => {
        if (getTournamentId(team) === String(state.tournamentId)) {
            teamIds.add(String(getId(team)));
        }
    });

    selectedTournamentMatches().forEach(match => {
        getMatchTeamIds(match).forEach(id => teamIds.add(id));
    });

    return state.players.filter(player =>
        getTournamentId(player) === String(state.tournamentId) ||
        teamIds.has(getPlayerTeamId(player))
    );
}

/*
 * Important:
 * match.js stores batters and bowlers as objects keyed by player ID.
 * Convert either objects or arrays to a consistent array.
 */
function toEntries(value) {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
        return Object.entries(value).map(([key, item]) => ({
            ...(item && typeof item === "object" ? item : {}),
            playerId: item?.playerId ?? item?.id ?? key
        }));
    }

    return [];
}

function getInnings(match) {
    const data = match?.liveData || match?.live || match?.scoreData || {};

    if (Array.isArray(data.innings)) return data.innings;
    if (Array.isArray(match?.innings)) return match.innings;
    if (Array.isArray(match?.scorecard?.innings)) return match.scorecard.innings;

    return [];
}

function getInningsTeamId(innings) {
    return textValue(
        innings?.battingTeamId,
        innings?.teamId,
        innings?.team?.id
    );
}

function getInningsRuns(innings) {
    if (innings?.runs !== undefined) return numberValue(innings.runs);
    return numberValue(innings?.totalRuns, innings?.score);
}

function getInningsWickets(innings) {
    if (innings?.wickets !== undefined) return numberValue(innings.wickets);

    const batters = toEntries(innings?.batters ?? innings?.batsmen);
    const outs = batters.filter(player =>
        player?.out === true || player?.isOut === true
    ).length;

    return Math.max(outs, numberValue(innings?.totalWickets));
}

function getInningsBalls(innings) {
    if (innings?.legalBalls !== undefined) {
        return numberValue(innings.legalBalls);
    }

    if (innings?.ballsFaced !== undefined) {
        return numberValue(innings.ballsFaced);
    }

    return toEntries(innings?.bowlers).reduce(
        (sum, bowler) => sum + numberValue(bowler.legalBalls, bowler.balls), 0
    );
}

function getInningsBoundaries(innings) {
    const batters = toEntries(innings?.batters ?? innings?.batsmen);
    return {
        fours: batters.reduce((sum, player) =>
            sum + numberValue(player.fours, player.four), 0),
        sixes: batters.reduce((sum, player) =>
            sum + numberValue(player.sixes, player.six), 0)
    };
}

function getMatchScores(match) {
    const innings = getInnings(match);

    if (innings.length) {
        return innings.map((inn, index) => {
            const boundaries = getInningsBoundaries(inn);
            return {
                innings: index + 1,
                teamId: getInningsTeamId(inn),
                team: textValue(
                    inn?.teamName,
                    inn?.battingTeamName,
                    inn?.team?.name
                ) || getTeamName(getInningsTeamId(inn)),
                runs: getInningsRuns(inn),
                wickets: getInningsWickets(inn),
                balls: getInningsBalls(inn),
                fours: numberValue(inn?.fours, inn?.totalFours, boundaries.fours),
                sixes: numberValue(inn?.sixes, inn?.totalSixes, boundaries.sixes),
                raw: inn
            };
        });
    }

    const live = match?.liveData || {};

    return [
        {
            teamId: textValue(match?.team1Id, match?.teamAId, match?.homeTeamId),
            team: textValue(match?.team1Name, match?.teamAName, match?.team1?.name),
            runs: numberValue(match?.team1Score, match?.teamAScore, live?.team1Score),
            wickets: numberValue(match?.team1Wickets, match?.teamAWickets, live?.team1Wickets),
            balls: 0, fours: 0, sixes: 0, raw: null
        },
        {
            teamId: textValue(match?.team2Id, match?.teamBId, match?.awayTeamId),
            team: textValue(match?.team2Name, match?.teamBName, match?.team2?.name),
            runs: numberValue(match?.team2Score, match?.teamBScore, live?.team2Score),
            wickets: numberValue(match?.team2Wickets, match?.teamBWickets, live?.team2Wickets),
            balls: 0, fours: 0, sixes: 0, raw: null
        }
    ].filter(score => score.teamId || score.team || score.runs || score.wickets);
}

function getBattingRecords(matches) {
    const records = new Map();

    function ensure(id, name, teamId) {
        const key = String(id || name);

        if (!records.has(key)) {
            records.set(key, {
                playerId: key,
                name: name || "Unknown Player",
                teamId: String(teamId || ""),
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                outs: 0,
                innings: 0,
                highScore: 0,
                matchesSet: new Set()
            });
        }

        return records.get(key);
    }

    matches.forEach(match => {
        if (!isCompleted(match)) return;

        getInnings(match).forEach(innings => {
            const batters = toEntries(
                innings?.batters ??
                innings?.batsmen ??
                innings?.batting ??
                innings?.scorecard?.batters
            );

            batters.forEach(batter => {
                const id = textValue(
                    batter.playerId, batter.id, batter.batterId
                );

                const name = getPlayerName(id || batter.name || batter.playerName);
                const row = ensure(
                    id || name,
                    name,
                    batter.teamId || getInningsTeamId(innings)
                );

                row.runs += numberValue(batter.runs, batter.totalRuns, batter.score);
                row.balls += numberValue(batter.balls, batter.ballsFaced);
                row.fours += numberValue(batter.fours, batter.four);
                row.sixes += numberValue(batter.sixes, batter.six);

                if (batter.out === true || batter.isOut === true) row.outs++;

                row.innings++;
                row.highScore = Math.max(
                    row.highScore,
                    numberValue(batter.runs, batter.totalRuns, batter.score)
                );
                row.matchesSet.add(String(getId(match)));
            });
        });
    });

    return [...records.values()].map(player => ({
        ...player,
        matches: player.matchesSet.size,
        average: player.outs ? player.runs / player.outs : player.runs,
        strikeRate: player.balls ? player.runs * 100 / player.balls : 0
    }));
}

function getBowlingRecords(matches) {
    const records = new Map();

    function ensure(id, name, teamId) {
        const key = String(id || name);

        if (!records.has(key)) {
            records.set(key, {
                playerId: key,
                name: name || "Unknown Player",
                teamId: String(teamId || ""),
                balls: 0,
                runs: 0,
                wickets: 0,
                maidens: 0,
                matchesSet: new Set(),
                threeWickets: 0,
                fiveWickets: 0
            });
        }

        return records.get(key);
    }

    matches.forEach(match => {
        if (!isCompleted(match)) return;

        getInnings(match).forEach(innings => {
            const bowlers = toEntries(
                innings?.bowlers ??
                innings?.bowling ??
                innings?.scorecard?.bowlers
            );

            bowlers.forEach(bowler => {
                const id = textValue(
                    bowler.playerId, bowler.id, bowler.bowlerId
                );
                const name = getPlayerName(id || bowler.name || bowler.playerName);
                const row = ensure(
                    id || name,
                    name,
                    bowler.teamId || innings?.bowlingTeamId
                );

                const wickets = numberValue(bowler.wickets, bowler.totalWickets);
                row.balls += numberValue(bowler.legalBalls, bowler.balls);
                row.runs += numberValue(bowler.runs, bowler.runsConceded);
                row.wickets += wickets;
                row.maidens += numberValue(bowler.maidens);
                row.matchesSet.add(String(getId(match)));
            });
        });
    });

    return [...records.values()].map(player => {
        const balls = player.balls;

        return {
            ...player,
            matches: player.matchesSet.size,
            oversText: `${Math.floor(balls / 6)}.${balls % 6}`,
            economy: balls ? player.runs / (balls / 6) : 0,
            average: player.wickets ? player.runs / player.wickets : player.runs,
            strikeRate: player.wickets ? balls / player.wickets : 0
        };
    });
}

function getTeamRecords(matches) {
    const map = new Map();

    function ensure(id, name) {
        const key = String(id || name || "unknown");

        if (!map.has(key)) {
            map.set(key, {
                id: key,
                name: name || getTeamName(id),
                matches: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                runs: 0,
                wickets: 0,
                highestScore: 0,
                lowestScore: null
            });
        }

        return map.get(key);
    }

    matches.forEach(match => {
        if (!isCompleted(match)) return;

        const scores = getMatchScores(match);

        scores.forEach(score => {
            const row = ensure(score.teamId || score.team, score.team);
            row.runs += score.runs;
            row.wickets += score.wickets;
            row.highestScore = Math.max(row.highestScore, score.runs);

            if (score.runs > 0) {
                row.lowestScore = row.lowestScore === null
                    ? score.runs
                    : Math.min(row.lowestScore, score.runs);
            }

            row.matches++;
        });

        const winnerId = textValue(
            match?.winnerId,
            match?.winnerTeamId,
            match?.result?.winnerId,
            match?.liveData?.winnerId
        );

        if (winnerId) {
            ensure(winnerId, getTeamName(winnerId)).wins++;

            scores.forEach(score => {
                if (score.teamId && score.teamId !== winnerId) {
                    ensure(score.teamId, score.team).losses++;
                }
            });
        } else if (/tie|tied/i.test(textValue(match?.resultText, match?.result?.text, match?.result))) {
            scores.forEach(score => ensure(score.teamId, score.team).ties++);
        }
    });

    return [...map.values()];
}

function formatNumber(value, digits = 0) {
    return Number(value || 0).toLocaleString("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0
    });
}

function sectionHeading(title, subtitle, tag = "") {
    return `
        <div class="award-section-heading">
            <div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(subtitle)}</p></div>
            ${tag ? `<span class="award-section-tag">${escapeHTML(tag)}</span>` : ""}
        </div>
    `;
}

function emptyState(title, message, icon = "fa-chart-simple") {
    return `
        <div class="award-empty">
            <i class="fa-solid ${escapeHTML(icon)}"></i>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

function statCard(label, value, note, icon, colorClass) {
    return `
        <article class="award-stat-card">
            <div class="award-stat-top">
                <div class="award-stat-icon ${colorClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
            </div>
            <p class="award-stat-label">${escapeHTML(label)}</p>
            <h3 class="award-stat-value">${escapeHTML(value)}</h3>
            <span class="award-stat-note">${escapeHTML(note)}</span>
        </article>
    `;
}

function getTotalRuns(matches) {
    return matches.filter(isCompleted).reduce((sum, match) =>
        sum + getMatchScores(match).reduce((inner, score) => inner + score.runs, 0), 0);
}

function getTotalWickets(matches) {
    return matches.filter(isCompleted).reduce((sum, match) =>
        sum + getMatchScores(match).reduce((inner, score) => inner + score.wickets, 0), 0);
}

function getTotalBoundaries(batting, key) {
    return batting.reduce((sum, player) => sum + numberValue(player[key]), 0);
}

function renderTournamentOptions() {
    return [
        '<option value="all">All Tournaments</option>',
        ...state.tournaments.map(tournament => {
            const id = String(getId(tournament));
            return `<option value="${escapeHTML(id)}" ${id === state.tournamentId ? "selected" : ""}>${escapeHTML(getTournamentName(tournament))}</option>`;
        })
    ].join("");
}

function renderOverview(matches, batting, bowling) {
    const completed = matches.filter(isCompleted).length;
    const live = matches.filter(isLive).length;

    return `
        <section class="award-section">
            ${sectionHeading("Tournament Overview", "A quick look at the selected competition.", "OVERVIEW")}
            <div class="award-overview-grid">
                ${statCard("Matches Played", completed, `${matches.length} scheduled matches`, "fa-baseball-bat-ball", "award-icon-purple")}
                ${statCard("Live Matches", live, "Currently in progress", "fa-tower-broadcast", "award-icon-green")}
                ${statCard("Total Runs", formatNumber(getTotalRuns(matches)), "Completed-match innings", "fa-chart-column", "award-icon-blue")}
                ${statCard("Total Wickets", formatNumber(getTotalWickets(matches)), "Recorded completed innings", "fa-bullseye", "award-icon-gold")}
                ${statCard("Total Fours", formatNumber(getTotalBoundaries(batting, "fours")), "Player-level scorecard data", "fa-square", "award-icon-blue")}
                ${statCard("Total Sixes", formatNumber(getTotalBoundaries(batting, "sixes")), "Player-level scorecard data", "fa-bolt", "award-icon-gold")}
                ${statCard("Registered Teams", state.teams.length, "Teams in storage", "fa-shield-halved", "award-icon-green")}
                ${statCard("Registered Players", selectedTournamentPlayers().length, "Players linked to tournament", "fa-users", "award-icon-purple")}
            </div>
        </section>
    `;
}

function renderCapCard(title, label, icon, player, value, color = "") {
    const team = player ? getTeamName(player.teamId) : "—";

    return `
        <article class="award-cap-card ${color}">
            <div class="award-cap-top">
                <span>${escapeHTML(title)}</span><i class="fa-solid ${icon}"></i>
            </div>
            <h3>${escapeHTML(player?.name || "Not available")}</h3>
            <p>${escapeHTML(team)}</p>
            <div class="award-cap-stat">${escapeHTML(value)} <small>${escapeHTML(label)}</small></div>
        </article>
    `;
}

function renderTopPerformers(batting, bowling) {
    const mostRuns = [...batting].sort((a, b) => b.runs - a.runs)[0];
    const mostWickets = [...bowling].sort((a, b) => b.wickets - a.wickets)[0];
    const mostSixes = [...batting].sort((a, b) => b.sixes - a.sixes)[0];
    const bestStrikeRate = [...batting]
        .filter(player => player.balls >= 10)
        .sort((a, b) => b.strikeRate - a.strikeRate)[0];

    return `
        <section class="award-section">
            ${sectionHeading("Awards & Honors", "Automatic leaders from completed-match scorecards.", "LEADERS")}
            <div class="award-cap-grid">
                ${renderCapCard("Orange Cap", "Runs", "fa-crown", mostRuns, mostRuns ? formatNumber(mostRuns.runs) : "—", "gold")}
                ${renderCapCard("Purple Cap", "Wickets", "fa-medal", mostWickets, mostWickets ? formatNumber(mostWickets.wickets) : "—")}
                ${renderCapCard("Most Sixes", "Sixes", "fa-bolt", mostSixes, mostSixes ? formatNumber(mostSixes.sixes) : "—", "green")}
                ${renderCapCard("Best Strike Rate", "SR", "fa-gauge-high", bestStrikeRate, bestStrikeRate ? formatNumber(bestStrikeRate.strikeRate, 2) : "—", "blue")}
            </div>
            <p class="award-footer-note">Only saved player-level scorecard data is used. Best Strike Rate requires at least 10 balls.</p>
        </section>
    `;
}

function renderRecordRows(records, valueKey, valueLabel, lowerIsBetter = false) {
    if (!records.length) {
        return emptyState("No detailed records yet", "Complete a match and save player-level scorecard data.");
    }

    const sorted = [...records].sort((a, b) =>
        lowerIsBetter
            ? numberValue(a[valueKey]) - numberValue(b[valueKey])
            : numberValue(b[valueKey]) - numberValue(a[valueKey])
    );

    return sorted.slice(0, 8).map((player, index) => `
        <div class="award-record-row">
            <div class="award-record-rank">${index + 1}</div>
            <div class="award-record-info">
                <strong>${escapeHTML(player.name)}</strong>
                <small>${escapeHTML(getTeamName(player.teamId))}</small>
            </div>
            <div class="award-record-value">
                ${formatNumber(player[valueKey], 2)}
                <small>${escapeHTML(valueLabel)}</small>
            </div>
        </div>
    `).join("");
}

function renderBattingBowling(batting, bowling) {
    return `
        <section class="award-section">
            ${sectionHeading("Performance Leaderboards", "Compare batting and bowling performance.", "PLAYER STATS")}
            <div class="award-records-grid">
                <div class="award-panel">
                    <div class="award-section-heading"><div><h2>Batting Leaders</h2><p>Total runs</p></div></div>
                    ${renderRecordRows(batting, "runs", "Runs")}
                </div>
                <div class="award-panel">
                    <div class="award-section-heading"><div><h2>Bowling Leaders</h2><p>Total wickets</p></div></div>
                    ${renderRecordRows(bowling, "wickets", "Wickets")}
                </div>
                <div class="award-panel">
                    <div class="award-section-heading"><div><h2>Most Fours</h2><p>Boundary leaderboard</p></div></div>
                    ${renderRecordRows(batting, "fours", "Fours")}
                </div>
                <div class="award-panel">
                    <div class="award-section-heading"><div><h2>Best Economy</h2><p>Lower economy is better</p></div></div>
                    ${renderRecordRows(bowling.filter(player => player.balls > 0), "economy", "Runs / Over", true)}
                </div>
            </div>
        </section>
    `;
}

function renderBattingTable(batting) {
    const filtered = batting.filter(player =>
        !state.search ||
        player.name.toLowerCase().includes(state.search.toLowerCase()) ||
        getTeamName(player.teamId).toLowerCase().includes(state.search.toLowerCase())
    );

    if (!filtered.length) return emptyState("No batting records found", "Try another search or complete a match.");

    return `
        <div class="award-table-wrap"><table class="award-table">
            <thead><tr>
                <th>Player</th><th>Team</th><th>Matches</th><th>Runs</th>
                <th>High Score</th><th>Average</th><th>Strike Rate</th><th>4s</th><th>6s</th>
            </tr></thead>
            <tbody>${[...filtered].sort((a, b) => b.runs - a.runs).map(player => `
                <tr>
                    <td class="award-player-name">${escapeHTML(player.name)}</td>
                    <td>${escapeHTML(getTeamName(player.teamId))}</td>
                    <td>${player.matches}</td><td><strong>${player.runs}</strong></td>
                    <td>${player.highScore}</td><td>${formatNumber(player.average, 2)}</td>
                    <td>${formatNumber(player.strikeRate, 2)}</td><td>${player.fours}</td><td>${player.sixes}</td>
                </tr>`).join("")}</tbody>
        </table></div>
    `;
}

function renderBowlingTable(bowling) {
    const filtered = bowling.filter(player =>
        !state.search ||
        player.name.toLowerCase().includes(state.search.toLowerCase()) ||
        getTeamName(player.teamId).toLowerCase().includes(state.search.toLowerCase())
    );

    if (!filtered.length) return emptyState("No bowling records found", "Bowling figures appear after detailed completed scorecards are saved.");

    return `
        <div class="award-table-wrap"><table class="award-table">
            <thead><tr>
                <th>Player</th><th>Team</th><th>Matches</th><th>Overs</th>
                <th>Runs</th><th>Wickets</th><th>Average</th><th>Economy</th>
            </tr></thead>
            <tbody>${[...filtered].sort((a, b) => b.wickets - a.wickets).map(player => `
                <tr>
                    <td class="award-player-name">${escapeHTML(player.name)}</td>
                    <td>${escapeHTML(getTeamName(player.teamId))}</td>
                    <td>${player.matches}</td><td>${player.oversText}</td>
                    <td>${player.runs}</td><td><strong>${player.wickets}</strong></td>
                    <td>${formatNumber(player.average, 2)}</td><td>${formatNumber(player.economy, 2)}</td>
                </tr>`).join("")}</tbody>
        </table></div>
    `;
}

function renderTeamStats(matches) {
    const teams = getTeamRecords(matches).sort((a, b) => b.wins - a.wins || b.runs - a.runs);

    if (!teams.length) return emptyState("No team records yet", "Completed match results will appear here.");

    return `
        <div class="award-table-wrap"><table class="award-table">
            <thead><tr><th>Team</th><th>Matches</th><th>Wins</th><th>Losses</th><th>Ties</th><th>Runs</th><th>Wickets</th><th>Highest</th><th>Lowest</th></tr></thead>
            <tbody>${teams.map(team => `
                <tr><td class="award-player-name">${escapeHTML(team.name)}</td>
                    <td>${team.matches}</td><td>${team.wins}</td><td>${team.losses}</td><td>${team.ties}</td>
                    <td>${team.runs}</td><td>${team.wickets}</td><td>${team.highestScore}</td>
                    <td>${team.lowestScore === null ? "—" : team.lowestScore}</td></tr>
            `).join("")}</tbody>
        </table></div>
    `;
}

function renderPlayerDetails(players, batting, bowling) {
    const search = state.search.toLowerCase();

    const filtered = players.filter(player => {
        const name = textValue(player.name, player.playerName, player.fullName).toLowerCase();
        return !search || name.includes(search) || String(getId(player)).toLowerCase().includes(search);
    });

    if (!filtered.length) return emptyState("No matching players", "Register players or change the search term.", "fa-users");

    return `
        <div class="award-table-wrap"><table class="award-table">
            <thead><tr><th>Player</th><th>Team</th><th>Role</th><th>Runs</th><th>Wickets</th><th>Batting SR</th><th>Bowling Economy</th></tr></thead>
            <tbody>${filtered.map(player => {
                const id = String(getId(player) || player.playerId || "");
                const name = getPlayerName(id || player.name);
                const bat = batting.find(item => item.playerId === id || item.name === name);
                const bowl = bowling.find(item => item.playerId === id || item.name === name);

                return `<tr>
                    <td class="award-player-name">${escapeHTML(name)}</td>
                    <td>${escapeHTML(getTeamName(getPlayerTeamId(player)))}</td>
                    <td><span class="award-pill">${escapeHTML(textValue(player.position, player.role, player.playerRole) || "Player")}</span></td>
                    <td>${bat ? bat.runs : 0}</td><td>${bowl ? bowl.wickets : 0}</td>
                    <td>${bat ? formatNumber(bat.strikeRate, 2) : "0.00"}</td>
                    <td>${bowl ? formatNumber(bowl.economy, 2) : "0.00"}</td>
                </tr>`;
            }).join("")}</tbody>
        </table></div>
    `;
}

function readAwards() {
    const saved = readJSON(AWARDS_KEY);
    return saved && typeof saved === "object"
        ? { manual: saved.manual || {}, matchAwards: saved.matchAwards || {}, finalAward: saved.finalAward || {} }
        : { manual: {}, matchAwards: {}, finalAward: {} };
}

function saveAwards(awards) {
    try {
        localStorage.setItem(AWARDS_KEY, JSON.stringify(awards));
        return true;
    } catch (error) {
        console.error("[MATCHCRAFT Awards] Could not save awards.", error);
        state.message = "পুরস্কার সংরক্ষণ করা যায়নি। ব্রাউজারের storage পরীক্ষা করুন।";
        return false;
    }
}

function getWinnerId(match) {
    return String(textValue(
        match?.winnerId,
        match?.winnerTeamId,
        match?.result?.winnerId,
        match?.liveData?.winnerId,
        match?.result?.winnerTeamId
    ));
}

function getMatchLabel(match, index) {
    return textValue(
        match?.name,
        match?.matchName,
        match?.title,
        match?.roundName,
        match?.stage
    ) || `Match ${index + 1}`;
}

function getMatchCandidates(match, batting, bowling) {
    const winnerId = getWinnerId(match);
    const ids = new Set();

    getInnings(match).forEach(innings => {
        toEntries(innings?.batters).forEach(player => {
            if (player.playerId) ids.add(String(player.playerId));
        });
        toEntries(innings?.bowlers).forEach(player => {
            if (player.playerId) ids.add(String(player.playerId));
        });
    });

    const matchIds = getMatchTeamIds(match);
    const candidates = [...ids].map(id => {
        const player = state.players.find(item =>
            String(getId(item) || item.playerId) === id
        );
        const bat = batting.find(item => item.playerId === id);
        const bowl = bowling.find(item => item.playerId === id);
        const teamId = getPlayerTeamId(player) || bat?.teamId || bowl?.teamId || "";

        return {
            id,
            name: getPlayerName(id),
            teamId,
            runs: bat?.runs || 0,
            wickets: bowl?.wickets || 0,
            fours: bat?.fours || 0,
            sixes: bat?.sixes || 0,
            strikeRate: bat?.strikeRate || 0,
            bowlingEconomy: bowl?.economy || 0,
            points: (bat?.runs || 0) + (bowl?.wickets || 0) * 20 +
                (bat?.sixes || 0) * 2 + (bat?.fours || 0)
        };
    }).filter(player => !winnerId || player.teamId === winnerId || matchIds.length === 0);

    return candidates.sort((a, b) => b.points - a.points);
}

function renderMOMSection(matches, batting, bowling) {
    const awards = readAwards();
    const completed = matches.filter(isCompleted);

    const matchCards = completed.map((match, index) => {
        const id = String(getId(match) || `match-${index}`);
        const candidates = getMatchCandidates(match, batting, bowling);
        const saved = awards.matchAwards[id] || {};
        const automatic = candidates[0];
        const selectedId = saved.playerId || automatic?.id || "";
        const selected = candidates.find(player => player.id === selectedId) || automatic;

        return `
            <article class="award-panel" style="margin-bottom:16px">
                <div class="award-section-heading">
                    <div><h2>${escapeHTML(getMatchLabel(match, index))}</h2>
                    <p>${escapeHTML(getTeamName(match.team1Id || match.teamAId))} vs ${escapeHTML(getTeamName(match.team2Id || match.teamBId))}</p></div>
                    <span class="award-section-tag">MATCH AWARD</span>
                </div>
                <p class="award-subtitle">Recommended: ${escapeHTML(automatic?.name || "No player-level scorecard data")}</p>
                <div class="award-field">
                    <label>MAN OF THE MATCH</label>
                    <select class="award-select" data-award-player data-award-kind="match" data-match-id="${escapeHTML(id)}">
                        <option value="">Select player</option>
                        ${candidates.map(player => `<option value="${escapeHTML(player.id)}" ${player.id === selectedId ? "selected" : ""}>${escapeHTML(player.name)} — ${escapeHTML(getTeamName(player.teamId))} (${player.runs} runs, ${player.wickets} wickets)</option>`).join("")}
                    </select>
                </div>
                <p class="award-subtitle">Selected: <strong>${escapeHTML(selected?.name || "Not selected")}</strong></p>
            </article>
        `;
    }).join("");

    const finals = completed.filter(match =>
        /final/i.test(textValue(match.stage, match.round, match.matchName, match.name, match.title))
    );
    const finalMatch = finals[finals.length - 1] || null;
    const finalId = finalMatch ? String(getId(finalMatch)) : "";
    const finalCandidates = finalMatch ? getMatchCandidates(finalMatch, batting, bowling) : [];
    const finalSaved = awards.finalAward || {};
    const finalAutomatic = finalCandidates[0];
    const finalSelectedId = finalSaved.playerId || finalAutomatic?.id || "";

    return `
        <section class="award-section">
            ${sectionHeading("Match-wise Man of the Match", "Choose or adjust the best performer for every completed match.", "MATCH AWARDS")}
            ${matchCards || emptyState("No completed matches", "Finish a match before selecting Man of the Match.", "fa-trophy")}
        </section>
        <section class="award-section">
            ${sectionHeading("Final Man of the Match", "A separate award for the final match.", "FINAL AWARD")}
            <div class="award-panel">
                ${!finalMatch ? emptyState("Final match not detected", "Name or stage the fixture as Final, then complete it to enable this award.", "fa-medal") : `
                    <p class="award-subtitle">Final: ${escapeHTML(getMatchLabel(finalMatch, matches.indexOf(finalMatch)))}</p>
                    <p class="award-subtitle">Recommended: ${escapeHTML(finalAutomatic?.name || "No player-level scorecard data")}</p>
                    <div class="award-field">
                        <label>FINAL MAN OF THE MATCH</label>
                        <select class="award-select" data-award-player data-award-kind="final" data-match-id="${escapeHTML(finalId)}">
                            <option value="">Select player</option>
                            ${finalCandidates.map(player => `<option value="${escapeHTML(player.id)}" ${player.id === finalSelectedId ? "selected" : ""}>${escapeHTML(player.name)} — ${escapeHTML(getTeamName(player.teamId))} (${player.runs} runs, ${player.wickets} wickets)</option>`).join("")}
                        </select>
                    </div>
                `}
            </div>
        </section>
    `;
}

function renderManualAwards(batting, bowling, players) {
    const awards = readAwards();
    const definitions = [
        ["bestAllRounder", "Best All-Rounder"],
        ["bestWicketkeeper", "Best Wicketkeeper"],
        ["bestFielder", "Best Fielder"],
        ["playerOfTournament", "Player of the Tournament"]
    ];

    const options = players.map(player => {
        const id = String(getId(player) || player.playerId || "");
        return `<option value="${escapeHTML(id)}">${escapeHTML(getPlayerName(id || player.name))}</option>`;
    }).join("");

    return `
        <section class="award-section">
            ${sectionHeading("Manual Awards & Honors", "Select award winners and save your choices.", "MANUAL")}
            <div class="award-panel">
                <div class="award-records-grid">
                    ${definitions.map(([key, label]) => `
                        <div class="award-field">
                            <label>${escapeHTML(label.toUpperCase())}</label>
                            <select class="award-select" data-manual-award="${escapeHTML(key)}">
                                <option value="">Not selected</option>
                                ${options}
                            </select>
                        </div>
                    `).join("")}
                </div>
                <button type="button" class="award-btn award-btn-primary" data-award-action="save-manual">
                    <i class="fa-solid fa-floppy-disk"></i> Save Manual Awards
                </button>
                <p class="award-footer-note">Award selections are saved in this browser's LocalStorage.</p>
            </div>
        </section>
    `;
}

/* =========================================================
   MATCHCRAFT CRICKET — QR RESULT SHARING
   Add these functions before renderQRPlaceholder()
========================================================= */

const QR_RESULT_SITE =
    "https://cricket-tournament-analisis-by-rabbik.netlify.app/";

function qrEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[ch]);
}

function qrEncodeResult(result) {
    const bytes = new TextEncoder().encode(JSON.stringify(result));
    let binary = "";

    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function qrDecodeResult(encoded) {
    try {
        const base64 = encoded
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));

        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

function qrGetMatchId(match) {
    return String(
        match?.id ??
        match?._id ??
        match?.matchId ??
        match?.fixtureId ??
        ""
    );
}

function qrGetMatchTeams(match) {
    const live = match?.liveData || {};
    const innings = Array.isArray(live.innings) ? live.innings : [];

    const teamA =
        match?.teamAName ||
        match?.team1Name ||
        match?.homeTeamName ||
        match?.teamA?.name ||
        match?.team1?.name ||
        match?.team1 ||
        match?.teamA ||
        live.teamAName ||
        "Team 1";

    const teamB =
        match?.teamBName ||
        match?.team2Name ||
        match?.awayTeamName ||
        match?.teamB?.name ||
        match?.team2?.name ||
        match?.team2 ||
        match?.teamB ||
        live.teamBName ||
        "Team 2";

    return {
        teamA: typeof teamA === "object" ? (teamA.name || "Team 1") : String(teamA),
        teamB: typeof teamB === "object" ? (teamB.name || "Team 2") : String(teamB),
        innings
    };
}

function qrGetInningsSummary(innings) {
    return (Array.isArray(innings) ? innings : []).map((inn, index) => {
        const battingTeam =
            inn?.battingTeamName ||
            inn?.battingTeam ||
            inn?.teamName ||
            `Innings ${index + 1}`;

        const runs = Number(inn?.runs ?? inn?.score ?? 0);
        const wickets = Number(inn?.wickets ?? 0);
        const balls = Number(inn?.legalBalls ?? inn?.balls ?? 0);
        const oversLimit = Number(inn?.oversLimit ?? inn?.overs ?? 0);

        const overs = oversLimit > 0
            ? `${Math.floor(balls / 6)}.${balls % 6}`
            : `${Math.floor(balls / 6)}.${balls % 6}`;

        return {
            battingTeam: typeof battingTeam === "object"
                ? (battingTeam.name || `Innings ${index + 1}`)
                : String(battingTeam),
            runs,
            wickets,
            overs
        };
    });
}

function qrMakeResultPayload(match) {
    const live = match?.liveData || {};
    const teams = qrGetMatchTeams(match);

    const tournament =
        match?.tournamentName ||
        match?.tournament?.name ||
        match?.competitionName ||
        "Cricket Tournament";

    const resultText =
        live.result?.text ||
        live.result?.summary ||
        (typeof live.result === "string" ? live.result : "") ||
        match?.result?.text ||
        match?.result?.summary ||
        (typeof match?.result === "string" ? match.result : "") ||
        match?.resultText ||
        match?.resultSummary ||
        "Match completed";

    const winner =
        live.winnerTeamName ||
        match?.winnerTeamName ||
        match?.winner ||
        "";

    const score = qrGetInningsSummary(teams.innings);

    return {
        version: 1,
        matchId: qrGetMatchId(match),
        tournament: String(tournament),
        teamA: teams.teamA,
        teamB: teams.teamB,
        result: String(resultText),
        winner: typeof winner === "object" ? (winner.name || "") : String(winner),
        innings: score,
        date: String(match?.date || match?.matchDate || match?.scheduledAt || ""),
        sharedAt: new Date().toISOString()
    };
}

function qrIsCompleted(match) {
    const status = String(
        match?.status ||
        match?.liveData?.phase ||
        match?.liveData?.status ||
        ""
    ).toLowerCase();

    return Boolean(
        match?.completed ||
        match?.liveData?.completed ||
        status === "completed" ||
        status === "complete" ||
        status === "finished"
    );
}

function qrGetCompletedMatches() {
    /*
      Uses the same storage keys as the cricket Match Center.
      Reads both matches and fixtures, avoiding duplicate IDs.
    */
    const keys = [
        "matchcraft_cricket_matches",
        "cricket_matches",
        "matches",
        "matchcraft_cricket_fixtures",
        "cricket_fixtures",
        "fixtures"
    ];

    const all = [];

    keys.forEach(key => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            const rows = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.data)
                    ? parsed.data
                    : Array.isArray(parsed?.items)
                        ? parsed.items
                        : [];

            all.push(...rows);
        } catch (error) {
            console.warn("QR result: unable to read", key, error);
        }
    });

    const seen = new Set();

    return all.filter(match => {
        if (!match || !qrIsCompleted(match)) return false;

        const id = qrGetMatchId(match);
        const uniqueKey = id || JSON.stringify([
            match?.teamAName,
            match?.teamBName,
            match?.date,
            match?.result
        ]);

        if (seen.has(uniqueKey)) return false;
        seen.add(uniqueKey);

        return true;
    });
}

function qrResultURL(payload) {
    const url = new URL(QR_RESULT_SITE);
    url.searchParams.set("page", "statistics");
    url.searchParams.set("result", qrEncodeResult(payload));
    return url.toString();
}

function renderQRPlaceholder() {
    const matches = qrGetCompletedMatches();

    if (!matches.length) {
        return `
            <section class="award-section">
                ${sectionHeading(
                    "Match Result QR Code",
                    "Create a shareable QR code for a completed match.",
                    "RESULT SHARING"
                )}
                <div class="award-qr-placeholder">
                    <i class="fa-solid fa-qrcode"></i>
                    <div>
                        <h3>No completed matches found</h3>
                        <p>Complete a match in Match Center first. Then return here to create its QR Code.</p>
                    </div>
                </div>
            </section>
        `;
    }

    return `
        <section class="award-section award-qr-section">
            ${sectionHeading(
                "Match Result QR Code",
                "Share a snapshot of a completed match with another phone.",
                "RESULT SHARING"
            )}

            <div class="award-qr-card">
                <div class="award-qr-controls">
                    <label for="awardQrMatchSelect">Select completed match</label>
                    <select id="awardQrMatchSelect">
                        ${matches.map((match, index) => {
                            const teams = qrGetMatchTeams(match);
                            const label = `${teams.teamA} vs ${teams.teamB}`;
                            return `
                                <option value="${qrEscapeHTML(qrGetMatchId(match))}"
                                    ${index === 0 ? "selected" : ""}>
                                    ${qrEscapeHTML(label)}
                                </option>
                            `;
                        }).join("")}
                    </select>

                    <button type="button" class="award-qr-generate" id="awardQrGenerate">
                        <i class="fa-solid fa-qrcode"></i>
                        Generate QR Code
                    </button>
                </div>

                <div class="award-qr-output" id="awardQrOutput" aria-live="polite">
                    <div class="award-qr-empty">
                        <i class="fa-solid fa-qrcode"></i>
                        <p>Select a match and press Generate QR Code.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/* Load the QR generator library only when needed. */
function qrLoadLibrary() {
    if (window.QRCode) return Promise.resolve();

    if (window.__matchcraftQRCodeLoading) {
        return window.__matchcraftQRCodeLoading;
    }

    window.__matchcraftQRCodeLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.onload = () => window.QRCode
            ? resolve()
            : reject(new Error("QR library loaded, but QRCode is unavailable."));
        script.onerror = () => reject(new Error("Unable to load QR generator."));
        document.head.appendChild(script);
    });

    return window.__matchcraftQRCodeLoading;
}

async function qrGenerateSelectedMatch() {
    const select = document.getElementById("awardQrMatchSelect");
    const output = document.getElementById("awardQrOutput");

    if (!select || !output) return;

    const selectedId = select.value;
    const match = qrGetCompletedMatches().find(item =>
        qrGetMatchId(item) === selectedId
    );

    if (!match) {
        output.innerHTML = `<p class="award-qr-error">Selected match could not be found. Refresh the page and try again.</p>`;
        return;
    }

    const payload = qrMakeResultPayload(match);
    const link = qrResultURL(payload);

    output.innerHTML = `
        <div class="award-qr-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Generating QR Code…</p>
        </div>
    `;

    try {
        await qrLoadLibrary();

        output.innerHTML = `
            <div class="award-qr-result">
                <div class="award-qr-image" id="awardQrImage"></div>
                <h3>${qrEscapeHTML(payload.teamA)} vs ${qrEscapeHTML(payload.teamB)}</h3>
                <p>${qrEscapeHTML(payload.result)}</p>
                <label for="awardQrLink">Shareable result link</label>
                <input id="awardQrLink" type="url" readonly value="${qrEscapeHTML(link)}">
                <div class="award-qr-actions">
                    <button type="button" id="awardQrCopy">
                        <i class="fa-regular fa-copy"></i> Copy Link
                    </button>
                    <button type="button" id="awardQrDownload">
                        <i class="fa-solid fa-download"></i> Download QR
                    </button>
                    <button type="button" id="awardQrPrint">
                        <i class="fa-solid fa-print"></i> Print QR
                    </button>
                </div>
                <p class="award-qr-note">
                    This QR contains a snapshot of the result at the time it was generated.
                </p>
            </div>
        `;

        const qrBox = document.getElementById("awardQrImage");

        new QRCode(qrBox, {
            text: link,
            width: 240,
            height: 240,
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error(error);
        output.innerHTML = `
            <p class="award-qr-error">
                QR Code তৈরি করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।
            </p>
        `;
    }
}

function qrRenderSharedResult() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("result");

    if (!encoded) return false;

    const result = qrDecodeResult(encoded);
    const root = document.getElementById("statistics");

    if (!root) return false;

    if (!result || result.version !== 1) {
        root.innerHTML = `
            <div class="award-shared-result">
                <h2>Shared Match Result</h2>
                <p>The result link is invalid or incomplete.</p>
            </div>
        `;
        return true;
    }

    const inningsHTML = (result.innings || []).map((inn, index) => `
        <div class="award-shared-innings">
            <span>${qrEscapeHTML(inn.battingTeam || `Innings ${index + 1}`)}</span>
            <strong>${Number(inn.runs || 0)}/${Number(inn.wickets || 0)}</strong>
            <small>Overs: ${qrEscapeHTML(inn.overs || "0.0")}</small>
        </div>
    `).join("");

    root.innerHTML = `
        <div class="award-shared-result">
            <div class="award-shared-topline">
                <i class="fa-solid fa-trophy"></i>
                <span>SHARED MATCH RESULT</span>
            </div>
            <h2>${qrEscapeHTML(result.tournament || "Cricket Tournament")}</h2>
            <div class="award-shared-teams">
                <div>${qrEscapeHTML(result.teamA || "Team 1")}</div>
                <span>VS</span>
                <div>${qrEscapeHTML(result.teamB || "Team 2")}</div>
            </div>
            ${inningsHTML}
            <div class="award-shared-result-text">
                <span>Match Result</span>
                <strong>${qrEscapeHTML(result.result || "Match completed")}</strong>
                ${result.winner ? `<p>Winner: ${qrEscapeHTML(result.winner)}</p>` : ""}
            </div>
            ${result.date ? `<p class="award-shared-date">Match date: ${qrEscapeHTML(result.date)}</p>` : ""}
            <button type="button" id="awardQrBackToStatistics">
                <i class="fa-solid fa-arrow-left"></i> Back to Statistics & Awards
            </button>
        </div>
    `;

    return true;
}

function qrOpenStatisticsPage() {
    const link = document.querySelector('[data-page="statistics"]');

    if (link) {
        link.click();
    } else {
        const root = document.getElementById("statistics");
        if (root) root.hidden = false;
    }
}

function render() {
    if (!state.root) return;

    const matches = selectedTournamentMatches();
    const completed = matches.filter(isCompleted);
    const batting = getBattingRecords(completed);
    const bowling = getBowlingRecords(completed);
    const tournamentName = state.tournamentId === "all"
        ? "All Tournaments"
        : getTournamentName(state.tournaments.find(item =>
            String(getId(item)) === state.tournamentId
        ) || {});

    const awards = readAwards();

    state.root.innerHTML = `
        <div class="statistics-awards-page" id="${MODULE_ID}">
            <header class="award-header">
                <div>
                    <p class="award-eyebrow">MATCHCRAFT CRICKET · ANALYTICS</p>
                    <h1><i class="fa-solid fa-chart-column"></i> Statistics &amp; Awards</h1>
                    <p class="award-subtitle">Tournament records, player leaderboards and cricket honors.</p>
                </div>
                <div class="award-header-actions">
                    <button type="button" class="award-btn" data-award-action="refresh"><i class="fa-solid fa-rotate"></i> Refresh</button>
                    <button type="button" class="award-btn award-btn-primary" data-award-action="print"><i class="fa-solid fa-file-pdf"></i> Print / Save PDF</button>
                </div>
            </header>

            ${state.message ? `<p class="award-message">${escapeHTML(state.message)}</p>` : ""}

            <section class="award-filter-panel">
                <div class="award-field">
                    <label for="awardTournamentFilter">SELECT TOURNAMENT</label>
                    <select id="awardTournamentFilter" class="award-select">${renderTournamentOptions()}</select>
                </div>
                <div class="award-field">
                    <label for="awardPlayerSearch">SEARCH PLAYER / TEAM</label>
                    <input id="awardPlayerSearch" class="award-search" type="search" placeholder="Search by name..." value="${escapeHTML(state.search)}">
                </div>
            </section>

            <p class="award-subtitle">Viewing: <strong>${escapeHTML(tournamentName)}</strong></p>

            ${renderOverview(matches, batting, bowling)}
            ${renderTopPerformers(batting, bowling)}
            ${renderBattingBowling(batting, bowling)}

            <section class="award-section">
                ${sectionHeading("Batting Statistics", "Detailed batting records.", "BATTING")}
                <div class="award-panel">${renderBattingTable(batting)}</div>
            </section>

            <section class="award-section">
                ${sectionHeading("Bowling Statistics", "Detailed bowling figures.", "BOWLING")}
                <div class="award-panel">${renderBowlingTable(bowling)}</div>
            </section>

            <section class="award-section">
                ${sectionHeading("Team Statistics", "Completed-match team scoring records.", "TEAMS")}
                <div class="award-panel">${renderTeamStats(matches)}</div>
            </section>

            <section class="award-section">
                ${sectionHeading("Player Profiles", "Registered players and recorded performance.", "PLAYERS")}
                <div class="award-panel">${renderPlayerDetails(selectedTournamentPlayers(), batting, bowling)}</div>
            </section>

            ${renderMOMSection(matches, batting, bowling)}
            ${renderManualAwards(batting, bowling, selectedTournamentPlayers())}
            ${renderQRPlaceholder()}

            <div class="award-footer-note">MATCHCRAFT CRICKET · Statistics use saved match and scorecard data.</div>
        </div>
    `;

    // Restore saved manual award selections.
    Object.entries(awards.manual).forEach(([key, playerId]) => {
        const select = $(`[data-manual-award="${key}"]`);
        if (select) select.value = playerId || "";
    });

    const search = $("#awardPlayerSearch");
    if (search) {
        search.addEventListener("input", () => {
            state.search = search.value;
            const cursor = search.selectionStart;
            render();
            const replacement = $("#awardPlayerSearch");
            if (replacement) {
                replacement.focus();
                replacement.setSelectionRange(cursor, cursor);
            }
        });
    }
}

function refresh() {
    readData();

    if (state.tournamentId !== "all" &&
        !state.tournaments.some(item => String(getId(item)) === state.tournamentId)) {
        state.tournamentId = "all";
    }

    render();
}

function handleChange(event) {
    const target = event.target;

    if (target.id === "awardTournamentFilter") {
        state.tournamentId = target.value || "all";
        render();
        return;
    }

    if (target.matches("[data-award-player]")) {
        const awards = readAwards();
        const playerId = target.value;
        const kind = target.dataset.awardKind;
        const matchId = target.dataset.matchId;

        if (kind === "final") {
            awards.finalAward = {
                matchId,
                playerId,
                updatedAt: new Date().toISOString()
            };
        } else {
            awards.matchAwards[matchId] = {
                matchId,
                playerId,
                updatedAt: new Date().toISOString()
            };
        }

        if (saveAwards(awards)) {
            state.message = "Man of the Match নির্বাচন সংরক্ষণ হয়েছে।";
            render();
        }
    }
}

function handleClick(event) {
    const button = event.target.closest("[data-award-action]");
    if (!button) return;

    const action = button.dataset.awardAction;

    if (action === "refresh") {
        state.message = "Statistics আপডেট করা হয়েছে।";
        refresh();
        return;
    }

    if (action === "print") {
        window.print();
        return;
    }

    if (action === "save-manual") {
        const awards = readAwards();
        const manual = {};

        state.root.querySelectorAll("[data-manual-award]").forEach(select => {
            manual[select.dataset.manualAward] = select.value || "";
        });

        awards.manual = manual;

        if (saveAwards(awards)) {
            state.message = "Manual awards সংরক্ষণ হয়েছে।";
            render();
        }
    }
}

function ensureRoot() {
    const root = document.getElementById(ROOT_ID);

    if (!root) {
        console.error("[MATCHCRAFT Awards] #statistics section was not found.");
        return null;
    }

    root.hidden = true;
    return root;
}

function init() {
    state.root = ensureRoot();
    if (!state.root) return;

    readData();

    state.root.addEventListener("change", handleChange);
    state.root.addEventListener("click", handleClick);

    document.addEventListener("matchcraft:datachange", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("matchcraft:matches-updated", refresh);

    document.querySelectorAll('[data-page="statistics"]').forEach(link => {
        link.addEventListener("click", () => window.setTimeout(refresh, 0));
    });

    render();
    console.info("[MATCHCRAFT Awards] Statistics & Awards initialized.");
}

// QR Result Sharing: generate, copy, download and print.
const qrRoot = document.getElementById("statistics");

if (qrRoot && !qrRoot.dataset.qrEventsAttached) {
    qrRoot.dataset.qrEventsAttached = "true";

    qrRoot.addEventListener("click", async event => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.id === "awardQrGenerate") {
            await qrGenerateSelectedMatch();
        }

        if (button.id === "awardQrCopy") {
            const input = document.getElementById("awardQrLink");
            if (!input) return;

            try {
                await navigator.clipboard.writeText(input.value);
                button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            } catch {
                input.focus();
                input.select();

                try {
                    document.execCommand("copy");
                    button.textContent = "Copied!";
                } catch {
                    button.textContent = "Copy failed — select the link";
                }
            }
        }

        if (button.id === "awardQrDownload") {
            const canvas = document.querySelector("#awardQrImage canvas");
            const image = document.querySelector("#awardQrImage img");

            let dataURL = "";

            if (canvas) {
                dataURL = canvas.toDataURL("image/png");
            } else if (image?.src) {
                dataURL = image.src;
            }

            if (!dataURL) {
                alert("QR Code তৈরি হওয়ার পর আবার চেষ্টা করো।");
                return;
            }

            const downloadLink = document.createElement("a");
            downloadLink.href = dataURL;
            downloadLink.download = "matchcraft-match-result-qr.png";
            downloadLink.click();
        }

        if (button.id === "awardQrPrint") {
            const canvas = document.querySelector("#awardQrImage canvas");
            const image = document.querySelector("#awardQrImage img");
            const qrImage = canvas
                ? canvas.toDataURL("image/png")
                : image?.src;

            if (!qrImage) return;

            const printWindow = window.open("", "_blank");

            if (!printWindow) {
                alert("Print করার জন্য ব্রাউজারে pop-up অনুমতি দাও।");
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>MatchCraft Match Result QR</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 30px;
                        }
                        img { width: 260px; height: 260px; }
                        p { overflow-wrap: anywhere; }
                    </style>
                </head>
                <body>
                    <h2>MatchCraft — Match Result</h2>
                    <img src="${qrImage}" alt="Match result QR Code">
                    <p>Scan to view the shared match result.</p>
                    <script>
                        window.onload = () => {
                            window.print();
                        };
                    <\/script>
                </body>
                </html>
            `);

            printWindow.document.close();
        }

        if (button.id === "awardQrBackToStatistics") {
            const url = new URL(window.location.href);
            url.searchParams.delete("result");
            url.searchParams.set("page", "statistics");
            window.location.href = url.toString();
        }
    });
}

// If a QR link contains a shared result, open Statistics & Awards
// and show that result instead of relying on this device's LocalStorage.
const sharedResultParams = new URLSearchParams(window.location.search);

if (sharedResultParams.has("result")) {
    qrOpenStatisticsPage();

    // Wait until the Statistics page has been rendered.
    requestAnimationFrame(() => {
        qrRenderSharedResult();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}

})();