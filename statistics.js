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

  /* ==================== GROUP & KNOCKOUT HELPERS ==================== */

  function tournamentStorageKey() {
    for (const key of STORAGE.tournaments) {
      if (parseStorage(key) !== null) return key;
    }
    return STORAGE.tournaments[0];
  }

  function saveTournamentRecord(updatedTournament) {
    try {
      const key = tournamentStorageKey();
      const tournaments = readStorage(STORAGE.tournaments);
      const id = idOf(updatedTournament);
      const index = tournaments.findIndex(item => idOf(item) === id);

      if (index < 0) return false;

      tournaments[index] = updatedTournament;
      localStorage.setItem(key, JSON.stringify(tournaments));
      return true;
    } catch (error) {
      console.error("MATCHCRAFT: Tournament update failed.", error);
      return false;
    }
  }

  function groupAssignments(tournament) {
    return tournament?.groupAssignments &&
      typeof tournament.groupAssignments === "object"
      ? tournament.groupAssignments
      : {};
  }

  function teamGroup(team, tournament) {
    const id = idOf(team);
    const assignments = groupAssignments(tournament);

    return String(
      assignments[id] ||
      first(team, ["group", "groupName", "groupLabel"], "")
    ).trim();
  }

  function isGroupStageMatch(match) {
    const round = String(first(match, [
      "round", "stage", "roundName", "stageName", "matchType"
    ], "")).toLowerCase();

    return match?.groupStage === true ||
      Boolean(match?.group || match?.groupName) ||
      round.includes("group stage");
  }

  function isKnockoutMatch(match) {
    if (!match || typeof match !== "object") {
        return false;
    }

    // Group Stage কখনো Knockout হিসেবে গণ্য হবে না।
    const stage = String(
        match.bracketStage ??
        match.stage ??
        match.roundName ??
        match.round ??
        ""
    ).trim().toLowerCase();

    if (
        match.groupStage === true ||
        stage === "group" ||
        stage.includes("group stage") ||
        Boolean(match.groupName)
    ) {
        return false;
    }

    // স্পষ্ট Knockout flag।
    if (match.knockoutStage === true) {
        return true;
    }

    // null, undefined বা খালি string গ্রহণ করা যাবে না।
    const roundIndex = match.knockoutRoundIndex;

    if (
        roundIndex !== null &&
        roundIndex !== undefined &&
        roundIndex !== "" &&
        Number.isFinite(Number(roundIndex)) &&
        Number(roundIndex) >= 0
    ) {
        return true;
    }

    // Knockout round-এর নাম।
    if (
        match.knockoutRound !== null &&
        match.knockoutRound !== undefined &&
        String(match.knockoutRound).trim() !== ""
    ) {
        return true;
    }

    return (
        stage.includes("preliminary") ||
        stage.includes("quarter") ||
        stage.includes("semi") ||
        stage.includes("final") ||
        stage.includes("knockout") ||
        stage.includes("eliminator") ||
        stage.includes("qualifier")
    );
}

  function tournamentMatches(matches, tournamentId) {
    return matches.filter(match =>
      tournamentIdOf(match) === String(tournamentId)
    );
  }

  function saveAndNotifyMatches(matches) {
    if (!saveMatches(matches)) return false;

    window.dispatchEvent(new Event("matchcraft:matches-updated"));
    return true;
  }

  function knockoutRoundLabel(matchCount, preliminary = false) {
    if (matchCount === 1) return "Final";
    if (matchCount === 2) return preliminary ? "Preliminary" : "Semi Final";
    if (matchCount === 4) return "Quarter Final";
    return preliminary ? "Preliminary" : "Knockout Round";
  }

  function groupNamesForTournament(tournament, teams) {
    const names = [
      ...new Set(teams.map(team => teamGroup(team, tournament)).filter(Boolean))
    ];

    return names.sort((a, b) => a.localeCompare(b));
  }

  /* ==================== STANDINGS ==================== */

  function buildStandings(data, onlyGroup = "") {
    const tournament = data.selected || null;

    const rows = data.teams.map(team => ({
      id: idOf(team),
      name: nameOf(team),
      group: teamGroup(team, tournament),
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

    const groupFormat = tournament &&
      formatName(tournament) === "Group + Knockout";

    let matches = (data.matches || []).filter(isComplete);

    // Group + Knockout-এর পয়েন্ট টেবিলে শুধু Group Stage-এর ম্যাচ।
    if (groupFormat || onlyGroup) {
      matches = matches.filter(isGroupStageMatch);
    }

    for (const match of matches) {
      const aName = matchTeamName(match, "a", data.teams);
      const bName = matchTeamName(match, "b", data.teams);

      const a = findRow(matchTeamId(match, "a"), aName);
      const b = findRow(matchTeamId(match, "b"), bName);

      if (!a || !b || a.id === b.id) continue;

      if (onlyGroup && a.group !== onlyGroup && b.group !== onlyGroup) {
        continue;
      }

      if (onlyGroup && (a.group !== onlyGroup || b.group !== onlyGroup)) {
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

    const teams = Array.isArray(data.teams) ? data.teams : [];
    const registeredPlayers = Array.isArray(data.players)
        ? data.players
        : [];
    const matches = Array.isArray(data.matches)
        ? data.matches
        : [];

    const getTeamName = (teamId) => {
        const team = teams.find(item =>
            String(idOf(item)) === String(teamId)
        );

        return team ? nameOf(team) : "";
    };

    const ensure = (id, name, teamName = "") => {
        const key = String(id || name || "unknown");

        if (!stats.has(key)) {
            const registered = registeredPlayers.find(player =>
                String(idOf(player)) === key ||
                (
                    name &&
                    nameOf(player).trim().toLowerCase() ===
                    String(name).trim().toLowerCase()
                )
            );

            stats.set(key, {
                id: key,
                name: name ||
                    (registered ? nameOf(registered) : "Unknown"),
                teamName: teamName ||
                    (registered
                        ? String(first(registered, ["teamName", "team"], ""))
                        : ""),
                matches: 0,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                runsConceded: 0,
                overs: 0,
                catches: 0,
                stumpings: 0,
                runOuts: 0
            });
        }

        const player = stats.get(key);

        if (name && (!player.name || player.name === "Unknown")) {
            player.name = name;
        }

        if (teamName && !player.teamName) {
            player.teamName = teamName;
        }

        return player;
    };

    // আগে থেকেই নিবন্ধিত সব খেলোয়াড় যোগ করা
    registeredPlayers.forEach(player => {
        ensure(
            idOf(player),
            nameOf(player),
            String(first(player, ["teamName", "team"], ""))
        );
    });

    // প্রতিটি ম্যাচের প্রকৃত liveData থেকে পরিসংখ্যান
    matches.forEach(match => {
        const liveData = match.liveData || match.live || {};
        const inningsList = Array.isArray(liveData.innings)
            ? liveData.innings
            : [];

        if (!inningsList.length) return;

        const playedPlayers = new Set();

        inningsList.forEach(innings => {
            if (!innings) return;

            const battingTeamName = getTeamName(
                innings.battingTeamId
            );

            const bowlingTeamName = getTeamName(
                innings.bowlingTeamId
            );

            // ব্যাটারদের পরিসংখ্যান
            const batters = innings.batters || {};

            Object.entries(batters).forEach(([id, batting]) => {
                if (!batting) return;

                const registered = registeredPlayers.find(player =>
                    String(idOf(player)) === String(id)
                );

                const player = ensure(
                    id,
                    registered ? nameOf(registered) : id,
                    battingTeamName
                );

                player.runs += num(batting.runs);
                player.balls += num(batting.balls);
                player.fours += num(batting.fours);
                player.sixes += num(batting.sixes);

                playedPlayers.add(String(id));
            });

            // বোলারদের পরিসংখ্যান
            const bowlers = innings.bowlers || {};

            Object.entries(bowlers).forEach(([id, bowling]) => {
                if (!bowling) return;

                const registered = registeredPlayers.find(player =>
                    String(idOf(player)) === String(id)
                );

                const player = ensure(
                    id,
                    registered ? nameOf(registered) : id,
                    bowlingTeamName
                );

                player.wickets += num(bowling.wickets);
                player.runsConceded += num(bowling.runs);

                // Economy হিসাবের জন্য legal balls
                player.overs += num(bowling.legalBalls) / 6;

                playedPlayers.add(String(id));
            });

            // প্রকৃত event থেকে অতিরিক্ত ফিল্ডিং তথ্য
            const events = Array.isArray(innings.events)
                ? innings.events
                : [];

            events.forEach(event => {
                if (!event) return;

                const wicketType = String(
                    event.wicketType || ""
                ).toLowerCase();

                // Run Out-এ dismissed batter শনাক্ত
                if (
                    event.wicket &&
                    wicketType.includes("run out")
                ) {
                    const dismissedId = String(
                        event.dismissedBatterId || ""
                    );

                    if (dismissedId) {
                        const dismissed = ensure(dismissedId);
                        playedPlayers.add(dismissedId);
                    }
                }
            });
        });

        // প্রতি ম্যাচে একজন খেলোয়াড়কে একবারই ম্যাচ গণনা
        playedPlayers.forEach(id => {
            const player = stats.get(id);
            if (player) player.matches++;
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

    const teams = data.teams || [];
    const groupCount = Math.floor(Number(tournament.numberOfGroups));

    if (teams.length < 2) {
      alert("গ্রুপ ফিক্সচার তৈরির জন্য অন্তত ২টি দল প্রয়োজন।");
      return;
    }

    if (
      !Number.isInteger(groupCount) ||
      groupCount < 2 ||
      groupCount > teams.length
    ) {
      alert("Tournament Setup থেকে সঠিক Group সংখ্যা নির্ধারণ করুন।");
      return;
    }

    if (teams.length % groupCount !== 0) {
      alert(
        `সমানভাবে দল ভাগ করা যাচ্ছে না।\n\n` +
        `মোট দল: ${teams.length}\n` +
        `গ্রুপ: ${groupCount}\n\n` +
        `দলসংখ্যা গ্রুপসংখ্যা দিয়ে নিঃশেষে ভাগ হতে হবে।`
      );
      return;
    }

    const matches = readStorage(STORAGE.matches);
    const existingGroupMatches = tournamentMatches(
      matches, tournamentId
    ).filter(match =>
      match.generatedFixture === true &&
      isGroupStageMatch(match)
    );

    // আগের Group ম্যাচে ফলাফল বা Live অবস্থা থাকলে সেগুলো নিরাপদ রাখো।
    const protectedMatches = existingGroupMatches.filter(match =>
      isComplete(match) || isLive(match)
    );

    if (protectedMatches.length) {
      alert(
        "এই Group Stage-এ Live অথবা Completed ম্যাচ রয়েছে।\n\n" +
        "আগের ফলাফল নষ্ট হওয়ার ঝুঁকি এড়াতে Group Pairing পুনরায় তৈরি করা হয়নি।"
      );
      return;
    }

    const teamsPerGroup = teams.length / groupCount;
    const groups = Array.from(
      { length: groupCount },
      (_, index) => `Group ${String.fromCharCode(65 + index)}`
    );

    const assignments = {};
    const groupedTeams = new Map(
      groups.map(group => [group, []])
    );

    // সমান সংখ্যক দল প্রতিটি গ্রুপে ভাগ করো।
    teams.forEach((team, index) => {
      const groupIndex = Math.floor(index / teamsPerGroup);
      const group = groups[groupIndex];

      assignments[idOf(team)] = group;
      groupedTeams.get(group).push(team);
    });

    // Tournament record-এ Group Assignment স্থায়ীভাবে সংরক্ষণ।
    const updatedTournament = {
      ...tournament,
      numberOfGroups: groupCount,
      groupAssignments: assignments,
      groupNames: groups,
      groupPairingGenerated: true,
      groupPairingUpdatedAt: new Date().toISOString(),
      knockoutState: null
    };

    if (!saveTournamentRecord(updatedTournament)) {
      alert("Group Assignment সংরক্ষণ করা যায়নি।");
      return;
    }

    // শুধু আগের Pending generated Group fixtures সরিয়ে নতুন করে বানাও।
    const preservedMatches = matches.filter(match => !(
      tournamentIdOf(match) === tournamentId &&
      match.generatedFixture === true &&
      isGroupStageMatch(match)
    ));

    let number = preservedMatches.length + 1;
    let added = 0;

    for (const [group, groupTeams] of groupedTeams) {
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const teamA = groupTeams[i];
          const teamB = groupTeams[j];
          const round = `Group Stage - ${group}`;

          const fixture = createFixture(
            updatedTournament,
            teamA,
            teamB,
            round,
            number++
          );

          fixture.group = group;
          fixture.groupName = group;
          fixture.groupStage = true;
          fixture.knockoutStage = false;
          fixture.generatedFixture = true;

          preservedMatches.push(fixture);
          added++;
        }
      }
    }

    if (!saveAndNotifyMatches(preservedMatches)) return;

    alert(
      `Group Pairing সফলভাবে তৈরি হয়েছে!\n\n` +
      `মোট দল: ${teams.length}\n` +
      `মোট গ্রুপ: ${groupCount}\n` +
      `প্রতি গ্রুপে দল: ${teamsPerGroup}\n` +
      `নতুন Group ম্যাচ: ${added}`
    );

    state.tournamentId = tournamentId;
    render();
  }

  /* ==================== AUTOMATIC GROUP KNOCKOUT ==================== */

  function createKnockoutFixture(
    tournament,
    teamA,
    teamB,
    roundName,
    roundIndex,
    matchNumber
  ) {
    const fixture = createFixture(
      tournament,
      teamA,
      teamB,
      roundName,
      matchNumber
    );

    fixture.knockoutStage = true;
    fixture.groupStage = false;
    fixture.knockoutRoundIndex = roundIndex;
    fixture.knockoutRound = roundName;
    fixture.generatedFixture = true;

    return fixture;
  }

  function getGroupQualifiers(tournament, teams, matches) {
    const groups = groupNamesForTournament(tournament, teams);

    if (!groups.length) return [];

    const data = {
      selected: tournament,
      teams,
      matches
    };

    const qualifiers = [];

    for (const group of groups) {
      const table = buildStandings(data, group);

      // প্রতিটি গ্রুপ থেকে শীর্ষ দুই দল।
      if (table.length < 2) return [];

      qualifiers.push({
        ...table[0],
        group,
        seed: 0
      });

      qualifiers.push({
        ...table[1],
        group,
        seed: 0
      });
    }

    qualifiers.sort((a, b) =>
      b.points - a.points ||
      b.nrr - a.nrr ||
      b.won - a.won ||
      a.group.localeCompare(b.group)
    );

    qualifiers.forEach((team, index) => {
      team.seed = index + 1;
    });

    return qualifiers;
  }

  function createInitialKnockoutRound(
    tournament,
    qualifiers,
    matches
  ) {
    const total = qualifiers.length;

    if (total < 2) return null;

    let power = 1;
    while (power * 2 <= total) power *= 2;

    const isPowerOfTwo = power === total;
    const initialMatchCount = isPowerOfTwo
      ? total / 2
      : total - power;

    const byeCount = isPowerOfTwo
      ? 0
      : total - (initialMatchCount * 2);

    const roundName = knockoutRoundLabel(
      initialMatchCount,
      !isPowerOfTwo
    );

    const byeTeams = qualifiers.slice(0, byeCount);
    const playingTeams = qualifiers.slice(byeCount);

    let number = matches.length + 1;
    let added = 0;

    for (let i = 0; i < initialMatchCount; i++) {
      const teamA = playingTeams[i];
      const teamB = playingTeams[playingTeams.length - 1 - i];

      if (!teamA || !teamB) continue;

      const fixture = createKnockoutFixture(
        tournament,
        { id: teamA.id, name: teamA.name },
        { id: teamB.id, name: teamB.name },
        roundName,
        1,
        number++
      );

      fixture.seed1 = teamA.seed;
      fixture.seed2 = teamB.seed;

      matches.push(fixture);
      added++;
    }

    const stateData = {
      qualifiers: qualifiers.map(team => ({
        id: team.id,
        name: team.name,
        group: team.group,
        seed: team.seed
      })),
      byeTeamIds: byeTeams.map(team => team.id),
      currentRoundIndex: 1,
      currentRoundName: roundName,
      completed: false,
      championTeamId: "",
      createdAt: new Date().toISOString()
    };

    return {
      state: stateData,
      added
    };
  }

  function progressGroupKnockout(tournamentId) {
    const tournaments = readStorage(STORAGE.tournaments);
    const tournament = tournaments.find(
      item => idOf(item) === String(tournamentId)
    );

    if (!tournament ||
        formatName(tournament) !== "Group + Knockout") {
      return false;
    }

    const teams = readStorage(STORAGE.teams).filter(team => {
      const tid = tournamentIdOf(team);
      return !tid || tid === String(tournamentId);
    });

    let matches = readStorage(STORAGE.matches);

    const tournamentGroupMatches = tournamentMatches(
      matches,
      tournamentId
    ).filter(isGroupStageMatch);

    if (!tournamentGroupMatches.length) return false;

    // সব Group ম্যাচ শেষ না হলে Knockout শুরু হবে না।
    if (!tournamentGroupMatches.every(isComplete)) return false;

    let knockoutState = tournament.knockoutState || null;

    // প্রথমবার Qualifier ও প্রথম Knockout রাউন্ড তৈরি।
    if (!knockoutState) {
      const qualifiers = getGroupQualifiers(
        tournament,
        teams,
        matches
      );

      if (qualifiers.length < 2) return false;

      const initial = createInitialKnockoutRound(
        tournament,
        qualifiers,
        matches
      );

      if (!initial || !initial.added) return false;

      knockoutState = initial.state;

      const updatedTournament = {
        ...tournament,
        knockoutState
      };

      if (!saveTournamentRecord(updatedTournament)) return false;
      if (!saveAndNotifyMatches(matches)) return false;

      return true;
    }

    if (knockoutState.completed) return false;

    const roundIndex = Number(knockoutState.currentRoundIndex || 1);

    const currentRoundMatches = tournamentMatches(
      matches,
      tournamentId
    ).filter(match =>
      match.knockoutStage === true &&
      Number(match.knockoutRoundIndex) === roundIndex
    );

    if (!currentRoundMatches.length) return false;

    // বর্তমান রাউন্ডের সব ম্যাচ শেষ না হলে অপেক্ষা।
    if (!currentRoundMatches.every(isComplete)) return false;

    const qualifierList = knockoutState.qualifiers || [];
    const seedMap = new Map(
      qualifierList.map(team => [String(team.id), team])
    );

    const advancing = [];

    // আগের রাউন্ডের Bye পাওয়া দলগুলো পরের রাউন্ডে থাকবে।
    if (roundIndex === 1) {
      (knockoutState.byeTeamIds || []).forEach(id => {
        const team = seedMap.get(String(id));
        if (team) advancing.push(team);
      });
    }

    // বর্তমান রাউন্ডের বিজয়ীরা পরের রাউন্ডে যাবে।
    currentRoundMatches.forEach(match => {
      const id = winnerId(match);
      const team = seedMap.get(String(id));

      if (team) advancing.push(team);
    });

    // Seed অনুযায়ী সাজানো।
    advancing.sort((a, b) => Number(a.seed) - Number(b.seed));

    if (advancing.length < 2) {
      if (advancing.length === 1) {
        knockoutState.completed = true;
        knockoutState.championTeamId = advancing[0].id;

        saveTournamentRecord({
          ...tournament,
          knockoutState
        });
      }
      return true;
    }

    const nextRoundIndex = roundIndex + 1;
    const nextMatchCount = Math.floor(advancing.length / 2);
    const nextRoundName = knockoutRoundLabel(nextMatchCount);

    let number = matches.length + 1;

    for (let i = 0; i < nextMatchCount; i++) {
      const teamA = advancing[i];
      const teamB = advancing[advancing.length - 1 - i];

      const originalA = teams.find(team =>
        idOf(team) === String(teamA.id)
      );

      const originalB = teams.find(team =>
        idOf(team) === String(teamB.id)
      );

      if (!originalA || !originalB) continue;

      const fixture = createKnockoutFixture(
        tournament,
        originalA,
        originalB,
        nextRoundName,
        nextRoundIndex,
        number++
      );

      fixture.seed1 = teamA.seed;
      fixture.seed2 = teamB.seed;

      matches.push(fixture);
    }

    knockoutState.currentRoundIndex = nextRoundIndex;
    knockoutState.currentRoundName = nextRoundName;
    knockoutState.byeTeamIds = [];
    knockoutState.updatedAt = new Date().toISOString();

    const updatedTournament = {
      ...tournament,
      knockoutState
    };

    if (!saveTournamentRecord(updatedTournament)) return false;
    return saveAndNotifyMatches(matches);
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

    if (formatName(data.selected) === "Group + Knockout") {
      const changed = progressGroupKnockout(idOf(data.selected));

      const refreshed = selectedData();
      const stateData = refreshed.selected?.knockoutState;

      if (stateData?.completed) {
        const champion = refreshed.teams.find(team =>
          idOf(team) === String(stateData.championTeamId)
        );

        alert(
          `🏆 Tournament Champion\n\n` +
          `${champion ? nameOf(champion) : "Champion নির্ধারিত"}`
        );
      } else if (changed) {
        alert("Playoff Progression আপডেট হয়েছে।");
      } else {
        const groupMatches = data.matches.filter(isGroupStageMatch);
        const pending = groupMatches.filter(match => !isComplete(match));

        if (pending.length) {
          alert(
            `Group Stage এখনো শেষ হয়নি।\n\n` +
            `বাকি Group ম্যাচ: ${pending.length}\n` +
            `সব Group ম্যাচ শেষ হলে Knockout তৈরি হবে।`
          );
        } else {
          alert("Playoff-এর জন্য প্রয়োজনীয় ফলাফল এখনো পাওয়া যায়নি।");
        }
      }

      render();
      return;
    }

    const matches = data.matches || [];
    const completed = matches.filter(isComplete).length;
    const pending = matches.length - completed;

    const finalMatches = matches.filter(match =>
      /final/i.test(String(first(match, [
        "round", "stage", "roundName", "stageName"
      ], "")))
    );

    const final = finalMatches[finalMatches.length - 1] || null;
    const champion = final
      ? winnerName(final, data.teams)
      : "";

    alert(
      `Playoffs Status\n\n` +
      `Tournament: ${tournamentLabel(data.selected)}\n` +
      `Completed matches: ${completed}\n` +
      `Pending matches: ${pending}\n` +
      `Champion: ${champion || "Not decided"}`
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
      const groups = groupNamesForTournament(
        data.selected,
        data.teams
      );

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
  const selected = data.selected || {};

  const format = String(first(selected, [
    "format", "tournamentFormat", "tournamentType", "type", "typeLabel"
  ], "")).toLowerCase();

  const tournamentTeams = data.teams || [];

  const tournamentMatches = (data.matches || []).filter(match => {
    const tournamentId = String(first(match, [
      "tournamentId", "tournament_id", "competitionId"
    ], ""));

    const selectedId = String(first(selected, ["id", "_id"], ""));

    return !tournamentId || !selectedId || tournamentId === selectedId;
  });

  const finalMatches = tournamentMatches.filter(match =>
    /final/i.test(String(first(match, [
      "round", "stage", "roundName", "stageName"
    ], "")))
  );

  let final = finalMatches.length
    ? finalMatches[finalMatches.length - 1]
    : null;

  // দুই দলের Knockout হলে একটিমাত্র ম্যাচই Final।
  if (!final && /knock/i.test(format)) {
    const knockoutMatches = tournamentMatches.filter(match =>
      /knockout|elimination/i.test(String(first(match, [
        "matchType", "format", "tournamentFormat"
      ], "")))
    );

    if (knockoutMatches.length === 1) {
      final = knockoutMatches[0];
    }
  }

  // Format field-এ Knockout না থাকলেও এক ম্যাচের টুর্নামেন্ট শনাক্ত করো।
  if (!final && tournamentMatches.length === 1) {
    const onlyMatch = tournamentMatches[0];

    if (
      first(onlyMatch, ["teamAId", "team1Id", "homeTeamId"], null) != null ||
      first(onlyMatch, ["teamBId", "team2Id", "awayTeamId"], null) != null
    ) {
      final = onlyMatch;
    }
  }

  const champion = final ? winnerName(final, tournamentTeams) : "";

  const finalTeamA = final
    ? tournamentTeams.find(team =>
        String(first(team, ["id", "_id", "teamId"], "")) ===
        String(first(final, ["teamAId", "team1Id", "homeTeamId"], ""))
      )
    : null;

  const finalTeamB = final
    ? tournamentTeams.find(team =>
        String(first(team, ["id", "_id", "teamId"], "")) ===
        String(first(final, ["teamBId", "team2Id", "awayTeamId"], ""))
      )
    : null;

  const nameA = finalTeamA?.name || finalTeamA?.teamName ||
    (final ? first(final, ["teamAName", "team1Name", "homeTeamName"], "") : "") ||
    teamA?.name || "Finalist 1";

  const nameB = finalTeamB?.name || finalTeamB?.teamName ||
    (final ? first(final, ["teamBName", "team2Name", "awayTeamName"], "") : "") ||
    teamB?.name || "Finalist 2";

  return `
    <article class="mc-panel mc-final-card">
      <div class="mc-final-badge">🏆 CHAMPIONSHIP FINAL</div>

      <div class="mc-final-teams">
        <div>
          <span>FINALIST 1</span>
          <strong>${esc(nameA)}</strong>
        </div>
        <b>VS</b>
        <div>
          <span>FINALIST 2</span>
          <strong>${esc(nameB)}</strong>
        </div>
      </div>

      ${final ? `
        <div class="mc-final-result">
          ${esc(scoreText(inningsTotal(final, "a")))}
          —
          ${esc(scoreText(inningsTotal(final, "b")))}
          <p>
            ${champion
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
      /preliminary|semi|quarter|final|knockout|eliminator|qualifier|play.?off/i.test(
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

    // সব সংরক্ষিত ম্যাচ LocalStorage থেকে পড়া
    function readStoredArray(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];

            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) return parsed;
            if (Array.isArray(parsed.data)) return parsed.data;
            if (Array.isArray(parsed.items)) return parsed.items;

            return [];
        } catch (error) {
            console.warn("Awards data read error:", key, error);
            return [];
        }
    }

    const storedMatches = readStoredArray(
        "matchcraft_cricket_matches"
    );

    const storedPlayers = readStoredArray(
        "matchcraft_cricket_players"
    );

    const storedTeams = readStoredArray(
        "matchcraft_cricket_teams"
    );

    // নির্বাচিত টুর্নামেন্টের ID
    const selectedTournamentId = String(first(
        data.selected || {},
        ["id", "_id", "tournamentId", "tournament_id"],
        ""
    ));

    // নির্বাচিত টুর্নামেন্টের সব পুরোনো ও নতুন ম্যাচ
    const tournamentMatches = storedMatches.filter(match => {

        const tournamentId = String(first(match, [
            "tournamentId",
            "tournament_id"
        ], first(match.tournament || {}, [
            "id",
            "_id",
            "tournamentId"
        ], "")));

        if (!selectedTournamentId) return true;

        return tournamentId === selectedTournamentId;
    });

    // পুরোনো টুর্নামেন্টের সংরক্ষিত ডেটা দিয়ে হিসাব
    const awardData = {
        ...data,
        matches: tournamentMatches,
        players: storedPlayers.length
            ? storedPlayers
            : (data.players || []),
        teams: storedTeams.length
            ? storedTeams
            : (data.teams || [])
    };

    data = awardData;

    // প্রকৃত ম্যাচের ডেটা থেকে খেলোয়াড়ের পরিসংখ্যান তৈরি
    players = getPlayerStats(awardData);

    const allPlayers = awardData.players || [];

    const ranked = (field) =>
        (players || [])
            .filter(player => Number(player[field] || 0) > 0)
            .slice()
            .sort((a, b) =>
                Number(b[field] || 0) - Number(a[field] || 0)
            );

    const byRuns = ranked("runs")[0];
    const byWickets = ranked("wickets")[0];
    const bySixes = ranked("sixes")[0];
    const byFours = ranked("fours")[0];

    const byStrikeRate = (players || [])
        .filter(player =>
            Number(player.balls || 0) > 0 &&
            Number(player.runs || 0) > 0
        )
        .map(player => ({
            ...player,
            calculatedSR:
                Number(player.strikeRate) ||
                (Number(player.runs) / Number(player.balls)) * 100
        }))
        .filter(player => player.calculatedSR > 0)
        .sort((a, b) => b.calculatedSR - a.calculatedSR)[0];

    const byAllRound = (players || [])
        .filter(player =>
            Number(player.runs || 0) > 0 &&
            Number(player.wickets || 0) > 0
        )
        .map(player => ({
            ...player,
            awardScore:
                Number(player.runs || 0) +
                Number(player.wickets || 0) * 20 +
                Number(player.catches || 0) * 10 +
                Number(player.stumpings || 0) * 10 +
                Number(player.runOuts || 0) * 10
        }))
        .sort((a, b) => b.awardScore - a.awardScore)[0];

    const byWicketkeeper = (players || [])
        .filter(player =>
            Number(player.stumpings || 0) > 0 ||
            Number(player.catches || 0) > 0
        )
        .slice()
        .sort((a, b) =>
            (
                Number(b.stumpings || 0) * 2 +
                Number(b.catches || 0)
            ) - (
                Number(a.stumpings || 0) * 2 +
                Number(a.catches || 0)
            )
        )[0];

    const byFielder = (players || [])
        .filter(player =>
            Number(player.catches || 0) > 0 ||
            Number(player.runOuts || 0) > 0
        )
        .slice()
        .sort((a, b) =>
            (
                Number(b.catches || 0) +
                Number(b.runOuts || 0)
            ) - (
                Number(a.catches || 0) +
                Number(a.runOuts || 0)
            )
        )[0];

    /* Final match শনাক্ত */
    const finalMatches = (data.matches || []).filter(match =>
        /final/i.test(String(first(match, [
            "round", "stage", "roundName", "stageName"
        ], "")))
    );

    let final = finalMatches[finalMatches.length - 1] || null;

    if (!final && (data.matches || []).length === 1) {
        const format = String(first(data.selected || {}, [
            "format", "tournamentFormat",
            "tournamentType", "type", "typeLabel"
        ], "")).toLowerCase();

        if (format.includes("knock")) {
            final = data.matches[0];
        }
    }

    /* Champion আগের মতোই */
    const champion = final
        ? winnerName(final, data.teams)
        : "";

    /* Final Match-এর Man of the Match খোঁজা */
    function getManOfMatch(match) {
        if (!match) return null;

        const sources = [
            match,
            match.result,
            match.awards,
            match.matchAwards,
            match.playerAwards,
            match.statistics
        ].filter(Boolean);

        const momKeys = [
            "manOfTheMatch",
            "manOfMatch",
            "playerOfTheMatch",
            "playerOfMatch",
            "manOfTheMatchName",
            "manOfMatchName",
            "playerOfTheMatchName",
            "playerOfMatchName",
            "mom",
            "motm",
            "man_of_the_match",
            "player_of_match"
        ];

        const idKeys = [
            "manOfTheMatchId",
            "manOfMatchId",
            "playerOfTheMatchId",
            "playerOfMatchId",
            "momPlayerId",
            "motmPlayerId",
            "man_of_the_match_id",
            "player_of_match_id"
        ];

        let candidate = null;

        for (const source of sources) {
            candidate = first(source, momKeys, null);

            if (candidate) break;
        }

        let candidateId = "";

        if (!candidate) {
            for (const source of sources) {
                candidateId = first(source, idKeys, "");

                if (candidateId) break;
            }
        }

        if (!candidate && !candidateId) return null;

        let candidateName = "";

        if (typeof candidate === "string") {
            candidateName = candidate;
        } else if (candidate && typeof candidate === "object") {
            candidateName = first(candidate, [
                "name", "playerName", "fullName",
                "displayName", "label"
            ], "");

            candidateId = candidateId || first(candidate, [
                "id", "_id", "playerId", "player_id"
            ], "");
        }

        const registeredPlayer = allPlayers.find(player => {
            const playerId = String(first(player, [
                "id", "_id", "playerId", "player_id"
            ], ""));

            const playerName = String(first(player, [
                "name", "playerName", "fullName"
            ], "")).trim().toLowerCase();

            return (
                (candidateId && playerId === String(candidateId)) ||
                (candidateName &&
                    playerName === String(candidateName).trim().toLowerCase())
            );
        });

        const statPlayer = (players || []).find(player => {
            const playerId = String(first(player, [
                "id", "_id", "playerId"
            ], ""));

            const playerName = String(player.name || "")
                .trim().toLowerCase();

            return (
                (candidateId && playerId === String(candidateId)) ||
                (candidateName &&
                    playerName === String(candidateName).trim().toLowerCase())
            );
        });

        const name =
            candidateName ||
            (registeredPlayer && first(registeredPlayer, [
                "name", "playerName", "fullName"
            ], "")) ||
            statPlayer?.name ||
            "";

        if (!name) return null;

        const photo = registeredPlayer
            ? first(registeredPlayer, [
                "photo", "image", "avatar",
                "profileImage", "profilePhoto",
                "imageUrl", "photoUrl", "picture"
            ], "")
            : "";

        return {
            name,
            photo: typeof photo === "string" ? photo : ""
        };
    }

    const manOfMatch = getManOfMatch(final);

    /* শুধু প্রকৃত তথ্য থাকা Award Card তৈরি */
    const cards = [];

    // Champion Card আগের মতোই থাকবে।
    cards.push({
        icon: "🏆",
        title: "Tournament Champion",
        name: champion || "Not decided",
        detail: champion
            ? "Final result saved"
            : "Final result pending"
    });

    if (manOfMatch) {
        cards.push({
            icon: "🌟",
            title: "Player of the Tournament",
            name: manOfMatch.name,
            detail: "Final Match · Man of the Match",
            photo: manOfMatch.photo
        });
    }

    if (byRuns) {
        cards.push({
            icon: "🏏",
            title: "Best Batter / Top Run Scorer",
            name: byRuns.name,
            detail: `${byRuns.runs} runs`
        });
    }

    if (byAllRound) {
        cards.push({
            icon: "🔄",
            title: "Best All-Rounder",
            name: byAllRound.name,
            detail: `${byAllRound.runs} runs · ${byAllRound.wickets} wickets`
        });
    }

    if (byWicketkeeper) {
        cards.push({
            icon: "🧤",
            title: "Best Wicketkeeper",
            name: byWicketkeeper.name,
            detail:
                `${byWicketkeeper.catches || 0} catches · ` +
                `${byWicketkeeper.stumpings || 0} stumpings`
        });
    }

    if (byFielder) {
        cards.push({
            icon: "🎯",
            title: "Best Fielder",
            name: byFielder.name,
            detail:
                `${byFielder.catches || 0} catches · ` +
                `${byFielder.runOuts || 0} run outs`
        });
    }

    if (byStrikeRate) {
        cards.push({
            icon: "⚡",
            title: "Best Strike Rate",
            name: byStrikeRate.name,
            detail: `${byStrikeRate.calculatedSR.toFixed(2)} SR`
        });
    }

    if (byWickets) {
        cards.push({
            icon: "🎯",
            title: "Top Wicket Taker",
            name: byWickets.name,
            detail: `${byWickets.wickets} wickets`
        });
    }

    if (bySixes) {
        cards.push({
            icon: "🚀",
            title: "Most Sixes",
            name: bySixes.name,
            detail: `${bySixes.sixes} sixes`
        });
    }

    if (byFours) {
        cards.push({
            icon: "💥",
            title: "Most Fours",
            name: byFours.name,
            detail: `${byFours.fours} fours`
        });
    }

    return `
      <div class="mc-section-heading">
        <div>
          <span class="mc-eyebrow">SEASON HONOURS</span>
          <h2>Awards &amp; Tournament Report</h2>
          <p>সংরক্ষিত ম্যাচ ও খেলোয়াড়ের পরিসংখ্যান থেকে পুরস্কার হিসাব করা হয়।</p>
        </div>
        <button type="button" class="mc-btn mc-btn-primary"
          data-action="print">Print report</button>
      </div>

      <div class="mc-award-grid">
        ${cards.map(card => `
          <article class="mc-award-card">
            <span>${card.icon}</span>
            <small>${esc(card.title)}</small>

            ${card.photo ? `
              <img
                src="${esc(card.photo)}"
                alt="${esc(card.name)}"
                style="width:64px;height:64px;object-fit:cover;border-radius:50%;"
                onerror="this.style.display='none'"
              >
            ` : ""}

            <strong>${esc(card.name)}</strong>
            <p>${esc(card.detail)}</p>
          </article>
        `).join("")}
      </div>

      <article class="mc-panel mc-report-panel">
        <h3>Season Summary</h3>
        <div class="mc-report-grid">
          <div>
            <span>Tournament</span>
            <b>${esc(data.selected
                ? tournamentLabel(data.selected)
                : "All Tournaments")}</b>
          </div>

          <div>
            <span>Format</span>
            <b>${esc(data.selected
                ? formatName(data.selected)
                : "Mixed / All")}</b>
          </div>

          <div><span>Teams</span><b>${data.teams.length}</b></div>

          <div>
            <span>Matches played</span>
            <b>${data.matches.filter(isComplete).length}</b>
          </div>

          <div>
            <span>Matches remaining</span>
            <b>${data.matches.filter(match => !isComplete(match)).length}</b>
          </div>

          <div>
            <span>Champion</span>
            <b>${esc(champion || "Pending")}</b>
          </div>
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

  /* ==================== AUTOMATIC PROGRESSION LISTENER ==================== */

  let progressionRunning = false;

  function syncAutomaticProgression() {
    if (progressionRunning) return;

    progressionRunning = true;

    try {
      const tournaments = readStorage(STORAGE.tournaments);

      tournaments.forEach(tournament => {
        if (formatName(tournament) === "Group + Knockout") {
          progressGroupKnockout(idOf(tournament));
        }
      });
    } catch (error) {
      console.error(
        "MATCHCRAFT: Automatic knockout progression failed.",
        error
      );
    } finally {
      progressionRunning = false;
    }

    render();
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

 // Match Center থেকে ফলাফল সংরক্ষিত হলে Group + Knockout আপডেট।
  document.addEventListener(
    "matchcraft:datachange",
    syncAutomaticProgression
  );

  window.addEventListener(
    "matchcraft:matches-updated",
    syncAutomaticProgression
  );

  window.addEventListener("storage", event => {
    if (!event.key || Object.values(STORAGE).flat().includes(event.key)) {
      syncAutomaticProgression();
    }
  });
})();