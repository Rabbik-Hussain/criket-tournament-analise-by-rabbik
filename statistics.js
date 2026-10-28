/* =========================================================
   MATCHCRAFT CRICKET
   File: statistics.js
   Statistics, Standings, Fixtures & Playoffs
   Storage: Existing LocalStorage
========================================================= */
(() => {
  "use strict";

  const STORAGE = {
    tournaments: [
      "matchcraft_cricket_tournaments",
      "matchcraft_tournaments"
    ],
    teams: [
      "matchcraft_cricket_teams",
      "matchcraft_teams"
    ],
    players: [
      "matchcraft_cricket_players",
      "matchcraft_players"
    ],
    matches: [
      "matchcraft_cricket_matches",
      "matchcraft_cricket_fixtures",
      "matchcraft_cricket_matches_fixtures",
      "matchcraft_matches",
      "matchcraft_fixtures",
      "matchcraft_scheduled_matches"
    ]
  };

  const state = {
    tournamentId: "all",
    tab: "overview",
    search: ""
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const num = value =>
    Number.isFinite(Number(value)) ? Number(value) : 0;

  function first(object, keys, fallback = "") {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return fallback;
  }

  function arrayFrom(value) {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
      for (const key of [
        "items", "data", "list", "records", "results",
        "teams", "players", "matches", "fixtures", "tournaments"
      ]) {
        if (Array.isArray(value[key])) return value[key];
      }

      return Object.values(value).filter(
        item => item && typeof item === "object" && !Array.isArray(item)
      );
    }

    return [];
  }

  function parseStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const list = arrayFrom(parsed);

      if (Array.isArray(parsed) || list.length) return list;
    } catch (error) {
      console.warn("MATCHCRAFT: Unable to read storage:", key, error);
    }

    return null;
  }

  function readStorage(keys) {
    for (const key of keys) {
      const list = parseStorage(key);
      if (list !== null) return list;
    }
    return [];
  }

  function matchStorageKey() {
    for (const key of STORAGE.matches) {
      if (parseStorage(key) !== null) return key;
    }
    return STORAGE.matches[0];
  }

  function readAll() {
    return {
      tournaments: readStorage(STORAGE.tournaments),
      teams: readStorage(STORAGE.teams),
      players: readStorage(STORAGE.players),
      matches: readStorage(STORAGE.matches)
    };
  }

  const idOf = item => String(first(item, [
    "id", "tournamentId", "teamId", "playerId",
    "matchId", "fixtureId", "key"
  ], ""));

  const nameOf = item => String(first(item, [
    "name", "teamName", "playerName",
    "title", "fullName", "clubName"
  ], "Unknown"));

  const tournamentIdOf = item => {
    const value = first(item, [
      "tournamentId", "tournament_id", "competitionId", "tournament"
    ], "");

    if (value && typeof value === "object") {
      return String(first(value, ["id", "tournamentId"], ""));
    }

    return String(value);
  };

  const statusOf = match => String(first(match, [
    "status", "matchStatus", "state", "resultStatus"
  ], "")).toLowerCase();

  function isComplete(match) {
    const status = statusOf(match);

    return [
      "completed", "complete", "finished", "full time",
      "full-time", "ft", "result", "ended", "সমাপ্ত", "শেষ"
    ].some(value => status.includes(value)) ||
      match?.completed === true ||
      match?.isCompleted === true ||
      match?.result?.winnerId != null;
  }

  function isLive(match) {
    const status = statusOf(match);

    return [
      "live", "in progress", "playing", "ongoing", "চলছে"
    ].some(value => status.includes(value)) ||
      match?.isLive === true;
  }

  const tournamentLabel = tournament => String(first(tournament, [
    "name", "tournamentName", "title"
  ], "Untitled Tournament"));

  function formatName(tournament) {
    const format = String(first(tournament, [
      "tournamentFormat", "format",
      "competitionFormat", "type"
    ], "league")).toLowerCase();

    if (format.includes("group")) return "Group + Knockout";
    if (format.includes("knock")) return "Knockout";

    return "League";
  }

  function scoreText(score) {
    if (score == null) return "—";

    if (typeof score === "string" || typeof score === "number") {
      return String(score);
    }

    const runs = first(score, ["runs", "score", "total", "points"], "");
    const wickets = first(score, ["wickets", "outs"], "");
    const overs = first(score, ["overs", "over"], "");

    if (runs === "" && wickets === "" && overs === "") return "—";

    return `${runs === "" ? 0 : runs}` +
      `${wickets !== "" ? "/" + wickets : ""}` +
      `${overs !== "" ? " (" + overs + " ov)" : ""}`;
  }

  function matchTeamId(match, side) {
    return String(first(match, side === "a"
      ? [
          "team1Id", "homeTeamId", "teamAId",
          "team1_id", "firstTeamId"
        ]
      : [
          "team2Id", "awayTeamId", "teamBId",
          "team2_id", "secondTeamId"
        ], ""));
  }

  function matchTeamName(match, side, teams) {
    const id = matchTeamId(match, side);

    const nested = first(match, side === "a"
      ? ["team1", "homeTeam", "teamA", "firstTeam"]
      : ["team2", "awayTeam", "teamB", "secondTeam"], null);

    const direct = first(match, side === "a"
      ? ["team1Name", "homeTeamName", "teamAName", "firstTeamName"]
      : ["team2Name", "awayTeamName", "teamBName", "secondTeamName"], "");

    if (direct) return String(direct);

    if (nested && typeof nested === "object") return nameOf(nested);
    if (typeof nested === "string") return nested;

    const team = teams.find(item => idOf(item) === id);

    return team ? nameOf(team) : (side === "a" ? "Team A" : "Team B");
  }

  function winnerId(match) {
    const result = match?.result && typeof match.result === "object"
      ? match.result
      : {};

    const value = first(match, [
      "winnerId", "winnerTeamId", "winningTeamId"
    ], first(result, ["winnerId", "teamId", "winnerTeamId"], ""));

    if (value && typeof value === "object") {
      return String(first(value, ["id", "teamId"], ""));
    }

    return String(value ?? "");
  }

  function winnerName(match, teams) {
    const direct = first(match, [
      "winnerName", "winningTeam", "winner"
    ], first(match?.result, ["winnerName", "winner"], ""));

    if (direct && typeof direct === "object") return nameOf(direct);
    if (direct) return String(direct);

    const id = winnerId(match);

    if (id) {
      const team = teams.find(item => idOf(item) === id);
      if (team) return nameOf(team);

      if (id === matchTeamId(match, "a")) {
        return matchTeamName(match, "a", teams);
      }

      if (id === matchTeamId(match, "b")) {
        return matchTeamName(match, "b", teams);
      }
    }

    const resultText = String(first(match, [
      "resultText", "resultSummary", "outcome"
    ], "")).toLowerCase();

    return [
      matchTeamName(match, "a", teams),
      matchTeamName(match, "b", teams)
    ].find(name =>
      name !== "Team A" &&
      name !== "Team B" &&
      resultText.includes(name.toLowerCase())
    ) || "";
  }

  function inningsTotal(match, side) {
    const keys = side === "a"
      ? [
          "team1Score", "homeScore", "score1",
          "teamAScore", "firstTeamScore", "scoreA"
        ]
      : [
          "team2Score", "awayScore", "score2",
          "teamBScore", "secondTeamScore", "scoreB"
        ];

    let value = first(match, keys, null);

    if (value == null) {
      const nested = first(match, side === "a"
        ? ["team1", "homeTeam", "teamA", "firstTeam"]
        : ["team2", "awayTeam", "teamB", "secondTeam"], null);

      value = nested && typeof nested === "object"
        ? first(nested, ["score", "runs", "total", "result"], null)
        : null;
    }

    if (value == null) {
      const innings = arrayFrom(first(match, [
        "innings", "scorecard", "scores"
      ], []));

      const teamId = matchTeamId(match, side);

      const inning = innings.find(item => !teamId ||
        String(first(item, [
          "teamId", "battingTeamId", "team_id"
        ], "")) === teamId
      );

      if (inning) value = inning;
    }

    if (value == null) return null;

    if (typeof value === "object") {
      return {
        runs: num(first(value, ["runs", "score", "total"], 0)),
        wickets: num(first(value, ["wickets", "outs"], 0)),
        overs: first(value, ["overs", "over"], "")
      };
    }

    const matchScore = String(value).match(
      /(\d+)\s*(?:\/\s*(\d+))?(?:\s*\(([\d.]+)\s*ov\))?/i
    );

    return matchScore
      ? {
          runs: num(matchScore[1]),
          wickets: num(matchScore[2]),
          overs: matchScore[3] || ""
        }
      : { runs: num(value), wickets: 0, overs: "" };
  }

  function selectedData() {
    const data = readAll();

    const selected = state.tournamentId === "all"
      ? null
      : data.tournaments.find(
          tournament => idOf(tournament) === state.tournamentId
        );

    const tournamentId = selected ? idOf(selected) : "";

    const scoped = list => list.filter(item => {
      const itemTournamentId = tournamentIdOf(item);

      return !selected ||
        !itemTournamentId ||
        itemTournamentId === tournamentId;
    });

    return {
      ...data,
      selected,
      teams: scoped(data.teams),
      players: scoped(data.players),
      matches: scoped(data.matches)
    };
  }

  /* ==================== STANDINGS ==================== */

  function buildStandings(data, onlyGroup = "") {
    const rows = data.teams.map(team => ({
      id: idOf(team),
      name: nameOf(team),
      group: String(first(team, [
        "group", "groupName", "groupLabel"
      ], "")),
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsFor: 0,
      runsAgainst: 0,
      oversFor: 0,
      oversAgainst: 0,
      nrr: 0
    }));

    const findRow = (id, name) => rows.find(row =>
      (id && row.id === id) ||
      (name && row.name.toLowerCase() === name.toLowerCase())
    );

    for (const match of data.matches.filter(isComplete)) {
      const aName = matchTeamName(match, "a", data.teams);
      const bName = matchTeamName(match, "b", data.teams);

      const a = findRow(matchTeamId(match, "a"), aName);
      const b = findRow(matchTeamId(match, "b"), bName);

      if (!a || !b || a.id === b.id) continue;

      if (onlyGroup && a.group !== onlyGroup && b.group !== onlyGroup) {
        continue;
      }

      a.played++;
      b.played++;

      const win = winnerName(match, data.teams);

      if (!win) {
        a.tied++;
        b.tied++;
        a.points++;
        b.points++;
      } else if (win.toLowerCase() === a.name.toLowerCase()) {
        a.won++;
        b.lost++;
        a.points += 2;
      } else if (win.toLowerCase() === b.name.toLowerCase()) {
        b.won++;
        a.lost++;
        b.points += 2;
      } else {
        a.noResult++;
        b.noResult++;
      }

      const scoreA = inningsTotal(match, "a");
      const scoreB = inningsTotal(match, "b");

      if (scoreA && scoreB) {
        a.runsFor += num(scoreA.runs);
        a.runsAgainst += num(scoreB.runs);
        b.runsFor += num(scoreB.runs);
        b.runsAgainst += num(scoreA.runs);

        a.oversFor += num(scoreA.overs);
        a.oversAgainst += num(scoreB.overs);
        b.oversFor += num(scoreB.overs);
        b.oversAgainst += num(scoreA.overs);
      }
    }

    rows.forEach(row => {
      row.nrr = row.oversFor && row.oversAgainst
        ? (row.runsFor / row.oversFor) -
          (row.runsAgainst / row.oversAgainst)
        : 0;
    });

    return rows
      .filter(row => !onlyGroup || row.group === onlyGroup)
      .sort((a, b) =>
        b.points - a.points ||
        b.nrr - a.nrr ||
        b.won - a.won
      );
  }

  /* ==================== PLAYER STATISTICS ==================== */

  function getPlayerStats(data) {
    const stats = new Map();

    const ensure = (id, name, teamName = "") => {
      const key = String(id || name || "unknown");

      if (!stats.has(key)) {
        stats.set(key, {
          id: key,
          name: name || "Unknown",
          teamName,
          matches: 0,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          overs: 0
        });
      }

      return stats.get(key);
    };

    data.players.forEach(player => {
      ensure(
        idOf(player),
        nameOf(player),
        String(first(player, ["teamName", "team"], ""))
      );
    });

    data.matches.forEach(match => {
      arrayFrom(first(match, [
        "events", "matchEvents", "scoreEvents"
      ], [])).forEach(event => {
        const player = ensure(
          first(event, ["playerId", "batterId", "bowlerId"], ""),
          String(first(event, [
            "playerName", "batterName", "bowlerName"
          ], ""))
        );

        const type = String(first(event, [
          "type", "eventType", "kind"
        ], "")).toLowerCase();

        const runs = num(first(event, ["runs", "run", "value"], 0));

        if (type.includes("four")) player.fours++;
        if (type.includes("six")) player.sixes++;
        if (type.includes("wicket")) player.wickets++;

        if (
          type.includes("run") ||
          type.includes("four") ||
          type.includes("six")
        ) {
          player.runs += runs;
        }
      });

      arrayFrom(first(match, [
        "batting", "battingScorecard", "playerStats"
      ], [])).forEach(scorecard => {
        const player = ensure(
          first(scorecard, ["playerId", "id"], ""),
          String(first(scorecard, ["playerName", "name"], "Unknown")),
          String(first(scorecard, ["teamName"], ""))
        );

        player.runs = Math.max(
          player.runs,
          num(first(scorecard, ["runs", "totalRuns"], 0))
        );

        player.balls = Math.max(
          player.balls,
          num(first(scorecard, ["balls", "ballsFaced"], 0))
        );

        player.fours = Math.max(
          player.fours,
          num(first(scorecard, ["fours", "4s"], 0))
        );

        player.sixes = Math.max(
          player.sixes,
          num(first(scorecard, ["sixes", "6s"], 0))
        );

        player.wickets = Math.max(
          player.wickets,
          num(first(scorecard, ["wickets", "wicketCount"], 0))
        );
      });
    });

    return [...stats.values()]
      .map(player => ({
        ...player,
        average: player.wickets
          ? player.runs / player.wickets
          : player.runs,
        strikeRate: player.balls
          ? player.runs * 100 / player.balls
          : 0,
        economy: player.overs
          ? player.runsConceded / player.overs
          : 0
      }))
      .sort((a, b) => b.runs - a.runs);
  }

  /* ==================== FIXTURE GENERATION ==================== */

  function makeId() {
    return "mc_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function fixtureExists(matches, tournamentId, teamA, teamB, round) {
    return matches.some(match =>
      tournamentIdOf(match) === tournamentId &&
      String(first(match, ["round", "stage", "roundName"], "")) === round &&
      (
        (
          matchTeamId(match, "a") === teamA &&
          matchTeamId(match, "b") === teamB
        ) ||
        (
          matchTeamId(match, "a") === teamB &&
          matchTeamId(match, "b") === teamA
        )
      )
    );
  }

  function createFixture(tournament, teamA, teamB, round, number) {
    const tournamentId = idOf(tournament);

    return {
      id: makeId(),
      matchId: "",
      fixtureId: "",
      tournamentId,
      tournamentName: tournamentLabel(tournament),

      team1Id: idOf(teamA),
      team2Id: idOf(teamB),
      team1Name: nameOf(teamA),
      team2Name: nameOf(teamB),

      round,
      stage: round,
      matchType: round,
      matchNumber: number,

      status: "Scheduled",
      completed: false,
      isLive: false,

      date: "",
      matchDate: "",
      createdAt: new Date().toISOString(),

      source: "MATCHCRAFT_STATISTICS",
      generatedFixture: true
    };
  }

  function saveMatches(matches) {
    try {
      const key = matchStorageKey();
      localStorage.setItem(key, JSON.stringify(matches));
      return true;
    } catch (error) {
      console.error("MATCHCRAFT: Could not save fixtures.", error);
      alert(
        "ফিক্সচার সংরক্ষণ করা যায়নি। ব্রাউজারের LocalStorage পরীক্ষা করুন।"
      );
      return false;
    }
  }

  function generateLeagueFixtures(data) {
    const tournament = data.selected;
    const tournamentId = idOf(tournament);

    if (!tournamentId) {
      alert("এই টুর্নামেন্টের ID পাওয়া যায়নি।");
      return;
    }

    if (data.teams.length < 2) {
      alert("ফিক্সচার তৈরির জন্য অন্তত ২টি দল প্রয়োজন।");
      return;
    }

    const matches = readStorage(STORAGE.matches);
    let added = 0;
    let number = matches.length + 1;

    for (let i = 0; i < data.teams.length; i++) {
      for (let j = i + 1; j < data.teams.length; j++) {
        const teamA = data.teams[i];
        const teamB = data.teams[j];

        if (fixtureExists(
          matches, tournamentId, idOf(teamA), idOf(teamB), "League"
        )) {
          continue;
        }

        matches.push(
          createFixture(tournament, teamA, teamB, "League", number++)
        );
        added++;
      }
    }

    if (!added) {
      alert("এই টুর্নামেন্টের League ফিক্সচার আগে থেকেই তৈরি আছে।");
      return;
    }

    if (saveMatches(matches)) {
      alert(`${added}টি নতুন League ফিক্সচার তৈরি ও সংরক্ষণ হয়েছে।`);
      render();
    }
  }

  function generateGroupFixtures(data) {
    const tournament = data.selected;
    const tournamentId = idOf(tournament);

    if (!tournamentId) {
      alert("এই টুর্নামেন্টের ID পাওয়া যায়নি।");
      return;
    }

    if (data.teams.length < 2) {
      alert("গ্রুপ ফিক্সচার তৈরির জন্য অন্তত ২টি দল প্রয়োজন।");
      return;
    }

    let groups = [...new Set(data.teams.map(team =>
      String(first(team, ["group", "groupName", "groupLabel"], "")).trim()
    ).filter(Boolean))];

    if (!groups.length) {
      const answer = prompt(
        "কতটি গ্রুপ তৈরি করতে চান? (যেমন: 2)",
        "2"
      );

      if (answer === null) return;

      const groupCount = Math.floor(Number(answer));

      if (
        !Number.isFinite(groupCount) ||
        groupCount < 2 ||
        groupCount > data.teams.length
      ) {
        alert("গ্রুপের সংখ্যা সঠিকভাবে দিন।");
        return;
      }

      groups = Array.from(
        { length: groupCount },
        (_, index) => `Group ${String.fromCharCode(65 + index)}`
      );

      /*
       * Group assignment is used for generated fixtures only.
       * Existing team records are not modified.
       */
    }

    const groupedTeams = new Map(groups.map(group => [group, []]));

    data.teams.forEach((team, index) => {
      let group = String(first(
        team, ["group", "groupName", "groupLabel"], ""
      )).trim();

      if (!group) {
        group = groups[index % groups.length];
      }

      if (!groupedTeams.has(group)) {
        groupedTeams.set(group, []);
      }

      groupedTeams.get(group).push(team);
    });

    const matches = readStorage(STORAGE.matches);
    let added = 0;
    let number = matches.length + 1;

    for (const [group, teams] of groupedTeams) {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const teamA = teams[i];
          const teamB = teams[j];
          const round = `Group Stage - ${group}`;

          if (fixtureExists(
            matches,
            tournamentId,
            idOf(teamA),
            idOf(teamB),
            round
          )) {
            continue;
          }

          const fixture = createFixture(
            tournament, teamA, teamB, round, number++
          );

          fixture.group = group;
          fixture.groupName = group;

          matches.push(fixture);
          added++;
        }
      }
    }

    if (!added) {
      alert("এই টুর্নামেন্টের Group Stage ফিক্সচার আগে থেকেই আছে।");
      return;
    }

    if (saveMatches(matches)) {
      alert(`${added}টি Group Stage ফিক্সচার তৈরি ও সংরক্ষণ হয়েছে।`);
      render();
    }
  }

  function generateKnockoutFixtures(data) {
    const tournament = data.selected;
    const tournamentId = idOf(tournament);

    if (!tournamentId) {
      alert("এই টুর্নামেন্টের ID পাওয়া যায়নি।");
      return;
    }

    if (data.teams.length < 2) {
      alert("Knockout ফিক্সচারের জন্য অন্তত ২টি দল প্রয়োজন।");
      return;
    }

    const matches = readStorage(STORAGE.matches);
    const round = "Knockout Round 1";
    let added = 0;
    let number = matches.length + 1;

    for (let i = 0; i < data.teams.length; i += 2) {
      const teamA = data.teams[i];
      const teamB = data.teams[i + 1];

      if (!teamB) {
        /*
         * A bye requires explicit progression handling.
         * This team is not assigned a fabricated opponent.
         */
        continue;
      }

      if (fixtureExists(
        matches, tournamentId, idOf(teamA), idOf(teamB), round
      )) {
        continue;
      }

      matches.push(
        createFixture(tournament, teamA, teamB, round, number++)
      );
      added++;
    }

    if (!added) {
      alert("Knockout Round 1 ফিক্সচার আগে থেকেই আছে।");
      return;
    }

    if (saveMatches(matches)) {
      alert(`${added}টি Knockout ফিক্সচার তৈরি ও সংরক্ষণ হয়েছে।`);
      render();
    }
  }

  function generateFixtures() {
    const data = selectedData();

    if (!data.selected) {
      alert("আগে একটি নির্দিষ্ট Tournament নির্বাচন করুন।");
      return;
    }

    const format = formatName(data.selected);

    if (format === "League") {
      generateLeagueFixtures(data);
    } else if (format === "Group + Knockout") {
      generateGroupFixtures(data);
    } else {
      generateKnockoutFixtures(data);
    }
  }

  /*
   * This action reports current playoff status.
   * It deliberately does not invent winners or alter completed matches.
   * Winner-to-next-round progression will be connected to match.js.
   */
  function updatePlayoffs() {
    const data = selectedData();

    if (!data.selected) {
      alert("আগে একটি নির্দিষ্ট Tournament নির্বাচন করুন।");
      return;
    }

    const completed = data.matches.filter(isComplete).length;
    const pending = data.matches.filter(match => !isComplete(match)).length;

    alert(
      `Playoffs Status\n\n` +
      `Tournament: ${tournamentLabel(data.selected)}\n` +
      `Completed matches: ${completed}\n` +
      `Pending matches: ${pending}\n\n` +
      `পরবর্তী রাউন্ডে বিজয়ী পাঠানোর নিয়ম match.js-এর সঙ্গে যুক্ত করতে হবে।`
    );

    render();
  }

  /* ==================== MAIN RENDER ==================== */

  function render() {
   const root = document.getElementById("standings");

    if (!root) return;

    const data = selectedData();
    const completed = data.matches.filter(isComplete).length;
    const live = data.matches.filter(isLive).length;
    const standings = buildStandings(data);
    const playerStats = getPlayerStats(data);
    const topScorer = playerStats[0];

    const tabs = [
      ["overview", "Overview"],
      ["standings", "Standings"],
      ["playoffs", "Playoffs"],
      ["players", "Player Stats"],
      ["matches", "Match Results"],
      ["awards", "Awards & Report"]
    ];

    root.innerHTML = `
      <section class="mc-status-app">
        <header class="mc-status-hero">
          <div>
            <span class="mc-eyebrow">CRICKET TOURNAMENT CENTER</span>
            <h1>Standings &amp; Statistics</h1>
            <p>টুর্নামেন্টের পয়েন্ট টেবিল, ম্যাচের ফলাফল ও খেলোয়াড়ের পারফরম্যান্স এক জায়গায়।</p>
          </div>
          <div class="mc-status-actions">
            <button class="mc-btn mc-btn-primary" data-action="print">
              Print Report
            </button>
            <button class="mc-btn" data-action="refresh">
              Refresh Data
            </button>
          </div>
        </header>

        <section class="mc-status-toolbar">
          <label class="mc-filter-label">
            Select Tournament
            <select id="mcTournamentSelect">
              <option value="all">All Tournaments</option>
              ${data.tournaments.map(tournament => `
                <option value="${esc(idOf(tournament))}"
                  ${state.tournamentId === idOf(tournament) ? "selected" : ""}>
                  ${esc(tournamentLabel(tournament))}
                </option>
              `).join("")}
            </select>
          </label>

          <div class="mc-current-tournament">
            <span class="mc-chip">
              ${esc(data.selected ? formatName(data.selected) : "All Formats")}
            </span>
            <span>
              ${esc(data.selected
                ? tournamentLabel(data.selected)
                : "All tournaments overview")}
            </span>
          </div>
        </section>

        <section class="mc-status-stat-grid">
          ${statCard("🏏", "Total Matches", data.matches.length, "All scheduled matches")}
          ${statCard("✅", "Completed", completed, "Saved results")}
          ${statCard("🔴", "Live Matches", live, "Currently in progress")}
          ${statCard("🛡️", "Teams", data.teams.length, "Tournament teams")}
          ${statCard("👤", "Players", data.players.length, "Registered players")}
          ${statCard("⭐", "Top Run Scorer", topScorer?.name || "—", `${topScorer?.runs || 0} runs`)}
        </section>

        <nav class="mc-status-tabs" aria-label="Statistics sections">
          ${tabs.map(([id, label]) => `
            <button type="button" data-tab="${id}"
              class="${state.tab === id ? "is-active" : ""}">
              ${label}
            </button>
          `).join("")}
        </nav>

        <div class="mc-status-content">
          ${renderTab(state.tab, data, standings, playerStats)}
        </div>

        <footer class="mc-status-footer">
          <span>Cricket Statistics</span>
          <span>Data from this browser's LocalStorage</span>
        </footer>
      </section>
    `;

    bind(root);
  }

  function statCard(icon, label, value, note) {
    return `
      <article class="mc-stat-card">
        <span class="mc-stat-icon">${icon}</span>
        <div>
          <small class="mc-stat-label">${esc(label)}</small>
          <strong>${esc(value)}</strong>
          <small>${esc(note)}</small>
        </div>
      </article>
    `;
  }

  function bind(root) {
    $("#mcTournamentSelect", root)?.addEventListener("change", event => {
      state.tournamentId = event.target.value;
      render();
    });

    root.querySelectorAll("[data-tab]").forEach(button => {
      button.addEventListener("click", () => {
        state.tab = button.dataset.tab;
        render();
      });
    });

    root.querySelectorAll('[data-action="print"]').forEach(button => {
      button.addEventListener("click", () => window.print());
    });

    root.querySelectorAll('[data-action="refresh"]').forEach(button => {
      button.addEventListener("click", render);
    });

    root.querySelectorAll('[data-action="generate-fixtures"]').forEach(button => {
      button.addEventListener("click", generateFixtures);
    });

    root.querySelectorAll('[data-action="update-playoffs"]').forEach(button => {
      button.addEventListener("click", updatePlayoffs);
    });

    $("#mcPlayerSearch", root)?.addEventListener("input", event => {
      state.search = event.target.value;

      const data = selectedData();
      const stats = getPlayerStats(data);
      const content = $(".mc-status-content", root);

      if (content) {
        content.innerHTML = renderPlayers(stats);
        bind(root);
      }
    });
  }

  function renderTab(tab, data, standings, players) {
    if (tab === "standings") return renderStandings(standings, data);
    if (tab === "playoffs") return renderPlayoffs(data, standings);
    if (tab === "players") return renderPlayers(players);
    if (tab === "matches") return renderMatches(data);
    if (tab === "awards") return renderAwards(data, standings, players);

    return renderOverview(data, standings);
  }

  /* ==================== OVERVIEW ==================== */

  function renderOverview(data, standings) {
    const upcoming = data.matches
      .filter(match => !isComplete(match))
      .slice(0, 5);

    return `
      <div class="mc-overview-grid">
        <article class="mc-panel">
          <div class="mc-panel-heading">
            <h2>🏆 Tournament Summary</h2>
            <span class="mc-chip">
              ${esc(data.selected ? formatName(data.selected) : "Overview")}
            </span>
          </div>

          <div class="mc-summary-list">
            <div><span>Tournament</span><strong>${esc(data.selected ? tournamentLabel(data.selected) : "All Tournaments")}</strong></div>
            <div><span>Teams registered</span><strong>${data.teams.length}</strong></div>
            <div><span>Matches completed</span><strong>${data.matches.filter(isComplete).length}</strong></div>
            <div><span>Matches remaining</span><strong>${data.matches.filter(match => !isComplete(match)).length}</strong></div>
          </div>
        </article>

        <article class="mc-panel">
          <div class="mc-panel-heading">
            <h2>📅 Upcoming Matches</h2>
            <span class="mc-chip">${upcoming.length} shown</span>
          </div>
          ${renderMatchTable(upcoming, data.teams)}
        </article>

        <article class="mc-panel mc-table-panel">
          <div class="mc-panel-heading">
            <h2>📊 Current Standings</h2>
          </div>
          ${renderStandingsTable(standings.slice(0, 5))}
        </article>
      </div>
    `;
  }

  /* ==================== STANDINGS UI ==================== */

  function renderStandings(rows, data) {
    const groups = [
      ...new Set(rows.map(row => row.group).filter(Boolean))
    ];

    if (groups.length > 1) {
      return `
        <div class="mc-section-heading">
          <div>
            <span class="mc-eyebrow">LEAGUE TABLE</span>
            <h2>Group Standings</h2>
            <p>গ্রুপ অনুযায়ী পয়েন্ট, জয়, হার এবং Net Run Rate দেখানো হচ্ছে।</p>
          </div>
        </div>

        <div class="mc-qualifier-grid">
          ${groups.map(group => `
            <article class="mc-panel mc-table-panel">
              <div class="mc-panel-heading"><h3>${esc(group)}</h3></div>
              ${renderStandingsTable(rows.filter(row => row.group === group))}
            </article>
          `).join("")}
        </div>
      `;
    }

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">LEAGUE TABLE</span>
          <h2>Points Table</h2>
          <p>সংরক্ষিত ম্যাচের ফলাফল থেকে পয়েন্ট হিসাব করা হয়। NRR-এর জন্য সঠিক স্কোর ও ওভার প্রয়োজন।</p>
        </div>
      </div>

      <article class="mc-panel mc-table-panel">
        ${renderStandingsTable(rows)}
      </article>
    `;
  }

  function renderStandingsTable(rows) {
    if (!rows.length) {
      return empty(
        "No standings yet",
        "টুর্নামেন্টে দল যোগ করুন এবং ম্যাচের ফলাফল সংরক্ষণ করুন।"
      );
    }

    return `
      <div class="mc-table-wrap">
        <table class="mc-data-table">
          <thead>
            <tr>
              <th>#</th><th>Team</th><th>Mat</th><th>W</th>
              <th>L</th><th>T/NR</th><th>Pts</th><th>NRR</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td>
                  <span class="mc-rank ${index < 2 ? "mc-rank-top" : ""}">
                    ${index + 1}
                  </span>
                </td>
                <td>
                  <strong>${esc(row.name)}</strong>
                  ${row.group ? `<small class="mc-cell-sub">${esc(row.group)}</small>` : ""}
                </td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.lost}</td>
                <td>${row.tied + row.noResult}</td>
                <td><strong>${row.points}</strong></td>
                <td class="${row.nrr >= 0 ? "mc-positive" : "mc-negative"}">
                  ${row.nrr.toFixed(3)}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ==================== PLAYOFFS UI ==================== */

  function renderPlayoffs(data, standings) {
    const format = data.selected
      ? formatName(data.selected)
      : "League";

    const controls = `
      <div class="mc-status-actions">
        <button type="button" class="mc-btn mc-btn-primary"
          data-action="generate-fixtures">
          Generate Fixtures
        </button>
        <button type="button" class="mc-btn"
          data-action="update-playoffs">
          Update Playoffs
        </button>
      </div>
    `;

    if (!data.selected) {
      return `
        <div class="mc-section-heading">
          <div>
            <span class="mc-eyebrow">PLAYOFFS</span>
            <h2>Standing &amp; Playoffs</h2>
            <p>ফিক্সচার তৈরি করতে একটি নির্দিষ্ট টুর্নামেন্ট নির্বাচন করুন।</p>
          </div>
        </div>
        ${empty("Select a tournament", "উপরের Tournament তালিকা থেকে একটি টুর্নামেন্ট বেছে নিন।")}
      `;
    }

    if (format === "League") {
      const top = standings.slice(0, 2);

      return `
        <div class="mc-section-heading">
          <div>
            <span class="mc-eyebrow">LEAGUE PLAYOFFS</span>
            <h2>League Final</h2>
            <p>পয়েন্ট টেবিলের শীর্ষ দুই দল সম্ভাব্য ফাইনালিস্ট হিসেবে দেখানো হচ্ছে।</p>
          </div>
          ${controls}
        </div>
        ${top.length >= 2
          ? renderFinalCard(data, top[0], top[1])
          : empty("Finalists not ready", "ফাইনালিস্ট দেখাতে অন্তত দুটি দলের তথ্য প্রয়োজন।")}
        ${renderBracket(data)}
      `;
    }

    if (format === "Group + Knockout") {
      const groups = [
        ...new Set(data.teams.map(team => String(first(team, [
          "group", "groupName", "groupLabel"
        ], "")).trim()).filter(Boolean))
      ];

      return `
        <div class="mc-section-heading">
          <div>
            <span class="mc-eyebrow">QUALIFICATION</span>
            <h2>Group Stage &amp; Knockout</h2>
            <p>প্রতিটি গ্রুপের পয়েন্ট টেবিল থেকে সম্ভাব্য কোয়ালিফায়ার দেখানো হবে।</p>
          </div>
          ${controls}
        </div>

        ${groups.length ? `
          <div class="mc-qualifier-grid">
            ${groups.map(group => {
              const top = buildStandings(data, group).slice(0, 2);

              return `
                <article class="mc-panel">
                  <div class="mc-panel-heading">
                    <h3>${esc(group)}</h3>
                    <span class="mc-chip">Qualifiers</span>
                  </div>
                  ${top.length ? top.map((row, index) => `
                    <div class="mc-qualifier-row">
                      <span>${index + 1}</span>
                      <strong>${esc(row.name)}</strong>
                      <small>${row.points} pts</small>
                    </div>
                  `).join("") : empty(
                    "No completed standings",
                    "এই গ্রুপে দল ও ম্যাচের ফলাফল প্রয়োজন।"
                  )}
                </article>
              `;
            }).join("")}
          </div>
        ` : empty(
          "Group assignments not found",
          "Team setup-এ গ্রুপ নির্ধারণ করুন অথবা Generate Fixtures ব্যবহার করুন।"
        )}

        ${renderBracket(data)}
      `;
    }

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">ELIMINATION STAGE</span>
          <h2>Knockout Bracket</h2>
          <p>সংরক্ষিত নকআউট ম্যাচ ও বিজয়ীদের তথ্য এখানে দেখা যাবে।</p>
        </div>
        ${controls}
      </div>
      ${renderBracket(data)}
    `;
  }

  function renderFinalCard(data, teamA, teamB) {
    const final = data.matches.find(match =>
      /final/i.test(String(first(match, [
        "round", "stage", "matchType", "roundName"
      ], "")))
    );

    const champion = final ? winnerName(final, data.teams) : "";

    return `
      <article class="mc-panel mc-final-card">
        <div class="mc-final-badge">🏆 CHAMPIONSHIP FINAL</div>

        <div class="mc-final-teams">
          <div><span>FINALIST 1</span><strong>${esc(teamA.name)}</strong></div>
          <b>VS</b>
          <div><span>FINALIST 2</span><strong>${esc(teamB.name)}</strong></div>
        </div>

        ${final ? `
          <div class="mc-final-result">
            ${esc(scoreText(inningsTotal(final, "a")))}
            —
            ${esc(scoreText(inningsTotal(final, "b")))}
            <p>${champion
              ? `🏆 Champion: ${esc(champion)}`
              : "Final result pending"}
            </p>
          </div>
        ` : `
          <p class="mc-muted">
            ফাইনাল ম্যাচ এখনো Match &amp; Live-এ সংরক্ষিত হয়নি।
          </p>
        `}
      </article>
    `;
  }

  function renderBracket(data) {
    const matches = data.matches.filter(match =>
      /semi|quarter|final|knockout|eliminator|qualifier|play.?off/i.test(
        String(first(match, [
          "round", "stage", "matchType", "roundName", "phase"
        ], ""))
      )
    );

    if (!matches.length) {
      return empty(
        "No knockout matches found",
        "Knockout ম্যাচ তৈরি হলে সেগুলো এখানে দেখানো হবে।"
      );
    }

    return `
      <div class="mc-bracket-grid">
        ${matches.map(match => {
          const teamA = matchTeamName(match, "a", data.teams);
          const teamB = matchTeamName(match, "b", data.teams);
          const winner = winnerName(match, data.teams);

          return `
            <article class="mc-bracket-match">
              <div class="mc-bracket-round">
                ${esc(first(match, [
                  "round", "stage", "matchType", "roundName"
                ], "Knockout Match"))}
              </div>

              <div class="mc-bracket-team ${winner === teamA ? "is-winner" : ""}">
                <span>${esc(teamA)}</span>
                <b>${esc(scoreText(inningsTotal(match, "a")))}</b>
              </div>

              <div class="mc-bracket-team ${winner === teamB ? "is-winner" : ""}">
                <span>${esc(teamB)}</span>
                <b>${esc(scoreText(inningsTotal(match, "b")))}</b>
              </div>

              <footer>
                ${isComplete(match)
                  ? (winner ? `Winner: ${esc(winner)}` : "Completed · winner not set")
                  : "Upcoming / In progress"}
              </footer>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ==================== PLAYER STATS UI ==================== */

  function renderPlayers(players) {
    const query = state.search.toLowerCase().trim();

    const filtered = players.filter(player =>
      `${player.name} ${player.teamName}`.toLowerCase().includes(query)
    );

    const topRuns = players.slice().sort((a, b) => b.runs - a.runs);
    const topWickets = players.slice().sort((a, b) => b.wickets - a.wickets);

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">PLAYER PERFORMANCE</span>
          <h2>Player Statistics</h2>
          <p>সংরক্ষিত স্কোরকার্ড ও ম্যাচ ইভেন্ট থেকে তথ্য দেখানো হয়।</p>
        </div>
      </div>

      <div class="mc-player-leaders">
        <article class="mc-panel">
          <span>🏏 TOP RUN SCORER</span>
          <strong>${esc(topRuns[0]?.name || "—")}</strong>
          <b>${topRuns[0]?.runs || 0} runs</b>
        </article>

        <article class="mc-panel">
          <span>🎯 TOP WICKET TAKER</span>
          <strong>${esc(topWickets[0]?.name || "—")}</strong>
          <b>${topWickets[0]?.wickets || 0} wickets</b>
        </article>
      </div>

      <article class="mc-panel mc-table-panel">
        <div class="mc-player-tools">
          <h3>All Players</h3>
          <input id="mcPlayerSearch" type="search"
            placeholder="Search player or team..."
            value="${esc(state.search)}">
        </div>

        ${filtered.length ? `
          <div class="mc-table-wrap">
            <table class="mc-data-table">
              <thead>
                <tr>
                  <th>#</th><th>Player</th><th>Mat</th><th>Runs</th>
                  <th>Avg</th><th>SR</th><th>4s</th><th>6s</th>
                  <th>Wkts</th><th>Economy</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map((player, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <strong>${esc(player.name)}</strong>
                      ${player.teamName
                        ? `<small class="mc-cell-sub">${esc(player.teamName)}</small>`
                        : ""}
                    </td>
                    <td>${player.matches}</td>
                    <td><b>${player.runs}</b></td>
                    <td>${player.average.toFixed(2)}</td>
                    <td>${player.strikeRate.toFixed(1)}</td>
                    <td>${player.fours}</td>
                    <td>${player.sixes}</td>
                    <td>${player.wickets}</td>
                    <td>${player.economy.toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : empty(
          "No player statistics",
          "খেলোয়াড় ও স্কোরকার্ডের তথ্য সংরক্ষণ করুন।"
        )}
      </article>
    `;
  }

  /* ==================== MATCH RESULTS ==================== */

  function renderMatches(data) {
    const matches = data.matches.slice().sort((a, b) =>
      String(first(b, ["date", "matchDate", "createdAt"], ""))
        .localeCompare(
          String(first(a, ["date", "matchDate", "createdAt"], ""))
        )
    );

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">FIXTURES &amp; RESULTS</span>
          <h2>Match Results</h2>
          <p>সংরক্ষিত ফিক্সচার ও ফলাফল এখানে দেখানো হয়।</p>
        </div>
      </div>

      <article class="mc-panel mc-table-panel">
        ${renderMatchTable(matches, data.teams)}
      </article>
    `;
  }

  function renderMatchTable(matches, teams) {
    if (!matches.length) {
      return empty(
        "No matches found",
        "ফিক্সচার তৈরি করুন অথবা Match & Live-এ ম্যাচ সংরক্ষণ করুন।"
      );
    }

    return `
      <div class="mc-table-wrap">
        <table class="mc-data-table">
          <thead>
            <tr>
              <th>Match</th><th>Fixture</th><th>Score</th>
              <th>Status</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${matches.map((match, index) => {
              const teamA = matchTeamName(match, "a", teams);
              const teamB = matchTeamName(match, "b", teams);
              const scoreA = inningsTotal(match, "a");
              const scoreB = inningsTotal(match, "b");

              const status = isComplete(match)
                ? "Completed"
                : isLive(match)
                  ? "Live"
                  : String(first(match, [
                      "status", "matchStatus"
                    ], "Scheduled"));

              return `
                <tr>
                  <td>
                    ${esc(first(match, [
                      "matchNumber", "matchNo", "number"
                    ], `#${index + 1}`))}
                    <small class="mc-cell-sub">
                      ${esc(first(match, [
                        "date", "matchDate", "scheduledAt"
                      ], "Date not set"))}
                    </small>
                  </td>

                  <td>
                    <strong>${esc(teamA)}</strong>
                    <small class="mc-cell-sub">vs ${esc(teamB)}</small>
                  </td>

                  <td>
                    <b>${esc(scoreText(scoreA))}</b>
                    <small class="mc-cell-sub">${esc(scoreText(scoreB))}</small>
                  </td>

                  <td>
                    <span class="mc-status-pill ${
                      status === "Live"
                        ? "is-live"
                        : status === "Completed"
                          ? "is-complete"
                          : ""
                    }">${esc(status)}</span>
                  </td>

                  <td>
                    ${esc(winnerName(match, teams) ||
                      first(match, [
                        "resultText", "resultSummary", "outcome"
                      ], "—"))}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ==================== AWARDS & REPORT ==================== */

  function renderAwards(data, standings, players) {
    const byRuns = players.slice().sort((a, b) => b.runs - a.runs)[0];
    const byWickets = players.slice().sort((a, b) => b.wickets - a.wickets)[0];
    const bySixes = players.slice().sort((a, b) => b.sixes - a.sixes)[0];
    const byFours = players.slice().sort((a, b) => b.fours - a.fours)[0];

    const final = data.matches.find(match =>
      /final/i.test(String(first(match, [
        "round", "stage", "matchType", "roundName"
      ], "")))
    );

    const champion = final ? winnerName(final, data.teams) : "";

    const cards = [
      ["🏆", "Tournament Champion", champion || "Not decided",
        champion ? "Final result saved" : "Final result pending"],
      ["🏏", "Top Run Scorer", byRuns?.name || "—",
        `${byRuns?.runs || 0} runs`],
      ["🎯", "Top Wicket Taker", byWickets?.name || "—",
        `${byWickets?.wickets || 0} wickets`],
      ["🚀", "Most Sixes", bySixes?.name || "—",
        `${bySixes?.sixes || 0} sixes`],
      ["💥", "Most Fours", byFours?.name || "—",
        `${byFours?.fours || 0} fours`],
      ["🥇", "League Leader", standings[0]?.name || "—",
        standings[0] ? `${standings[0].points} points` : "No standings"]
    ];

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">SEASON HONOURS</span>
          <h2>Awards &amp; Tournament Report</h2>
          <p>বর্তমানে সংরক্ষিত ডেটা থেকে পুরস্কারের তথ্য হিসাব করা হয়।</p>
        </div>
        <button type="button" class="mc-btn mc-btn-primary"
          data-action="print">Print report</button>
      </div>

      <div class="mc-award-grid">
        ${cards.map(card => `
          <article class="mc-award-card">
            <span>${card[0]}</span>
            <small>${esc(card[1])}</small>
            <strong>${esc(card[2])}</strong>
            <p>${esc(card[3])}</p>
          </article>
        `).join("")}
      </div>

      <article class="mc-panel mc-report-panel">
        <h3>Season Summary</h3>
        <div class="mc-report-grid">
          <div><span>Tournament</span><b>${esc(data.selected ? tournamentLabel(data.selected) : "All Tournaments")}</b></div>
          <div><span>Format</span><b>${esc(data.selected ? formatName(data.selected) : "Mixed / All")}</b></div>
          <div><span>Teams</span><b>${data.teams.length}</b></div>
          <div><span>Matches played</span><b>${data.matches.filter(isComplete).length}</b></div>
          <div><span>Matches remaining</span><b>${data.matches.filter(match => !isComplete(match)).length}</b></div>
          <div><span>Champion</span><b>${esc(champion || "Pending")}</b></div>
        </div>
      </article>
    `;
  }

  function empty(title, message) {
    return `
      <div class="mc-empty-state">
        <span>📊</span>
        <strong>${esc(title)}</strong>
        <p>${esc(message)}</p>
      </div>
    `;
  }

  /* ==================== INITIALIZATION ==================== */

  function init() {
    const root = $("#statistics") ||
      $("#status") ||
      $('[data-page="statistics"]') ||
      $('[data-section="statistics"]');

    if (root) render();
  }

  window.CricketStatistics = {
    render,
    refresh: render,
    readAll,
    buildStandings,
    getPlayerStats,
    generateFixtures,
    updatePlayoffs
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("storage", event => {
    if (!event.key || Object.values(STORAGE).flat().includes(event.key)) {
      render();
    }
  });
})();