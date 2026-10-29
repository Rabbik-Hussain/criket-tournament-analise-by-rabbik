/* =========================================================
   MATCHCRAFT CRICKET — MATCH & LIVE SCORE
   File: match.js
   Schedule -> Players -> Toss/Teams -> Opening Players
   -> Ball-by-ball scoring -> Innings -> Result
========================================================= */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);

 const STORAGE = {
  matches: ["matchcraft_cricket_matches"],
  teams: ["matchcraft_cricket_teams"],
  players: ["matchcraft_cricket_players"],
  tournaments: ["matchcraft_cricket_tournaments"]
};

  const state = {
    root: null,
    matches: [],
    rawMatches: [],
    teams: [],
    players: [],
    tournaments: [],
    selectedMatchId: "",
    draft: null,
    notice: ""
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  function readArray(keys) {
    for (const key of keys) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(value)) return { key, data: value };
        if (value && Array.isArray(value.data)) {
          return { key, data: value.data };
        }
        if (value && Array.isArray(value.items)) {
          return { key, data: value.items };
        }
      } catch (_) {}
    }
    return { key: keys[0], data: [] };
  }

  function saveArray(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function idOf(item) {
    return String(
      item?.id ?? item?._id ?? item?.playerId ??
      item?.teamId ?? item?.matchId ?? item?.fixtureId ?? ""
    );
  }

  function nameOf(item) {
    return item?.name ?? item?.playerName ?? item?.teamName ??
      item?.title ?? item?.fullName ?? "Unknown";
  }

  function teamIdOf(item, side) {
    const value = side === 1
      ? item?.team1Id ?? item?.homeTeamId ?? item?.teamAId
      : item?.team2Id ?? item?.awayTeamId ?? item?.teamBId;
    return value == null ? "" : String(value);
  }

  function teamNameOf(match, side) {
    const id = teamIdOf(match, side);
    const savedTeam = state.teams.find(team => id && idOf(team) === id);
    const storedName = side === 1
      ? match?.team1Name ?? match?.homeTeamName ?? match?.teamAName
      : match?.team2Name ?? match?.awayTeamName ?? match?.teamBName;

    return storedName || (savedTeam ? nameOf(savedTeam) : `Team ${side}`);
  }

  function getTeamById(teamId) {
  const id = String(teamId ?? "");
  if (!id) return null;

  return state.teams.find(team => idOf(team) === id) || null;
}

function renderTeamIdentity(teamId, fallbackName, compact = false) {
  const team = getTeamById(teamId);
  const name = team?.name || fallbackName || "Unknown Team";
  const logo = team?.logo;
  const size = compact ? 30 : 40;

  return `
    <span style="
      display:inline-flex;
      align-items:center;
      gap:8px;
      min-width:0;
      vertical-align:middle;
    ">
      ${
        logo
          ? `<img
              src="${esc(logo)}"
              alt="${esc(name)} logo"
              style="
                width:${size}px;
                height:${size}px;
                min-width:${size}px;
                object-fit:cover;
                border-radius:50%;
                border:1px solid rgba(255,255,255,.18);
              "
            >`
          : `<span
              aria-hidden="true"
              style="
                display:inline-flex;
                align-items:center;
                justify-content:center;
                width:${size}px;
                height:${size}px;
                min-width:${size}px;
                border-radius:50%;
                background:rgba(255,255,255,.08);
              "
            >🏏</span>`
      }
      <span>${esc(name)}</span>
    </span>`;
}

  function playerTeamId(player) {
    const value = player?.teamId ?? player?.team_id ??
      player?.clubId ?? player?.squadId ?? "";
    return value == null ? "" : String(value);
  }

  function playerNumber(player) {
    return player?.jerseyNumber ?? player?.shirtNumber ??
      player?.number ?? player?.jersey ?? "";
  }

  function playerIsAvailable(player) {
    return player?.active !== false &&
      player?.isActive !== false &&
      player?.status !== "Inactive";
  }

  function matchStatus(match) {
    const status = String(match?.status ?? "").toLowerCase();
    if (match?.completed || ["completed", "finished", "full time", "result"].includes(status)) {
      return "Completed";
    }
    if (match?.isLive || ["live", "in progress", "ongoing"].includes(status)) {
      return "Live";
    }
    return "Scheduled";
  }

  function readData() {
  const matches = readArray(STORAGE.matches);
  const teams = readArray(STORAGE.teams);
  const players = readArray(STORAGE.players);
  const tournaments = readArray(STORAGE.tournaments);

  state.rawMatches = matches.data;
  state.teams = teams.data;
  state.players = players.data;
  state.tournaments = tournaments.data;

  // কেবল বর্তমান ক্রিকেট টিমের সঙ্গে যুক্ত ম্যাচ দেখাবে।
  const cricketTeamIds = new Set(
    state.teams.map(team => idOf(team)).filter(Boolean)
  );

  state.matches = state.rawMatches.filter(match => {
    const team1Id = teamIdOf(match, 1);
    const team2Id = teamIdOf(match, 2);

    return Boolean(
      team1Id &&
      team2Id &&
      team1Id !== team2Id &&
      cricketTeamIds.has(team1Id) &&
      cricketTeamIds.has(team2Id)
    );
  });

  state.storageKeys = {
    matches: matches.key,
    teams: teams.key,
    players: players.key,
    tournaments: tournaments.key
  };
}

 function saveMatches() {
  // যাচাইয়ে বাদ পড়া পুরোনো রেকর্ড মুছে ফেলবে না।
  const updatedMatches = new Map(
    state.matches.map(match => [idOf(match), match])
  );

  state.rawMatches = state.rawMatches.map(match =>
    updatedMatches.has(idOf(match))
      ? updatedMatches.get(idOf(match))
      : match
  );

  saveArray(state.storageKeys.matches, state.rawMatches);
}

  function findMatch(id) {
    return state.matches.find(match => idOf(match) === String(id));
  }

  function getTournament(match) {
  const tournamentId = String(
    match?.tournamentId ??
    match?.tournament_id ??
    match?.tournament?.id ??
    match?.tournament?.tournamentId ??
    ""
  );

  if (!tournamentId) return null;

  return state.tournaments.find(item =>
    String(item?.id ?? item?._id ?? item?.tournamentId ?? "") === tournamentId
  ) || null;
}

 function getOvers(match) {
  const tournament = getTournament(match);

  const type = String(tournament?.type ?? "").toLowerCase();
  const format = String(
    tournament?.customFormat ??
    tournament?.matchFormat ??
    tournament?.format ??
    match?.matchType ??
    match?.format ??
    ""
  ).toLowerCase();

  let raw;

  if (type === "custom") {
    // Custom tournament-এর আসল property
    raw = tournament?.customOvers;
  } else if (type === "t20" || type === "odi") {
    // T20 ও ODI-এর আসল property
    raw = tournament?.overs;
  } else if (type === "franchise") {
    // BPL/IPL-এ matchFormat অনুযায়ী default
    if (format === "custom") {
      raw =
        tournament?.customOvers ??
        tournament?.oversPerInnings ??
        tournament?.overs;
    } else {
      raw =
        tournament?.overs ??
        tournament?.oversPerInnings ??
        tournament?.oversPerInning;
    }
  } else {
    raw =
      tournament?.oversPerInnings ??
      tournament?.oversPerInning ??
      tournament?.overs ??
      tournament?.totalOvers ??
      tournament?.matchOvers;
  }

  const overs = Number(raw);

  if (Number.isFinite(overs) && overs > 0) {
    return overs;
  }

  if (format.includes("test") || type === "test") return 90;
  if (format.includes("odi") || format.includes("one day") || type === "odi") return 50;
  if (format.includes("t20") || format.includes("twenty20") || type === "t20") return 20;
  if (format.includes("bpl") || format.includes("ipl") || type === "franchise") return 20;

  return 20;
}

  function getTeamPlayers(teamId) {
    const id = String(teamId ?? "");
    if (!id) return [];

    return state.players.filter(player =>
      playerIsAvailable(player) && playerTeamId(player) === id
    );
  }

  function scoreOf(innings) {
    return {
      runs: Number(innings?.runs || 0),
      wickets: Number(innings?.wickets || 0),
      legalBalls: Number(innings?.legalBalls || 0),
      overs: `${Math.floor(Number(innings?.legalBalls || 0) / 6)}.${Number(innings?.legalBalls || 0) % 6}`
    };
  }

  function inningsTemplate(teamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId) {
    return {
      battingTeamId: String(teamId),
      bowlingTeamId: String(bowlingTeamId),
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      batters: {
        [String(strikerId)]: { runs: 0, balls: 0, fours: 0, sixes: 0, out: false },
        [String(nonStrikerId)]: { runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
      },
      bowlers: {
        [String(bowlerId)]: { legalBalls: 0, runs: 0, wickets: 0, maidens: 0 }
      },
      strikerId: String(strikerId),
      nonStrikerId: String(nonStrikerId),
      bowlerId: String(bowlerId),
      events: [],
      complete: false
    };
  }

  function newDraft(match) {
    const t1 = teamIdOf(match, 1);
    const t2 = teamIdOf(match, 2);

    return {
      matchId: idOf(match),
      team1Id: t1,
      team2Id: t2,
      team1Name: teamNameOf(match, 1),
      team2Name: teamNameOf(match, 2),
      oversPerInnings: getOvers(match),
      innings: [],
      currentInnings: 0,
      phase: "setup",
      tossWinnerId: "",
      tossDecision: "bat",
      firstBattingTeamId: "",
      firstBowlingTeamId: "",
      setup: {
        team1Players: [],
        team2Players: [],
        strikerId: "",
        nonStrikerId: "",
        bowlerId: ""
      },
      result: "",
      updatedAt: new Date().toISOString()
    };
  }

 function loadDraft(match) {
  if (!match) {
    state.draft = null;
    return null;
  }

  if (
    match.liveData &&
    String(match.liveData.matchId) === String(idOf(match))
  ) {
    state.draft = match.liveData;
  } else {
    state.draft = newDraft(match);
  }

  const draft = state.draft;

  if (!Array.isArray(draft.innings)) {
    draft.innings = [];
  }

  // সব ইনিংসের বৈধ বলের সংখ্যা পরীক্ষা করো।
  const legalBallsRecorded = draft.innings.reduce(
    (total, innings) =>
      total + (Number(innings?.legalBalls) || 0),
    0
  );

  // ম্যাচ শুরু হয়নি এবং কোনো বল রেকর্ড হয়নি:
  // Tournament Setup-এর সর্বশেষ ওভার নাও।
  if (
    draft.phase === "setup" &&
    legalBallsRecorded === 0
  ) {
    draft.oversPerInnings = getOvers(match);
  }

  return draft;
}

  function persistDraft() {
    const match = findMatch(state.selectedMatchId);
    if (!match || !state.draft) return;

    state.draft.updatedAt = new Date().toISOString();
    match.liveData = state.draft;
    match.winnerTeamId = state.draft.winnerTeamId || null;

    if (state.draft.phase === "live") {
      match.status = "Live";
      match.isLive = true;
      match.completed = false;
    } else if (state.draft.phase === "completed") {
      match.status = "Completed";
      match.isLive = false;
      match.completed = true;
      match.result = state.draft.result;
    }

    saveMatches();
  }

  function activeInnings() {
    return state.draft?.innings?.[state.draft.currentInnings] || null;
  }

  function getPlayer(id) {
    return state.players.find(player => idOf(player) === String(id));
  }

  function currentScore() {
    const innings = activeInnings();
    if (!innings) return { runs: 0, wickets: 0, legalBalls: 0, overs: "0.0" };
    return scoreOf(innings);
  }

  function render() {
    if (!state.root) return;

    const matches = state.matches;
    const selected = findMatch(state.selectedMatchId);

    state.root.innerHTML = `
      <div class="mc-match-app">
        <header class="mc-match-header">
          <div>
            <span class="mc-match-eyebrow">MATCHCRAFT CRICKET</span>
            <h2>Match Center & Live Score</h2>
            <p>Manage fixtures, innings and ball-by-ball scoring.</p>
          </div>
          <button class="mc-btn mc-btn-secondary" data-action="refresh">Refresh</button>
        </header>

        <div class="mc-match-stats">
          <div class="mc-stat-card"><span>Total Matches</span><strong>${matches.length}</strong></div>
          <div class="mc-stat-card"><span>Live Matches</span><strong>${matches.filter(m => matchStatus(m) === "Live").length}</strong></div>
          <div class="mc-stat-card"><span>Scheduled</span><strong>${matches.filter(m => matchStatus(m) === "Scheduled").length}</strong></div>
          <div class="mc-stat-card"><span>Completed</span><strong>${matches.filter(m => matchStatus(m) === "Completed").length}</strong></div>
        </div>

        ${state.notice ? `<div class="mc-notice">${esc(state.notice)}</div>` : ""}

        <div class="mc-match-layout">
          <aside class="mc-fixture-panel">
            <div class="mc-panel-heading">
              <h3>Match Schedule</h3>
              <span>${matches.length} matches</span>
            </div>
            <div class="mc-fixture-list">
              ${matches.length ? matches.map(match => {
                const id = idOf(match);
                const status = matchStatus(match);
                const live = match.liveData;
                const firstScore = live?.innings?.[0];
                const secondScore = live?.innings?.[1];
                return `
                  <button class="mc-fixture ${id === state.selectedMatchId ? "is-selected" : ""}"
                    data-action="select-match" data-id="${esc(id)}">
                    <span class="mc-fixture-top">
                      <span>${esc(match.round ?? match.stage ?? match.matchType ?? "Fixture")}</span>
                      <span class="mc-status mc-status-${status.toLowerCase()}">${status}</span>
                    </span>
                    ${renderTeamIdentity(
  teamIdOf(match, 1),
  teamNameOf(match, 1),
  true
)}
                    <span class="mc-fixture-score">${firstScore ? `${firstScore.runs}/${firstScore.wickets}` : "—"}</span>
                    ${renderTeamIdentity(
  teamIdOf(match, 2),
  teamNameOf(match, 2),
  true
)}
                    <span class="mc-fixture-score">${secondScore ? `${secondScore.runs}/${secondScore.wickets}` : "—"}</span>
                    <small>${esc(match.date ?? match.matchDate ?? "Date not set")}</small>
                  </button>`;
              }).join("") : `<div class="mc-empty">No scheduled matches found. Generate fixtures from Standing & Playoffs first.</div>`}
            </div>
          </aside>

          <main class="mc-live-panel">
            ${selected ? renderSelectedMatch(selected) : `
              <div class="mc-empty mc-empty-large">
                <span class="mc-empty-icon">🏏</span>
                <h3>Select a match</h3>
                <p>Choose a fixture from the schedule to set up or manage the match.</p>
              </div>`}
          </main>
        </div>
      </div>`;
  }

 function renderSelectedMatch(match) {
    const draft = state.draft || newDraft(match);
    const status = matchStatus(match);

    if (draft.phase === "live" || draft.phase === "completed") {
      return renderLiveMatch(match, draft);
    }

    const t1 = draft.team1Id;
    const t2 = draft.team2Id;

    const team1Players = getTeamPlayers(t1);
    const team2Players = getTeamPlayers(t2);

    const saved1 = new Set(
      (draft.setup.team1Players || []).map(String)
    );

    const saved2 = new Set(
      (draft.setup.team2Players || []).map(String)
    );

    const options = (players, side) => players.map(player => `
      <label class="mc-player-option">
        <input type="checkbox"
          data-action="toggle-player"
          data-player-id="${esc(idOf(player))}"
          data-side="${side}"
          ${side === "1"
            ? saved1.has(String(idOf(player))) ? "checked" : ""
            : saved2.has(String(idOf(player))) ? "checked" : ""}>
        <span class="mc-player-number">${esc(playerNumber(player) || "—")}</span>
        <span>${esc(nameOf(player))}</span>
      </label>
    `).join("");

    const chosen1 = team1Players.filter(player =>
      saved1.has(String(idOf(player)))
    );

    const chosen2 = team2Players.filter(player =>
      saved2.has(String(idOf(player)))
    );

    const battingTeamId = String(draft.firstBattingTeamId || "");
    const bowlingTeamId = String(draft.firstBowlingTeamId || "");

    const selectedBattingPlayers =
      battingTeamId === String(t1) ? chosen1 :
      battingTeamId === String(t2) ? chosen2 : [];

    const selectedBowlingPlayers =
      bowlingTeamId === String(t1) ? chosen1 :
      bowlingTeamId === String(t2) ? chosen2 : [];

    return `
      <div class="mc-selected-match">
        <div class="mc-match-titlebar">
          <div>
            <span class="mc-match-eyebrow">
              ${esc(match.round ?? match.stage ?? "Scheduled Match")}
            </span>

            <h3 style="
              display:flex;
              align-items:center;
              flex-wrap:wrap;
              gap:12px;
            ">
              ${renderTeamIdentity(draft.team1Id, draft.team1Name)}
              <span>vs</span>
              ${renderTeamIdentity(draft.team2Id, draft.team2Name)}
            </h3>

            <p>
              ${esc(match.date ?? match.matchDate ?? "Date not set")}
              · ${draft.oversPerInnings} overs per innings
            </p>
          </div>

          <span class="mc-status mc-status-${status.toLowerCase()}">
            ${status}
          </span>
        </div>

        <div class="mc-setup-step">
          <h4><span>1</span> Select players for both teams</h4>

          <p>
            Select the players who will be available for each team.
            The list comes from the existing Player page.
          </p>

          <div class="mc-team-select-grid">
            <section class="mc-player-pick">
              <div class="mc-pick-heading">
                <strong>${esc(draft.team1Name)}</strong>
                <span>${chosen1.length} selected</span>
              </div>

              <div class="mc-player-list">
                ${
                  options(team1Players, "1") ||
                  `<p class="mc-empty">No players linked to this team in Player data.</p>`
                }
              </div>
            </section>

            <section class="mc-player-pick">
              <div class="mc-pick-heading">
                <strong>${esc(draft.team2Name)}</strong>
                <span>${chosen2.length} selected</span>
              </div>

              <div class="mc-player-list">
                ${
                  options(team2Players, "2") ||
                  `<p class="mc-empty">No players linked to this team in Player data.</p>`
                }
              </div>
            </section>
          </div>

          <div class="mc-equal-count">
            Selected players: ${chosen1.length} vs ${chosen2.length}
          </div>
        </div>

        <div class="mc-setup-step">
          <h4><span>2</span> Choose first innings teams</h4>

          <div class="mc-form-grid">
            <label class="mc-field">
              <span>Batting team</span>

              <select id="mc-first-batting">
                <option value="">Select batting team</option>
                <option value="${esc(t1)}"
                  ${String(draft.firstBattingTeamId) === String(t1) ? "selected" : ""}
                  ${String(draft.firstBowlingTeamId) === String(t1) ? "disabled" : ""}>
                  ${esc(draft.team1Name)}
                </option>
                <option value="${esc(t2)}"
                  ${String(draft.firstBattingTeamId) === String(t2) ? "selected" : ""}
                  ${String(draft.firstBowlingTeamId) === String(t2) ? "disabled" : ""}>
                  ${esc(draft.team2Name)}
                </option>
              </select>
            </label>

            <label class="mc-field">
              <span>Bowling team</span>

              <select id="mc-first-bowling">
                <option value="">Select bowling team</option>
                <option value="${esc(t1)}"
                  ${String(draft.firstBowlingTeamId) === String(t1) ? "selected" : ""}
                  ${String(draft.firstBattingTeamId) === String(t1) ? "disabled" : ""}>
                  ${esc(draft.team1Name)}
                </option>
                <option value="${esc(t2)}"
                  ${String(draft.firstBowlingTeamId) === String(t2) ? "selected" : ""}
                  ${String(draft.firstBattingTeamId) === String(t2) ? "disabled" : ""}>
                  ${esc(draft.team2Name)}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div class="mc-setup-step">
          <h4><span>3</span> Select opening players</h4>

          <div class="mc-form-grid mc-form-grid-three">
            <label class="mc-field">
              <span>Striker</span>

              <select id="mc-striker">
                <option value="">Select striker</option>

                ${selectedBattingPlayers.map(player => `
                  <option
                    value="${esc(idOf(player))}"
                    ${String(draft.setup.strikerId) === String(idOf(player))
                      ? "selected" : ""}
                    ${String(idOf(player)) === String(draft.setup.nonStrikerId)
                      ? "disabled" : ""}>
                    ${esc(nameOf(player))}
                  </option>
                `).join("")}
              </select>
            </label>

            <label class="mc-field">
              <span>Non-striker</span>

              <select id="mc-non-striker">
                <option value="">Select non-striker</option>

                ${selectedBattingPlayers.map(player => `
                  <option
                    value="${esc(idOf(player))}"
                    ${String(draft.setup.nonStrikerId) === String(idOf(player))
                      ? "selected" : ""}
                    ${String(idOf(player)) === String(draft.setup.strikerId)
                      ? "disabled" : ""}>
                    ${esc(nameOf(player))}
                  </option>
                `).join("")}
              </select>
            </label>

            <label class="mc-field">
              <span>Opening bowler</span>

              <select id="mc-bowler">
                <option value="">Select bowler</option>

                ${selectedBowlingPlayers.map(player => `
                  <option
                    value="${esc(idOf(player))}"
                    ${String(draft.setup.bowlerId) === String(idOf(player))
                      ? "selected" : ""}>
                    ${esc(nameOf(player))}
                  </option>
                `).join("")}
              </select>
            </label>
          </div>

          <p class="mc-help">
            Striker ও Non-striker অবশ্যই নির্বাচিত Batting Team-এর
            Player হতে হবে। Opening Bowler নির্বাচিত Bowling Team-এর
            Player হতে হবে।
          </p>
        </div>

        <div class="mc-action-row">
          <button class="mc-btn mc-btn-primary" data-action="start-match">
            Start Match
          </button>
        </div>
      </div>`;
}

  function renderLiveMatch(match, draft) {
    const innings = draft?.innings?.[draft.currentInnings] || null;
    const score = scoreOf(innings || {});
    const battingName = innings?.battingTeamId === draft.team1Id
      ? draft.team1Name : draft.team2Name;
    const bowlingName = innings?.bowlingTeamId === draft.team1Id
      ? draft.team1Name : draft.team2Name;

    const striker = getPlayer(innings?.strikerId);
    const nonStriker = getPlayer(innings?.nonStrikerId);
    const bowler = getPlayer(innings?.bowlerId);
    const batterStat = id => innings?.batters?.[String(id)] || {};
    const bowlerStat = id => innings?.bowlers?.[String(id)] || {};

    const battingOptions = state.players.filter(p => {
  const playerId = String(idOf(p));
  const stat = innings?.batters?.[playerId];

  return (
    playerTeamId(p) === String(innings?.battingTeamId) &&
    !stat?.out
  );
});
    const bowlingOptions = state.players.filter(p =>
      playerTeamId(p) === String(innings?.bowlingTeamId)
    );

    const isCompleted = draft.phase === "completed";
    const overBalls = innings?.events?.slice(-6) || [];

    return `
      <div class="mc-live-match">
        <div class="mc-match-titlebar">
          <div>
            <span class="mc-match-eyebrow">${esc(match.round ?? match.stage ?? "Live Match")}</span>
            <h3 style="
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:12px;
">
  ${renderTeamIdentity(draft.team1Id, draft.team1Name)}
  <span>vs</span>
  ${renderTeamIdentity(draft.team2Id, draft.team2Name)}
</h3>
            <p>${draft.oversPerInnings} overs per innings · ${draft.innings.length} innings recorded</p>
          </div>
          <span class="mc-status ${isCompleted ? "mc-status-completed" : "mc-status-live"}">${isCompleted ? "Completed" : "LIVE"}</span>
        </div>

        <div class="mc-scoreboard">
          <span class="mc-score-team">${esc(battingName)} batting</span>
          <div class="mc-big-score">${score.runs}<span>/${score.wickets}</span></div>
          <div class="mc-score-meta">Overs <strong>${score.overs}</strong> / ${draft.oversPerInnings}</div>
          <div class="mc-score-meta">Bowling: <strong>${esc(bowlingName)}</strong></div>
          ${draft.innings.length > 1 ? `<div class="mc-target-line">Target: ${Number(draft.innings[0].runs || 0) + 1}</div>` : ""}
        </div>

       <div class="mc-batter-table">
  <div class="mc-table-heading">
    <span>Batter</span>
    <span>R</span>
    <span>B</span>
    <span>4s</span>
    <span>6s</span>
  </div>

  ${Object.entries(innings?.batters || {}).map(([playerId, stat]) => {
    const player = getPlayer(playerId);
    const isOut = Boolean(stat.out);
    const isStriker =
      String(playerId) === String(innings.strikerId) && !isOut;

    return `
      <div class="mc-table-row"
        style="${isOut ? "opacity:.45;" : ""}">
        <strong>
          ${esc(nameOf(player || { name: playerId }))}
          ${isStriker ? " *" : ""}
          ${isOut ? '<span style="color:#f87171;font-weight:800;margin-left:5px;">W</span>' : ""}
        </strong>
        <span>${stat.runs || 0}</span>
        <span>${stat.balls || 0}</span>
        <span>${stat.fours || 0}</span>
        <span>${stat.sixes || 0}</span>
      </div>
    `;
  }).join("")}
</div>

        <div class="mc-bowler-line">
          <span>Bowler: <strong>${esc(nameOf(bowler || {}))}</strong></span>
          <span>${Math.floor((bowlerStat(innings?.bowlerId).legalBalls || 0) / 6)}.${(bowlerStat(innings?.bowlerId).legalBalls || 0) % 6} overs</span>
          <span>${bowlerStat(innings?.bowlerId).runs || 0} runs</span>
          <span>${bowlerStat(innings?.bowlerId).wickets || 0} wickets</span>
        </div>

        <div class="mc-over-display">
          <strong>Recent balls</strong>
          <div class="mc-ball-list">
            ${overBalls.length ? overBalls.map(event => `<span class="mc-ball ${event.wicket ? "mc-ball-wicket" : ""}">${esc(event.label)}</span>`).join("") : `<span class="mc-muted">No balls recorded yet</span>`}
          </div>
        </div>

        ${!isCompleted ? `
          <section class="mc-scoring-section">
            <h4>Record next ball</h4>
            <div class="mc-run-buttons">
              ${[0, 1, 2, 3, 4, 6].map(run => `<button class="mc-run-btn ${run === 4 || run === 6 ? "mc-run-boundary" : ""}" data-action="ball-runs" data-runs="${run}">${run}</button>`).join("")}
            </div>
            <div class="mc-extra-buttons">
              <button class="mc-btn mc-btn-secondary" data-action="extra" data-extra="wide">Wide</button>
              <button class="mc-btn mc-btn-secondary" data-action="extra" data-extra="noball">No-ball</button>
              <button class="mc-btn mc-btn-secondary" data-action="extra" data-extra="bye">Bye</button>
              <button class="mc-btn mc-btn-secondary" data-action="extra" data-extra="legbye">Leg-bye</button>
              <button class="mc-btn mc-btn-danger" data-action="wicket">Wicket</button>
              <button class="mc-btn mc-btn-secondary" data-action="undo">Undo last ball</button>
            </div>
          </section>

          <section class="mc-setup-step">
            <h4>Change striker / bowler</h4>
            <div class="mc-form-grid mc-form-grid-three">
              <label class="mc-field"><span>Striker</span><select id="mc-live-striker">${battingOptions.map(p => `<option value="${esc(idOf(p))}" ${idOf(p) === String(innings.strikerId) ? "selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>
              <label class="mc-field"><span>Non-striker</span><select id="mc-live-nonstriker">${battingOptions.map(p => `<option value="${esc(idOf(p))}" ${idOf(p) === String(innings.nonStrikerId) ? "selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>
              <label class="mc-field"><span>Bowler</span><select id="mc-live-bowler">${bowlingOptions.map(p => `<option value="${esc(idOf(p))}" ${idOf(p) === String(innings.bowlerId) ? "selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>
            </div>
            <button class="mc-btn mc-btn-secondary" data-action="save-players">Save player selection</button>
          </section>

          <div class="mc-action-row">
            <button class="mc-btn mc-btn-primary" data-action="finish-innings">End innings</button>
            <button class="mc-btn mc-btn-danger" data-action="finish-match">End match</button>
          </div>
        ` : `
          <div class="mc-result-panel"><h4>Match completed</h4><p>${esc(draft.result || "Result saved.")}</p></div>
          <div class="mc-action-row"><button class="mc-btn mc-btn-secondary" data-action="scorecard">View scorecard</button></div>
        `}

        <details class="mc-scorecard-details">
          <summary>Full innings scorecard</summary>
          ${draft.innings.map((inn, index) => {
            const teamName = inn.battingTeamId === draft.team1Id ? draft.team1Name : draft.team2Name;
            return `<div class="mc-innings-card"><strong>Innings ${index + 1}: ${esc(teamName)}</strong><p>${inn.runs}/${inn.wickets} in ${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6} overs</p><div>${Object.entries(inn.batters || {}).map(([id, stat]) => `<p>${esc(nameOf(getPlayer(id) || {}))}: ${stat.runs || 0} runs (${stat.balls || 0} balls)${stat.out ? " — Out" : ""}</p>`).join("")}</div></div>`;
          }).join("")}
        </details>
      </div>`;
  }

  function refreshSetupPlayerLists() {
    const draft = state.draft;
    if (!draft) return;

    const battingSelect = $("#mc-first-batting", state.root);
    const bowlingSelect = $("#mc-first-bowling", state.root);

    if (battingSelect) draft.firstBattingTeamId = battingSelect.value;
    if (bowlingSelect) draft.firstBowlingTeamId = bowlingSelect.value;

    const battingId = draft.firstBattingTeamId;
    const bowlingId = draft.firstBowlingTeamId;

    if (battingId === draft.team1Id) {
      draft.setup.strikerId = $("#mc-striker", state.root)?.value || "";
      draft.setup.nonStrikerId = $("#mc-non-striker", state.root)?.value || "";
    } else if (battingId === draft.team2Id) {
      draft.setup.strikerId = "";
      draft.setup.nonStrikerId = "";
    }

    if (bowlingId === draft.team1Id) draft.setup.bowlerId = $("#mc-bowler", state.root)?.value || "";
    else if (bowlingId === draft.team2Id) draft.setup.bowlerId = "";

    render();
  }

  function startMatch() {
    console.log("START MATCH FUNCTION ENTERED");

    const match = findMatch(state.selectedMatchId);

    if (!match) {
        notify("প্রথমে একটি ম্যাচ নির্বাচন করো।");
        return;
    }

    if (!state.draft || String(state.draft.matchId) !== String(idOf(match))) {
        state.draft = loadDraft(match);
    }

    const draft = state.draft;

    console.log("DEBUG SETUP", {
  phase: draft?.phase,
  setup: draft?.setup,
  team1Players: draft?.setup?.team1Players,
  team2Players: draft?.setup?.team2Players
});

    if (draft.phase === "live" || draft.phase === "completed") {
        notify("এই ম্যাচ ইতিমধ্যে শুরু হয়েছে অথবা শেষ হয়েছে।");
        render();
        return;
    }

    const setup = draft.setup || {};
    console.log("DEBUG BEFORE VALIDATION", {
  team1Count: (setup.team1Players || []).length,
  team2Count: (setup.team2Players || []).length,
  battingTeam: $("#mc-first-batting", state.root)?.value,
  bowlingTeam: $("#mc-first-bowling", state.root)?.value,
  striker: $("#mc-striker", state.root)?.value,
  nonStriker: $("#mc-non-striker", state.root)?.value,
  bowler: $("#mc-bowler", state.root)?.value
});
    const team1Players = setup.team1Players || [];
    const team2Players = setup.team2Players || [];

    if (!team1Players.length || !team2Players.length) {
        notify("দুই দল থেকেই অন্তত একজন খেলোয়াড় নির্বাচন করো।");
        return;
    }

    if (team1Players.length !== team2Players.length) {
        notify("দুই দলের নির্বাচিত খেলোয়াড়ের সংখ্যা সমান হতে হবে।");
        return;
    }

    const battingSelect = $("#mc-first-batting", state.root);
    const bowlingSelect = $("#mc-first-bowling", state.root);
    const strikerSelect = $("#mc-striker", state.root);
    const nonStrikerSelect = $("#mc-non-striker", state.root);
    const bowlerSelect = $("#mc-bowler", state.root);

    const battingTeamId = String(
        battingSelect?.value || draft.firstBattingTeamId || ""
    );

    const bowlingTeamId = String(
        bowlingSelect?.value || draft.firstBowlingTeamId || ""
    );

    const strikerId = String(
        strikerSelect?.value || setup.strikerId || ""
    );

    const nonStrikerId = String(
        nonStrikerSelect?.value || setup.nonStrikerId || ""
    );

    const bowlerId = String(
        bowlerSelect?.value || setup.bowlerId || ""
    );

    if (!battingTeamId || !bowlingTeamId ||
        battingTeamId === bowlingTeamId) {
        notify("সঠিক ব্যাটিং দল ও বোলিং দল নির্বাচন করো।");
        return;
    }

    const battingPlayers = battingTeamId === String(draft.team1Id)
        ? team1Players
        : battingTeamId === String(draft.team2Id)
            ? team2Players
            : [];

    const bowlingPlayers = bowlingTeamId === String(draft.team1Id)
        ? team1Players
        : bowlingTeamId === String(draft.team2Id)
            ? team2Players
            : [];

    const selectedBatters = new Set(
        battingPlayers.map(id => String(id))
    );

    const selectedBowlers = new Set(
        bowlingPlayers.map(id => String(id))
    );

    if (!selectedBatters.has(strikerId) ||
        !selectedBatters.has(nonStrikerId)) {
        notify("স্ট্রাইকার ও নন-স্ট্রাইকারকে ব্যাটিং দলের নির্বাচিত খেলোয়াড়দের মধ্য থেকে নিতে হবে।");
        return;
    }

    if (strikerId === nonStrikerId) {
        notify("স্ট্রাইকার ও নন-স্ট্রাইকার আলাদা খেলোয়াড় হতে হবে।");
        return;
    }

    if (!selectedBowlers.has(bowlerId)) {
        notify("ওপেনিং বোলারকে বোলিং দলের নির্বাচিত খেলোয়াড়দের মধ্য থেকে নির্বাচন করো।");
        return;
    }

    draft.firstBattingTeamId = battingTeamId;
    draft.firstBowlingTeamId = bowlingTeamId;

    // Preserve the opening player selections
draft.setup = draft.setup || {};
draft.setup.strikerId = strikerId;
draft.setup.nonStrikerId = nonStrikerId;
draft.setup.bowlerId = bowlerId;

   draft.innings = [
    inningsTemplate(
        battingTeamId,
        bowlingTeamId,
        strikerId,
        nonStrikerId,
        bowlerId
    )
];

// নির্বাচিত ব্যাটিং দলের মোট খেলোয়াড়সংখ্যা সংরক্ষণ।
draft.innings[0].availableBatterCount = battingPlayers.length;

    draft.currentInnings = 0;
    draft.phase = "live";
    draft.result = "";

    console.log("BEFORE SAVE", {
    phase: state.draft?.phase,
    innings: state.draft?.innings?.length,
    bowlerId: state.draft?.innings?.[0]?.bowlerId
});

   persistDraft();

console.log("MATCHCRAFT START DEBUG", {
    selectedMatchId: state.selectedMatchId,
    draftMatchId: state.draft?.matchId,
    phase: state.draft?.phase,
    inningsCount: state.draft?.innings?.length,
    currentInnings: state.draft?.currentInnings,
    bowlerId: state.draft?.innings?.[0]?.bowlerId
});

console.log("AFTER SAVE");

render();

console.log("AFTER RENDER");
}

  function ensureBatter(innings, id) {
    if (!innings.batters[id]) {
      innings.batters[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }
    return innings.batters[id];
  }

  function ensureBowler(innings, id) {
    if (!innings.bowlers[id]) {
      innings.bowlers[id] = { legalBalls: 0, runs: 0, wickets: 0, maidens: 0 };
    }
    return innings.bowlers[id];
  }

 function recordBall({
    runs = 0,
    extra = "",
    wicket = false,
    wicketType = "",
    dismissedBatterId = ""
}) {
    const innings = activeInnings();

if (!innings || innings.complete || state.draft.phase !== "live") {
  return;
}

if (innings.pendingNewBatter) {
  notify("নতুন ব্যাটার নির্বাচন করে Save player selection চাপুন।");
  return;
}

    const strikerId = String(innings.strikerId);
    const bowlerId = String(innings.bowlerId);
    const batter = ensureBatter(innings, strikerId);
    const bowler = ensureBowler(innings, bowlerId);

    const isWide = extra === "wide";
    const isNoBall = extra === "noball";
    const isBye = extra === "bye";
    const isLegBye = extra === "legbye";
    const legal = !isWide && !isNoBall;

    const batRuns = isWide || isBye || isLegBye ? 0 : Number(runs || 0);
    let totalRuns = batRuns;

    if (isWide) totalRuns = 1 + Number(runs || 0);
    if (isNoBall) totalRuns = 1 + Number(runs || 0);

   innings.runs += totalRuns;

// Bye ও Leg Bye-এর রান বোলারের ব্যক্তিগত রানে যোগ হবে না।
if (!isBye && !isLegBye) {
    bowler.runs += totalRuns;
}

    if (!isWide && !isBye && !isLegBye) {
      batter.runs += batRuns;
      if (batRuns === 4) batter.fours += 1;
      if (batRuns === 6) batter.sixes += 1;
    }

    if (legal) {
      innings.legalBalls += 1;
      bowler.legalBalls += 1;
    }

    if (!isWide && !isBye && !isLegBye) batter.balls += 1;

    let isWicket = Boolean(wicket);
    if (isWicket) {
  innings.wickets += 1;
 const dismissedId = String(dismissedBatterId || strikerId);
const dismissedBatter = ensureBatter(innings, dismissedId);

dismissedBatter.out = true;
dismissedBatter.dismissal = wicketType || "Out";

  const countsForBowler = ![
    "run out",
    "retired hurt",
    "obstructing the field",
    "retired out"
  ].includes(String(wicketType).toLowerCase());

  if (countsForBowler) {
    bowler.wickets += 1;
  }

  // উইকেট পড়লে নতুন ব্যাটার নির্বাচন না করা পর্যন্ত
  // পরের বল রেকর্ড করা যাবে না।
  innings.pendingNewBatter = true;
  innings.dismissedBatterId = dismissedId;
  state.notice = `${nameOf(getPlayer(strikerId) || {})} OUT! নতুন ব্যাটার নির্বাচন করুন।`;
}

    const label = isWicket ? "W" :
      isWide ? `Wd${Number(runs || 0) ? "+" + Number(runs) : ""}` :
      isNoBall ? `Nb${Number(runs || 0) ? "+" + Number(runs) : ""}` :
      isBye ? `B${Number(runs || 0)}` :
      isLegBye ? `Lb${Number(runs || 0)}` : String(batRuns);

    innings.events.push({
      runs: totalRuns,
      batterRuns: batRuns,
      extra,
      wicket: isWicket,
      wicketType,
      legal,
      label,
      strikerId,
      bowlerId,
      timestamp: new Date().toISOString(),
      dismissedBatterId: isWicket
    ? String(dismissedBatterId || strikerId)
    : "",
    });

    const completedOver = legal && innings.legalBalls % 6 === 0;
    const strikeChanges = (isWide || isNoBall) ? Number(runs || 0) % 2 === 1 : totalRuns % 2 === 1;

    if (strikeChanges) {
      const oldStriker = innings.strikerId;
      innings.strikerId = innings.nonStrikerId;
      innings.nonStrikerId = oldStriker;
    }

    if (completedOver) {
      const oldStriker = innings.strikerId;
      innings.strikerId = innings.nonStrikerId;
      innings.nonStrikerId = oldStriker;
      state.notice = "Over completed. Select the next bowler if needed.";
    }

    if (isWicket) {
      innings.pendingNewBatter = true;
      state.notice = "Wicket recorded. Select a new batter before recording the next ball.";
    }

    const currentDraft = state.draft;

// পুরোনো ম্যাচে খেলোয়াড়সংখ্যা সংরক্ষিত না থাকলে পুনরুদ্ধার।
if (!Number(innings.availableBatterCount)) {
    const selectedPlayers =
        String(innings.battingTeamId) === String(currentDraft.team1Id)
            ? currentDraft.setup?.team1Players
            : currentDraft.setup?.team2Players;

    innings.availableBatterCount =
        Array.isArray(selectedPlayers) && selectedPlayers.length
            ? selectedPlayers.length
            : Object.keys(innings.batters || {}).length;
}

// একজন ব্যাটার বাকি থাকলে ইনিংস শেষ।
const allOut =
    innings.wickets >=
    Math.max(1, Number(innings.availableBatterCount) - 1);

if (allOut) {
    innings.complete = true;
    innings.pendingNewBatter = false;
    innings.dismissedBatterId = "";
}

// নির্ধারিত ওভার শেষ হয়েছে কি না।
const maxBalls = Number(currentDraft.oversPerInnings) * 6;
const oversFinished =
    maxBalls > 0 && innings.legalBalls >= maxBalls;

if (oversFinished) {
    innings.complete = true;
}

// দ্বিতীয় ইনিংসে প্রথম দলের স্কোর অতিক্রম করলেই জয়।
const firstInnings = currentDraft.innings[0];
const targetReached =
    currentDraft.currentInnings === 1 &&
    firstInnings &&
    innings.runs > firstInnings.runs;

if (targetReached) {
    innings.complete = true;
}

// ইনিংস শেষ হওয়ার যেকোনো কারণেই পরবর্তী পদক্ষেপ নাও।
if (innings.complete) {
    if (currentDraft.currentInnings === 0) {
        if (allOut) {
            state.notice = "All out! First innings completed.";
        } else {
            state.notice = "All overs completed. Starting second innings.";
        }

        finishInnings();
        return;
    }

    if (targetReached) {
        state.notice = "Target reached! Match completed.";
    } else if (allOut) {
        state.notice = "All out! Match completed.";
    } else if (oversFinished) {
        state.notice = "All overs completed. Match finished.";
    }

    completeMatch();
    return;
}

persistDraft();
render();
  }

  function chooseExtra(extra) {
    if (extra === "noball") {
        showNoBallCard();
        return;
    }

    if (extra === "wide") {
        recordBall({ extra: "wide", runs: 0 });
        return;
    }

    const input = prompt(
        extra === "bye" ? "Bye runs?" : "Leg-bye runs?",
        "1"
    );

    if (input === null) return;

    const runs = Number(input);

    if (!Number.isInteger(runs) || runs < 0 || runs > 6) {
        return notify("০ থেকে ৬-এর মধ্যে বৈধ রান দিন।");
    }

    recordBall({ extra, runs });
}

function showNoBallCard() {
    const innings = activeInnings();

    if (!innings || innings.complete || state.draft.phase !== "live") {
        return;
    }

    if (innings.pendingNewBatter) {
        return notify("আগে নতুন ব্যাটার নির্বাচন করুন।");
    }

    document.getElementById("mc-noball-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "mc-noball-modal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        z-index:100000;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:16px;
        background:rgba(0,0,0,.76);
    `;

    const panel = document.createElement("div");

    panel.style.cssText = `
        width:100%;
        max-width:420px;
        max-height:90vh;
        overflow:auto;
        padding:22px;
        border:1px solid #475569;
        border-radius:18px;
        background:#101827;
        color:#f8fafc;
        font-family:inherit;
        box-shadow:0 24px 70px rgba(0,0,0,.45);
    `;

    panel.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:21px">
            🏏 No-ball Situation
        </h3>

        <p style="color:#94a3b8;margin:0 0 18px">
            পরিস্থিতি নির্বাচন করুন
        </p>

        <label style="display:block;margin-bottom:8px">
            <strong>Situation</strong>
        </label>

        <select id="mc-noball-situation"
            style="width:100%;padding:12px;border-radius:10px;
            background:#1e293b;color:#fff;border:1px solid #475569">
            <option value="runs">Runs</option>
            <option value="runout">Run Out</option>
        </select>

        <div id="mc-noball-runs-box" style="margin-top:16px">
            <label for="mc-noball-runs"
                style="display:block;margin-bottom:8px">
                অতিরিক্ত রান (০–৬)
            </label>

            <select id="mc-noball-runs"
                style="width:100%;padding:12px;border-radius:10px;
                background:#1e293b;color:#fff;border:1px solid #475569">
                ${[0,1,2,3,4,5,6].map(n =>
                    `<option value="${n}" ${n === 0 ? "selected" : ""}>${n} run${n === 1 ? "" : "s"}</option>`
                ).join("")}
            </select>
        </div>

        <div id="mc-noball-runout-box"
            style="display:none;margin-top:16px">
            <label for="mc-noball-dismissed"
                style="display:block;margin-bottom:8px">
                কোন ব্যাটার Run Out?
            </label>

            <select id="mc-noball-dismissed"
                style="width:100%;padding:12px;border-radius:10px;
                background:#1e293b;color:#fff;border:1px solid #475569">
                <option value="${esc(innings.strikerId)}">
                    Striker — ${esc(nameOf(getPlayer(innings.strikerId) || {name: innings.strikerId}))}
                </option>
                <option value="${esc(innings.nonStrikerId)}">
                    Non-striker — ${esc(nameOf(getPlayer(innings.nonStrikerId) || {name: innings.nonStrikerId}))}
                </option>
            </select>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
            <button type="button" id="mc-noball-ok"
                style="flex:1;padding:12px;border:0;border-radius:10px;
                background:#d4a72c;color:#111827;font-weight:800">
                OK
            </button>

            <button type="button" id="mc-noball-cancel"
                style="flex:1;padding:12px;border:1px solid #475569;
                border-radius:10px;background:transparent;color:#e2e8f0">
                Cancel
            </button>
        </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    const situation = panel.querySelector("#mc-noball-situation");
    const runsBox = panel.querySelector("#mc-noball-runs-box");
    const runoutBox = panel.querySelector("#mc-noball-runout-box");

    situation.addEventListener("change", () => {
        const runout = situation.value === "runout";
        runsBox.style.display = runout ? "none" : "block";
        runoutBox.style.display = runout ? "block" : "none";
    });

    panel.querySelector("#mc-noball-cancel").addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    panel.querySelector("#mc-noball-ok").addEventListener("click", () => {
        const currentInnings = activeInnings();

        if (
            !currentInnings ||
            currentInnings.complete ||
            state.draft.phase !== "live" ||
            currentInnings.pendingNewBatter
        ) {
            modal.remove();
            return;
        }

        if (situation.value === "runout") {
            const dismissedId =
                panel.querySelector("#mc-noball-dismissed").value;

            modal.remove();

            recordBall({
                extra: "noball",
                runs: 0,
                wicket: true,
                wicketType: "Run Out",
                dismissedBatterId: dismissedId
            });

            return;
        }

        const runs = Number(
            panel.querySelector("#mc-noball-runs").value
        );

        modal.remove();

        recordBall({
            extra: "noball",
            runs
        });
    });
}

  function recordWicket() {
    const innings = activeInnings();
    if (!innings) return;

    const wicketTypes = [
        "Bowled",
        "Caught",
        "LBW",
        "Run Out",
        "Stumped",
        "Hit Wicket",
        "Retired Out"
    ];

    const existingModal = document.getElementById("mc-wicket-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "mc-wicket-modal";
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
        width: 100%;
        max-width: 420px;
        max-height: 90vh;
        overflow-y: auto;
        background: #101827;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 24px 70px rgba(0,0,0,.45);
        font-family: inherit;
    `;

    const heading = document.createElement("h3");
    heading.textContent = "🏏 Select Wicket Type";
    heading.style.cssText = `
        margin: 0 0 8px;
        font-size: 21px;
        font-weight: 700;
    `;
    panel.appendChild(heading);

    const subtitle = document.createElement("p");
    subtitle.textContent = "ব্যাটার কীভাবে আউট হয়েছে নির্বাচন করো";
    subtitle.style.cssText = `
        margin: 0 0 18px;
        color: #94a3b8;
        font-size: 14px;
    `;
    panel.appendChild(subtitle);

    const options = document.createElement("div");
    options.style.cssText = `
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    `;

    wicketTypes.forEach(type => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = type;
        button.style.cssText = `
            min-height: 52px;
            padding: 12px 8px;
            border: 1px solid #475569;
            border-radius: 12px;
            background: #1e293b;
            color: #f8fafc;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        `;

        button.addEventListener("click", () => {
    modal.remove();

    if (type === "Run Out") {
        showRunOutCard();
        return;
    }

    recordBall({
        wicket: true,
        wicketType: type
    });
});

        options.appendChild(button);
    });

    panel.appendChild(options);

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = `
        width: 100%;
        margin-top: 16px;
        padding: 12px;
        border: 1px solid #475569;
        border-radius: 10px;
        background: transparent;
        color: #cbd5e1;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
    `;
    cancel.addEventListener("click", () => modal.remove());

    panel.appendChild(cancel);
    modal.appendChild(panel);

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

function showRunOutCard() {
    const innings = activeInnings();

    if (!innings || innings.complete || state.draft.phase !== "live") {
        return;
    }

    if (innings.pendingNewBatter) {
        return notify("আগে নতুন ব্যাটার নির্বাচন করুন।");
    }

    document.getElementById("mc-runout-modal")?.remove();

    const modal = document.createElement("div");

    modal.id = "mc-runout-modal";
    modal.style.cssText = `
        position:fixed;
        inset:0;
        z-index:100000;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:16px;
        background:rgba(0,0,0,.76);
    `;

    const panel = document.createElement("div");

    panel.style.cssText = `
        width:100%;
        max-width:400px;
        padding:22px;
        border:1px solid #475569;
        border-radius:18px;
        background:#101827;
        color:#f8fafc;
        font-family:inherit;
        box-shadow:0 24px 70px rgba(0,0,0,.45);
    `;

    const strikerName = nameOf(
        getPlayer(innings.strikerId) || {name: innings.strikerId}
    );

    const nonStrikerName = nameOf(
        getPlayer(innings.nonStrikerId) || {name: innings.nonStrikerId}
    );

    panel.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:21px">
            🏏 Run Out
        </h3>

        <p style="color:#94a3b8;margin:0 0 16px">
            যে ব্যাটার আউট হয়েছে তাকে নির্বাচন করুন।
        </p>

        <label for="mc-runout-player"
            style="display:block;margin-bottom:8px">
            Dismissed batter
        </label>

        <select id="mc-runout-player"
            style="width:100%;padding:12px;border-radius:10px;
            background:#1e293b;color:#fff;border:1px solid #475569">
            <option value="${esc(innings.strikerId)}">
                Striker — ${esc(strikerName)}
            </option>
            <option value="${esc(innings.nonStrikerId)}">
                Non-striker — ${esc(nonStrikerName)}
            </option>
        </select>

        <div style="display:flex;gap:10px;margin-top:20px">
            <button type="button" id="mc-runout-confirm"
                style="flex:1;padding:12px;border:0;border-radius:10px;
                background:#d4a72c;color:#111827;font-weight:800">
                Confirm Run Out
            </button>

            <button type="button" id="mc-runout-cancel"
                style="flex:1;padding:12px;border:1px solid #475569;
                border-radius:10px;background:transparent;color:#e2e8f0">
                Cancel
            </button>
        </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    panel.querySelector("#mc-runout-cancel").addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    panel.querySelector("#mc-runout-confirm").addEventListener("click", () => {
        const currentInnings = activeInnings();

        if (
            !currentInnings ||
            currentInnings.complete ||
            state.draft.phase !== "live" ||
            currentInnings.pendingNewBatter
        ) {
            modal.remove();
            return;
        }

        const dismissedId =
            panel.querySelector("#mc-runout-player").value;

        modal.remove();

        recordBall({
            wicket: true,
            wicketType: "Run Out",
            dismissedBatterId: dismissedId
        });
    });
}

  function undoLastBall() {
    const innings = activeInnings();
    if (!innings?.events?.length) return notify("Undo করার মতো কোনো বল নেই.");

    const last = innings.events.pop();

    // Rebuild the current innings from its saved ball-by-ball history.
    const oldEvents = [...innings.events];
    const battingTeamId = innings.battingTeamId;
    const bowlingTeamId = innings.bowlingTeamId;
    const strikerId = innings.strikerId;
    const nonStrikerId = innings.nonStrikerId;
    const bowlerId = innings.bowlerId;

    const rebuilt = {
      ...inningsTemplate(battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId),
      events: []
    };

    state.draft.innings[state.draft.currentInnings] = rebuilt;
    for (const event of oldEvents) {
     recordBall({
    runs: event.batterRuns,
    extra: event.extra,
    wicket: event.wicket,
    wicketType: event.wicketType,
    dismissedBatterId: event.dismissedBatterId || ""
});
    }

    state.notice = "Last ball removed. Please verify the current batter and bowler.";
    persistDraft();
    render();
  }

  function saveLivePlayers() {
    const innings = activeInnings();
    if (!innings) return;

    const strikerId = $("#mc-live-striker", state.root)?.value;
    const nonStrikerId = $("#mc-live-nonstriker", state.root)?.value;
    const bowlerId = $("#mc-live-bowler", state.root)?.value;

    if (!strikerId || !nonStrikerId || !bowlerId || strikerId === nonStrikerId) {
      return notify("দুটি আলাদা ব্যাটার এবং একজন বোলার নির্বাচন করুন।");
    }

    if (
  innings.batters?.[String(strikerId)]?.out ||
  innings.batters?.[String(nonStrikerId)]?.out
) {
  return notify("আউট হওয়া খেলোয়াড়কে আবার নির্বাচন করা যাবে না।");
}

if (innings.pendingNewBatter) {
  const dismissedId = String(innings.dismissedBatterId || "");

  if (
    String(strikerId) === dismissedId ||
    String(nonStrikerId) === dismissedId
  ) {
    return notify("আউট হওয়া খেলোয়াড়ের পরিবর্তে নতুন ব্যাটার নির্বাচন করুন।");
  }
}

innings.strikerId = strikerId;
innings.nonStrikerId = nonStrikerId;
innings.bowlerId = bowlerId;

ensureBatter(innings, strikerId);
ensureBatter(innings, nonStrikerId);
ensureBowler(innings, bowlerId);

innings.pendingNewBatter = false;
innings.dismissedBatterId = "";

    persistDraft();
    state.notice = "Player selection saved.";
    render();
  }

  function finishInnings() {
    const draft = state.draft;
    const innings = activeInnings();
    if (!draft || !innings) return;

    innings.complete = true;

    if (draft.currentInnings === 0) {
      const battingTeamId = draft.firstBowlingTeamId;
      const bowlingTeamId = draft.firstBattingTeamId;
      const battingPlayers = battingTeamId === draft.team1Id
        ? draft.setup.team1Players : draft.setup.team2Players;
      const bowlingPlayers = bowlingTeamId === draft.team1Id
        ? draft.setup.team1Players : draft.setup.team2Players;

      if (battingPlayers.length < 2 || !bowlingPlayers.length) {
        draft.phase = "completed";
        draft.result = `${innings.runs} runs scored. No second innings could be set up.`;
      } else {
        const strikerId = battingPlayers[0];
        const nonStrikerId = battingPlayers[1];
        const bowlerId = bowlingPlayers[0];

        const second = inningsTemplate(
          battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId
        );
        second.availableBatterCount = battingPlayers.length;
        draft.innings.push(second);
        draft.currentInnings = 1;
        draft.phase = "live";
        state.notice = "Second innings started. Confirm striker, non-striker and bowler.";
      }
    } else {
      completeMatch();
      return;
    }

    persistDraft();
    render();
  }

  function completeMatch() {
    const draft = state.draft;
    if (!draft) return;

    draft.innings.forEach(inn => { inn.complete = true; });

    const first = draft.innings[0];
    const second = draft.innings[1];

    if (!second) {
      draft.result = `${first.runs}/${first.wickets} — innings completed.`;
    } else if (first.runs > second.runs) {
      const wicketsLeft = Math.max(0, (second.availableBatterCount || 10) - second.wickets);
      draft.result = `${first.battingTeamId === draft.team1Id ? draft.team1Name : draft.team2Name} won by ${wicketsLeft} wickets.`;
    } else if (second.runs > first.runs) {
      draft.result = `${second.battingTeamId === draft.team1Id ? draft.team1Name : draft.team2Name} won by ${Math.max(0, first.runs - second.runs)} runs.`;
    } else {
      draft.result = "Match tied.";
    }

    const firstInnings = draft.innings[0];
const secondInnings = draft.innings[1];

draft.winnerTeamId = null;

if (firstInnings && secondInnings) {
    if (firstInnings.runs > secondInnings.runs) {
        draft.winnerTeamId = firstInnings.battingTeamId;
    } else if (secondInnings.runs > firstInnings.runs) {
        draft.winnerTeamId = secondInnings.battingTeamId;
    }
}

    draft.phase = "completed";
    persistDraft();
    state.notice = "Match result saved.";
    render();
  }

  function notify(message) {
    state.notice = message;
    render();
  }

  function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

   if (action === "refresh") {
  refreshMatches();
  return;
}

    if (action === "select-match") {
      state.selectedMatchId = button.dataset.id;
      const match = findMatch(state.selectedMatchId);
      if (match) loadDraft(match);
      state.notice = "";
      render();
    }

   if (action === "start-match") {
    startMatch();
}
    if (action === "ball-runs") recordBall({ runs: Number(button.dataset.runs || 0) });
    if (action === "extra") chooseExtra(button.dataset.extra);
    if (action === "wicket") recordWicket();
    if (action === "undo") undoLastBall();
    if (action === "save-players") saveLivePlayers();
    if (action === "finish-innings") finishInnings();

    if (action === "finish-match") {
      if (confirm("Are you sure you want to end this match and save its result?")) {
        completeMatch();
      }
    }

    if (action === "scorecard") {
      state.notice = "Full scorecard is available in the innings section below.";
      render();
    }
  }

 function handleChange(event) {
  const target = event.target;
  const draft = state.draft;

  if (!draft) return;

  draft.setup = draft.setup || {};
  draft.setup.team1Players = (
    draft.setup.team1Players || []
  ).map(String);
  draft.setup.team2Players = (
    draft.setup.team2Players || []
  ).map(String);

  // Selected players: synchronize actual checkbox state.
  if (target.matches('[data-action="toggle-player"]')) {
    const side = target.dataset.side;

    const selector =
      `[data-action="toggle-player"][data-side="${side}"]:checked`;

    const selectedIds = Array.from(
      state.root.querySelectorAll(selector)
    ).map((checkbox) => String(checkbox.dataset.playerId));

    if (side === "1") {
      draft.setup.team1Players = selectedIds;
    } else if (side === "2") {
      draft.setup.team2Players = selectedIds;
    }

    draft.setup.strikerId = "";
    draft.setup.nonStrikerId = "";
    draft.setup.bowlerId = "";

    persistDraft();
    render();
    return;
  }

  // First innings batting and bowling teams.
  if (
    target.id === "mc-first-batting" ||
    target.id === "mc-first-bowling"
  ) {
    const battingSelect = $("#mc-first-batting", state.root);
    const bowlingSelect = $("#mc-first-bowling", state.root);

    draft.firstBattingTeamId = battingSelect?.value || "";
    draft.firstBowlingTeamId = bowlingSelect?.value || "";

    const battingId = String(draft.firstBattingTeamId);
    const bowlingId = String(draft.firstBowlingTeamId);

    if (battingId && battingId === bowlingId) {
      if (target.id === "mc-first-batting") {
        draft.firstBowlingTeamId = "";
        draft.setup.bowlerId = "";
      } else {
        draft.firstBattingTeamId = "";
        draft.setup.strikerId = "";
        draft.setup.nonStrikerId = "";
      }
    }

    const validBattingPlayers =
      String(draft.firstBattingTeamId) === String(draft.team1Id)
        ? draft.setup.team1Players
        : String(draft.firstBattingTeamId) === String(draft.team2Id)
          ? draft.setup.team2Players
          : [];

    const validBowlingPlayers =
      String(draft.firstBowlingTeamId) === String(draft.team1Id)
        ? draft.setup.team1Players
        : String(draft.firstBowlingTeamId) === String(draft.team2Id)
          ? draft.setup.team2Players
          : [];

    if (!validBattingPlayers.includes(String(draft.setup.strikerId))) {
      draft.setup.strikerId = "";
    }

    if (
      !validBattingPlayers.includes(String(draft.setup.nonStrikerId)) ||
      draft.setup.nonStrikerId === draft.setup.strikerId
    ) {
      draft.setup.nonStrikerId = "";
    }

    if (!validBowlingPlayers.includes(String(draft.setup.bowlerId))) {
      draft.setup.bowlerId = "";
    }

    persistDraft();
    render();
    return;
  }

  // Striker and non-striker.
  if (
    target.id === "mc-striker" ||
    target.id === "mc-non-striker"
  ) {
    const strikerSelect = $("#mc-striker", state.root);
    const nonStrikerSelect = $("#mc-non-striker", state.root);

    const strikerId = strikerSelect?.value || "";
    const nonStrikerId = nonStrikerSelect?.value || "";

    if (strikerId && strikerId === nonStrikerId) {
      notify("Striker ও Non-striker আলাদা খেলোয়াড় হতে হবে।");
      render();
      return;
    }

    draft.setup.strikerId = strikerId;
    draft.setup.nonStrikerId = nonStrikerId;

    persistDraft();
    render();
    return;
  }

  // Opening bowler selection.
  if (target.id === "mc-bowler") {
    draft.setup.bowlerId = target.value || "";
    persistDraft();
    return;
  }
}

  function findRoot() {
    const candidates = [
      "#matches",
      "#match",
      "#match-center",
      "#live-match",
      "#live-score",
      "#match-management",
      '[data-section="matches"]',
      '[data-page-content="matches"]'
    ];

    for (const selector of candidates) {
      const element = $(selector);
      if (element && !element.matches("a, button")) return element;
    }

    return null;
  }

  function refreshMatches() {
    const previousMatchId = state.selectedMatchId;

    readData();

    const stillExists = state.matches.some(
        match => idOf(match) === previousMatchId
    );

    if (stillExists) {
        state.selectedMatchId = previousMatchId;
    } else {
        state.selectedMatchId = state.matches.length
            ? idOf(state.matches[0])
            : "";
    }

    const selected = findMatch(state.selectedMatchId);

    if (selected) {
        loadDraft(selected);
    } else {
        state.draft = null;
    }

    render();
}

function handleMatchesUpdated() {
    const previousMatchId = state.selectedMatchId;

    readData();

    const stillExists = state.matches.some(
        match => idOf(match) === previousMatchId
    );

    if (!stillExists) {
        state.selectedMatchId = "";
        state.draft = null;
    } else {
        const selected = findMatch(previousMatchId);
        if (selected) loadDraft(selected);
    }

    render();
}

  function init() {
    readData();
    state.root = findRoot();

    if (!state.root) {
      console.warn(
        "MATCHCRAFT CRICKET: Add the match content section to index.html, e.g. <section id=\"matches\"></section>."
      );
      return;
    }

    state.root.addEventListener("click", handleClick);
    state.root.addEventListener("change", handleChange);

    document.addEventListener("matchcraft:datachange", () => {
  const previousMatchId = state.selectedMatchId;

  readData();

  const selected = findMatch(previousMatchId);

  if (selected) {
    state.selectedMatchId = previousMatchId;
    loadDraft(selected);
  } else if (state.matches.length) {
    state.selectedMatchId = idOf(state.matches[0]);
    loadDraft(findMatch(state.selectedMatchId));
  } else {
    state.selectedMatchId = "";
    state.draft = null;
  }

  render();
});

    window.addEventListener(
    "matchcraft:matches-updated",
    handleMatchesUpdated
);

window.addEventListener(
    "storage",
    handleMatchesUpdated
);

    if (state.matches.length) {
      state.selectedMatchId = idOf(state.matches[0]);
      loadDraft(findMatch(state.selectedMatchId));
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.MATCHCRAFT_MATCH = {
    refresh() {
        refreshMatches();
    }
};
})();