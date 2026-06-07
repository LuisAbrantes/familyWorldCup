"use client";

import { useState, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Trophy,
  Calendar,
  Info,
  Settings,
  RefreshCw,
  Check,
  AlertCircle,
  Plus,
  Minus,
  Lock,
  User,
  Medal,
  Play
} from "lucide-react";

interface Match {
  id: number;
  stage: string;
  groupName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
  utcDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  lastSyncedAt: string;
}

interface Prediction {
  id: number;
  matchId: number;
  predictedHome: number;
  predictedAway: number;
  pointsAwarded: number | null;
}

interface LeaderboardUser {
  id: number;
  displayName: string;
  isCurrentUser: boolean;
  totalPoints: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "leaderboard" | "admin">("overview");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Action states
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingPrediction, setSavingPrediction] = useState<Record<number, boolean>>({});
  const [predictionFeedback, setPredictionFeedback] = useState<Record<number, { type: "success" | "error"; text: string }>>({});
  
  // Local temporary form inputs
  const [predictedScores, setPredictedScores] = useState<Record<number, { home: number; away: number }>>({});
  
  // Filters
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Sync & fetch auth profile
      const authRes = await fetch("/api/auth/sync");
      if (!authRes.ok) throw new Error("Não foi possível autenticar o usuário.");
      const authData = await authRes.json();
      setUser(authData.user);
      setIsAdmin(authData.isAdmin || false);

      // 2. Fetch matches & user predictions
      const matchesRes = await fetch("/api/matches");
      if (!matchesRes.ok) throw new Error("Erro ao carregar os jogos.");
      const matchesData = await matchesRes.json();
      setMatches(matchesData.matches);
      
      // Index predictions by matchId for direct access
      const predictionMap: Record<number, Prediction> = {};
      const initialScores: Record<number, { home: number; away: number }> = {};
      
      matchesData.predictions.forEach((pred: Prediction) => {
        predictionMap[pred.matchId] = pred;
        initialScores[pred.matchId] = {
          home: pred.predictedHome,
          away: pred.predictedAway
        };
      });
      
      setPredictions(predictionMap);
      setPredictedScores(initialScores);

      // 3. Fetch leaderboard
      const leaderboardRes = await fetch("/api/leaderboard");
      if (!leaderboardRes.ok) throw new Error("Erro ao carregar a classificação.");
      const leaderboardData = await leaderboardRes.json();
      setLeaderboard(leaderboardData.leaderboard);

    } catch (error: any) {
      console.error("Erro no carregamento de dados:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle predictions save
  const handleSavePrediction = async (matchId: number) => {
    const scores = predictedScores[matchId];
    if (!scores) return;

    setSavingPrediction(prev => ({ ...prev, [matchId]: true }));
    setPredictionFeedback(prev => ({ ...prev, [matchId]: null as any }));

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          predictedHome: scores.home,
          predictedAway: scores.away
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar palpite.");
      }

      // Update predictions map state
      setPredictions(prev => ({
        ...prev,
        [matchId]: data.prediction
      }));

      setPredictionFeedback(prev => ({
        ...prev,
        [matchId]: { type: "success", text: "Salvo!" }
      }));

      // Refresh leaderboard in the background
      const leaderboardRes = await fetch("/api/leaderboard");
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard);
      }

      setTimeout(() => {
        setPredictionFeedback(prev => ({ ...prev, [matchId]: null as any }));
      }, 3000);

    } catch (error: any) {
      setPredictionFeedback(prev => ({
        ...prev,
        [matchId]: { type: "error", text: error.message }
      }));
    } finally {
      setSavingPrediction(prev => ({ ...prev, [matchId]: false }));
    }
  };

  // Trigger manual API Sync (Admin only)
  const handleForceSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao sincronizar resultados.");
      }
      setSyncMessage({ type: "success", text: data.message });
      // Reload everything
      await loadData();
    } catch (error: any) {
      setSyncMessage({ type: "error", text: error.message });
    } finally {
      setSyncing(false);
    }
  };

  // Helpers to adjust scores in forms
  const adjustScore = (matchId: number, side: "home" | "away", delta: number) => {
    const current = predictedScores[matchId] || { home: 0, away: 0 };
    const val = Math.max(0, (side === "home" ? current.home : current.away) + delta);
    setPredictedScores(prev => ({
      ...prev,
      [matchId]: {
        ...current,
        [side]: val
      }
    }));
  };

  // Date formatter helper
  const formatMatchDate = (utcDateString: string) => {
    const d = new Date(utcDateString);
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    });
  };

  // Filter matches
  const filteredMatches = matches.filter(match => {
    const stageMatch = stageFilter === "ALL" || match.stage === stageFilter;
    const teamMatch =
      match.homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeamName.toLowerCase().includes(searchQuery.toLowerCase());
    return stageMatch && teamMatch;
  });

  // Unique stages list for filtering
  const availableStages = Array.from(new Set(matches.map(m => m.stage)));

  // Calculate some simple stats for the current user
  const userRank = leaderboard.findIndex(u => u.isCurrentUser) + 1;
  const userTotalPoints = leaderboard.find(u => u.isCurrentUser)?.totalPoints || 0;
  const predictedCount = Object.keys(predictions).length;

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 font-medium animate-pulse">Carregando dados da Copa do Mundo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#06080e] bg-radial-gradient from-zinc-900/40 via-zinc-950/80 to-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-950/70 border-b border-zinc-800/80 px-4 py-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 shadow-lg shadow-emerald-500/10">
              <Trophy className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
                Bolão da Família
              </h1>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Copa do Mundo 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-zinc-200">{user.displayName}</span>
                <span className="text-xs text-zinc-500">Rank: #{userRank || "-"} • {userTotalPoints} pts</span>
              </div>
            )}
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <nav className="flex p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/50 backdrop-blur-sm select-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "overview"
                ? "bg-zinc-800 text-zinc-100 shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "matches"
                ? "bg-zinc-800 text-zinc-100 shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jogos</span>
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "leaderboard"
                ? "bg-zinc-800 text-zinc-100 shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Classificação</span>
            <span className="sm:hidden">Ranking</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === "admin"
                  ? "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Painel Admin</span>
            </button>
          )}
        </nav>

        {/* Tab Content Panels */}
        <div className="flex-1">
          
          {/* Active Tab: Overview */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/70 to-zinc-900 border border-zinc-800/80 shadow-lg flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-4 -translate-y-4" />
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Sua Pontuação</span>
                  <div>
                    <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">{userTotalPoints} pts</h2>
                    <p className="text-xs text-emerald-400 mt-1">Posição #{userRank || "-"}</p>
                  </div>
                </div>

                <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-amber-950/30 via-zinc-900/70 to-zinc-900 border border-zinc-800/80 shadow-lg flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl transform translate-x-4 -translate-y-4" />
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Seus Palpites</span>
                  <div>
                    <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">{predictedCount}</h2>
                    <p className="text-xs text-amber-400 mt-1">Salvos no sistema</p>
                  </div>
                </div>

                <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-zinc-900/70 to-zinc-900 border border-zinc-800/80 shadow-lg flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl transform translate-x-4 -translate-y-4" />
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Jogos da Copa</span>
                  <div>
                    <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">{matches.length}</h2>
                    <p className="text-xs text-indigo-400 mt-1">Sincronizados com a API</p>
                  </div>
                </div>
              </div>

              {/* Rules & Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scoring Matrix Rules */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md">
                  <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Regras de Pontuação
                  </h3>
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Os palpites são processados automaticamente assim que cada partida é encerrada. A pontuação é distribuída da seguinte forma:
                    </p>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-semibold text-zinc-200">Placar Exato</span>
                        </div>
                        <span className="text-sm font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-800/40">+10 pts</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-lime-950/20 border border-lime-900/30">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-lime-500" />
                          <span className="text-sm font-semibold text-zinc-200">Resultado & Saldo</span>
                        </div>
                        <span className="text-sm font-black text-lime-400 bg-lime-950 px-2 py-0.5 rounded-lg border border-lime-800/40">+7 pts</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-900/30">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-sm font-semibold text-zinc-200">Apenas o Vencedor</span>
                        </div>
                        <span className="text-sm font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-800/40">+5 pts</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-zinc-200">Errou o Resultado</span>
                        </div>
                        <span className="text-sm font-black text-red-400 bg-red-950 px-2 py-0.5 rounded-lg border border-red-800/40">0 pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Matches Summary */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      Próximos Confrontos
                    </h3>
                    <div className="flex flex-col gap-3">
                      {matches
                        .filter(m => m.status === "SCHEDULED" || m.status === "TIMED")
                        .slice(0, 3)
                        .map(match => {
                          const userPred = predictions[match.id];
                          return (
                            <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/70">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-zinc-500 font-semibold">{formatMatchDate(match.utcDate)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-zinc-300">{match.homeTeamName} vs {match.awayTeamName}</span>
                                </div>
                              </div>
                              <div>
                                {userPred ? (
                                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Palpitado ({userPred.predictedHome}x{userPred.predictedAway})
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveTab("matches");
                                      setStageFilter(match.stage);
                                    }}
                                    className="text-xs font-bold text-amber-400 bg-amber-950/20 border border-amber-900/50 hover:bg-amber-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Palpitar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {matches.filter(m => m.status === "SCHEDULED" || m.status === "TIMED").length === 0 && (
                        <p className="text-sm text-zinc-500 text-center py-4">Nenhum jogo agendado no momento.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Última atualização: {matches[0] ? new Date(matches[0].lastSyncedAt).toLocaleTimeString("pt-BR") : "-"}</span>
                    <button
                      onClick={() => setActiveTab("matches")}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      Ver todos os jogos <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Matches */}
          {activeTab === "matches" && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Fase do Torneio</label>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Todas as Fases</option>
                    {availableStages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Buscar Seleção</label>
                  <input
                    type="text"
                    placeholder="Ex: Brasil, Argentina..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Matches List Grid */}
              <div className="flex flex-col gap-4">
                {filteredMatches.map(match => {
                  const savedPred = predictions[match.id];
                  const localPred = predictedScores[match.id] || { home: 0, away: 0 };
                  const isSaving = savingPrediction[match.id] || false;
                  const feedback = predictionFeedback[match.id];
                  
                  const now = new Date();
                  const isLocked =
                    (match.status !== "SCHEDULED" && match.status !== "TIMED") ||
                    now.getTime() >= new Date(match.utcDate).getTime();

                  return (
                    <div
                      key={match.id}
                      className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-zinc-800 shadow-md flex flex-col sm:flex-row items-center gap-6 justify-between transition-all duration-300 hover:border-zinc-700/60"
                    >
                      {/* Left: Match Info & Teams */}
                      <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex-1 flex items-center justify-end gap-3 text-right">
                          <span className="text-base font-bold text-zinc-100">{match.homeTeamName}</span>
                          <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800/80 flex items-center justify-center p-1 overflow-hidden">
                            {match.homeTeamCrest ? (
                              <img src={match.homeTeamCrest} alt={match.homeTeamName} className="object-contain max-h-full max-w-full" />
                            ) : (
                              <User className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                        </div>

                        {/* Middle Score (if finished / live) */}
                        <div className="flex flex-col items-center min-w-[70px]">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{match.stage.replace(/_/g, " ")}</span>
                          
                          {match.status === "FINISHED" ? (
                            <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800/70">
                              <span className="text-lg font-black text-zinc-100">{match.homeScore}</span>
                              <span className="text-zinc-600 text-xs font-bold">X</span>
                              <span className="text-lg font-black text-zinc-100">{match.awayScore}</span>
                            </div>
                          ) : match.status === "IN_PLAY" ? (
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/20 border border-red-900/40">
                                <span className="text-lg font-black text-red-400">{match.homeScore}</span>
                                <span className="text-red-500 text-xs font-bold">X</span>
                                <span className="text-lg font-black text-red-400">{match.awayScore}</span>
                              </div>
                              <span className="text-[9px] font-black text-red-500 uppercase tracking-wider animate-pulse mt-0.5">Ao Vivo</span>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-400 font-semibold mt-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800/60">
                              {formatMatchDate(match.utcDate)}
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex items-center justify-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800/80 flex items-center justify-center p-1 overflow-hidden">
                            {match.awayTeamCrest ? (
                              <img src={match.awayTeamCrest} alt={match.awayTeamName} className="object-contain max-h-full max-w-full" />
                            ) : (
                              <User className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                          <span className="text-base font-bold text-zinc-100">{match.awayTeamName}</span>
                        </div>
                      </div>

                      {/* Right: Predict Form */}
                      <div className="w-full sm:w-auto flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 min-w-[240px]">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          {isLocked ? <Lock className="w-3 h-3 text-zinc-500" /> : null}
                          Seu Palpite
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Home Input Adjustment */}
                          <div className="flex items-center gap-1.5">
                            {!isLocked && (
                              <button
                                onClick={() => adjustScore(match.id, "home", -1)}
                                className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base font-bold text-zinc-200">
                              {isLocked ? (savedPred?.predictedHome ?? "-") : localPred.home}
                            </div>
                            {!isLocked && (
                              <button
                                onClick={() => adjustScore(match.id, "home", 1)}
                                className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <span className="text-zinc-600 font-black">X</span>

                          {/* Away Input Adjustment */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {!isLocked && (
                                <button
                                  onClick={() => adjustScore(match.id, "away", -1)}
                                  className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base font-bold text-zinc-200">
                                {isLocked ? (savedPred?.predictedAway ?? "-") : localPred.away}
                              </div>
                              {!isLocked && (
                                <button
                                  onClick={() => adjustScore(match.id, "away", 1)}
                                  className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Save Action / Status Points Info */}
                        <div className="w-full mt-3 flex justify-center">
                          {isLocked ? (
                            savedPred ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-semibold text-zinc-400">Palpite Encerrado</span>
                                {savedPred.pointsAwarded !== null && (
                                  <span className={`text-xs font-black px-2 py-0.5 rounded mt-1 border ${
                                    savedPred.pointsAwarded === 10
                                      ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                                      : savedPred.pointsAwarded === 7
                                      ? "bg-lime-950 text-lime-400 border-lime-900"
                                      : savedPred.pointsAwarded === 5
                                      ? "bg-amber-950 text-amber-400 border-amber-900"
                                      : "bg-red-950 text-red-400 border-red-900"
                                  }`}>
                                    +{savedPred.pointsAwarded} pts
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600 font-semibold flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Sem palpite cadastrado
                              </span>
                            )
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              <button
                                onClick={() => handleSavePrediction(match.id)}
                                disabled={isSaving || (savedPred && savedPred.predictedHome === localPred.home && savedPred.predictedAway === localPred.away)}
                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  savedPred && savedPred.predictedHome === localPred.home && savedPred.predictedAway === localPred.away
                                    ? "bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed"
                                    : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/10"
                                }`}
                              >
                                {isSaving ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                {savedPred ? "Atualizar" : "Salvar"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Save feedback banner */}
                        {feedback && (
                          <div className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${
                            feedback.type === "success" ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {feedback.type === "success" ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {feedback.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredMatches.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    Nenhum jogo encontrado para os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Tab: Leaderboard */}
          {activeTab === "leaderboard" && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md">
                <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Classificação da Família
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-16">Pos</th>
                        <th className="py-3 px-4">Participante</th>
                        <th className="py-3 px-4 text-right">Pontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {leaderboard.map((row, idx) => {
                        const rank = idx + 1;
                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              row.isCurrentUser
                                ? "bg-emerald-950/20 border-l-2 border-emerald-500 text-zinc-100"
                                : "text-zinc-300 hover:bg-zinc-900/30"
                            }`}
                          >
                            <td className="py-4 px-4 font-extrabold text-sm flex items-center gap-1">
                              {rank === 1 ? (
                                <Medal className="w-4 h-4 text-amber-400" />
                              ) : rank === 2 ? (
                                <Medal className="w-4 h-4 text-zinc-400" />
                              ) : rank === 3 ? (
                                <Medal className="w-4 h-4 text-amber-700" />
                              ) : (
                                <span className="text-zinc-500 w-4 pl-1">{rank}º</span>
                              )}
                            </td>
                            <td className="py-4 px-4 font-semibold text-sm">
                              {row.displayName} {row.isCurrentUser && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-900/40 px-2 py-0.5 rounded-full ml-2">Você</span>}
                            </td>
                            <td className="py-4 px-4 font-black text-sm text-right text-zinc-100">
                              {row.totalPoints} pts
                            </td>
                          </tr>
                        );
                      })}
                      {leaderboard.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-sm text-zinc-500">
                            Nenhum participante pontuou ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Admin */}
          {activeTab === "admin" && isAdmin && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-md">
                <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  Painel de Controle do Administrador
                </h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Utilize esta seção para forçar a sincronização de dados dos jogos e resultados com a API externa do <strong>football-data.org</strong>. 
                  Isso irá ignorar o cache local de 60 segundos e recalcular imediatamente as pontuações de todos os palpites para os jogos finalizados.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handleForceSync}
                    disabled={syncing}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-zinc-950 font-bold hover:from-emerald-400 hover:to-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar Resultados
                      </>
                    )}
                  </button>
                  
                  {syncMessage && (
                    <div className={`p-3 rounded-lg border flex items-center gap-2 ${
                      syncMessage.type === "success" 
                        ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
                        : "bg-red-950/20 border-red-900/50 text-red-400"
                    }`}>
                      {syncMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span className="text-xs font-bold">{syncMessage.text}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-zinc-800/40 text-center text-xs text-zinc-600 font-semibold mt-auto max-w-6xl w-full mx-auto">
        Desenvolvido com carinho para o Bolão da Família Copa 2026. Todos os direitos reservados.
      </footer>
    </div>
  );
}
