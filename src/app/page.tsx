"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
import {
  Trophy,
  Calendar,
  RefreshCw,
  Check,
  AlertCircle,
  Plus,
  Minus,
  Lock,
  User,
  Medal,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  ChevronRight,
  LogOut,
  Users,
  BarChart3,
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

type TabKey = "inicio" | "jogos" | "ranking" | "palpites" | "admin";

// Stage label translation
function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "FASE DE GRUPOS",
    LAST_32: "OITAVAS DE FINAL",
    LAST_16: "OITAVAS DE FINAL",
    QUARTER_FINALS: "QUARTAS DE FINAL",
    SEMI_FINALS: "SEMIFINAIS",
    FINAL: "FINAL",
    THIRD_PLACE: "DISPUTA 3º LUGAR",
  };
  return map[stage] || stage.replace(/_/g, " ");
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [socialPredictions, setSocialPredictions] = useState<any>({});
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

  // Admin tabs & states
  const [activeAdminTab, setActiveAdminTab] = useState<"sync" | "users" | "stats">("sync");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // User profile modal states
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const [profilePredictions, setProfilePredictions] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  }, []);

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair?")) {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setMatches([]);
      setLeaderboard([]);
      setPredictions({});
    }
  };

  const handleOpenProfile = async (userId: number) => {
    setIsProfileModalOpen(true);
    setLoadingProfile(true);
    setSelectedProfileUser(null);
    setProfilePredictions([]);
    try {
      const res = await fetchWithAuth(`/api/users/${userId}/predictions`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProfileUser(data.user);
        setProfilePredictions(data.predictions);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchAdminUsers = useCallback(async () => {
    try {
      setLoadingAdminUsers(true);
      const res = await fetchWithAuth("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users);
      }
    } catch (error) {
      console.error("Erro ao carregar participantes:", error);
    } finally {
      setLoadingAdminUsers(false);
    }
  }, [fetchWithAuth]);

  const fetchAdminStats = useCallback(async () => {
    try {
      setLoadingAdminStats(true);
      const res = await fetchWithAuth("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoadingAdminStats(false);
    }
  }, [fetchWithAuth]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este participante? Todos os palpites dele serão excluídos permanentemente.")) {
      return;
    }
    try {
      setDeletingUserId(id);
      const res = await fetchWithAuth(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover usuário.");
      
      await fetchAdminUsers();
      
      const leaderboardRes = await fetchWithAuth("/api/leaderboard");
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "admin" && isAdmin) {
      if (activeAdminTab === "users") {
        fetchAdminUsers();
      } else if (activeAdminTab === "stats") {
        fetchAdminStats();
      }
    }
  }, [activeTab, activeAdminTab, isAdmin, fetchAdminUsers, fetchAdminStats]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const token = session.access_token;

      const authRes = await fetch("/api/auth/sync", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!authRes.ok) {
        try {
          const errData = await authRes.json();
          console.error("[Auth Sync Failure] Server returned non-OK status:", authRes.status, errData);
        } catch {
          console.error("[Auth Sync Failure] Server returned non-OK status:", authRes.status);
        }
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      const authData = await authRes.json();
      setUser(authData.user);
      setIsAdmin(authData.isAdmin || false);

      const matchesRes = await fetch("/api/matches", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!matchesRes.ok) throw new Error("Erro ao carregar os jogos.");
      const matchesData = await matchesRes.json();
      setMatches(matchesData.matches);

      const predictionMap: Record<number, Prediction> = {};
      const initialScores: Record<number, { home: number; away: number }> = {};

      matchesData.predictions.forEach((pred: Prediction) => {
        predictionMap[pred.matchId] = pred;
        initialScores[pred.matchId] = {
          home: pred.predictedHome,
          away: pred.predictedAway,
        };
      });

      setPredictions(predictionMap);
      setPredictedScores(initialScores);
      setSocialPredictions(matchesData.socialPredictions || {});

      const leaderboardRes = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleSavePrediction = async (matchId: number) => {
    const scores = predictedScores[matchId];
    if (!scores) return;

    setSavingPrediction((prev) => ({ ...prev, [matchId]: true }));
    setPredictionFeedback((prev) => ({ ...prev, [matchId]: null as any }));

    try {
      const res = await fetchWithAuth("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          predictedHome: scores.home,
          predictedAway: scores.away,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar palpite.");

      setPredictions((prev) => ({ ...prev, [matchId]: data.prediction }));
      setPredictionFeedback((prev) => ({
        ...prev,
        [matchId]: { type: "success", text: "Salvo!" },
      }));

      const matchesRes = await fetchWithAuth("/api/matches");
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setSocialPredictions(matchesData.socialPredictions || {});
      }

      const leaderboardRes = await fetchWithAuth("/api/leaderboard");
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard);
      }

      setTimeout(() => {
        setPredictionFeedback((prev) => ({ ...prev, [matchId]: null as any }));
      }, 3000);
    } catch (error: any) {
      setPredictionFeedback((prev) => ({
        ...prev,
        [matchId]: { type: "error", text: error.message },
      }));
    } finally {
      setSavingPrediction((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetchWithAuth("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar resultados.");
      setSyncMessage({ type: "success", text: data.message });
      await loadData();
    } catch (error: any) {
      setSyncMessage({ type: "error", text: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const adjustScore = (matchId: number, side: "home" | "away", delta: number) => {
    const current = predictedScores[matchId] || { home: 0, away: 0 };
    const val = Math.max(0, (side === "home" ? current.home : current.away) + delta);
    setPredictedScores((prev) => ({
      ...prev,
      [matchId]: { ...current, [side]: val },
    }));
  };

  const formatMatchDate = (utcDateString: string) => {
    const d = new Date(utcDateString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).toUpperCase();
  };

  const formatMatchDateShort = (utcDateString: string) => {
    const d = new Date(utcDateString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "America/Sao_Paulo",
    }).toUpperCase() + ", " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const filteredMatches = matches.filter((match) => {
    const stageMatch = stageFilter === "ALL" || match.stage === stageFilter;
    const teamMatch =
      match.homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeamName.toLowerCase().includes(searchQuery.toLowerCase());
    return stageMatch && teamMatch;
  });

  const availableStages = Array.from(new Set(matches.map((m) => m.stage)));

  // Stats
  const totalMatches = matches.length;
  const finishedMatches = matches.filter((m) => m.status === "FINISHED").length;
  const liveMatches = matches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED").length;
  const upcomingMatches = matches.filter((m) => m.status === "SCHEDULED" || m.status === "TIMED").length;
  const userRank = leaderboard.findIndex((u) => u.isCurrentUser) + 1;
  const userTotalPoints = leaderboard.find((u) => u.isCurrentUser)?.totalPoints || 0;

  // Nav items
  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "inicio", label: "Início", icon: <Trophy className="w-4 h-4" /> },
    { key: "jogos", label: "Jogos", icon: <Calendar className="w-4 h-4" /> },
    { key: "ranking", label: "Ranking", icon: <Medal className="w-4 h-4" /> },
    { key: "palpites", label: "Palpites", icon: <Calendar className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-[#0a1a0f] text-[#e8e8e8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#1a3d24] border-t-[#d4a017] animate-spin" />
          <p className="text-[#9ca3af] font-medium animate-pulse">Carregando dados da Copa do Mundo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={loadData} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a1a0f] text-[#e8e8e8]">

      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-50 bg-[#0d2214]/95 backdrop-blur-md border-b border-[#1a3d24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-[#d4a017]" />
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-[#d4a017]">BOLÃO</span>
                <br className="sm:hidden" />
                <span className="text-[#d4a017] sm:ml-1">2026</span>
              </span>
            </div>

            {/* Center Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === item.key
                      ? "text-[#d4a017] bg-[#d4a017]/10"
                      : "text-[#9ca3af] hover:text-[#e8e8e8] hover:bg-[#1a3d24]/40"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === "admin"
                      ? "text-[#d4a017] bg-[#d4a017]/10"
                      : "text-[#9ca3af] hover:text-[#e8e8e8] hover:bg-[#1a3d24]/40"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </button>
              )}
            </nav>

            {/* User section */}
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <span className="hidden sm:block text-sm font-semibold text-[#e8e8e8]">
                    {user.displayName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-900/10 hover:text-red-300 transition-all border border-red-900/20 cursor-pointer"
                    title="Sair"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === item.key
                  ? "text-[#d4a017] bg-[#d4a017]/10"
                  : "text-[#9ca3af]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "admin" ? "text-[#d4a017] bg-[#d4a017]/10" : "text-[#9ca3af]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin
            </button>
          )}
        </nav>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

        {/* ---------------------------------------------- */}
        {/* TAB: INÍCIO                                    */}
        {/* ---------------------------------------------- */}
        {activeTab === "inicio" && (
          <div className="animate-fadeIn flex flex-col gap-8">
            {/* Hero */}
            <div className="text-center py-8 sm:py-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic text-gold-gradient tracking-tight leading-tight">
                COPA DO MUNDO 2026
              </h1>
              <p className="mt-4 text-[#9ca3af] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                O bolão está aberto! Acompanhe o torneio, placares ao vivo e a classificação dos grupos.
              </p>
            </div>

            {/* Stats Grid — 4 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1a3d24]/60 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-[#9ca3af]" />
                </div>
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Total de Jogos</span>
                <span className="text-3xl font-black text-[#e8e8e8]">{totalMatches}</span>
              </div>

              <div className="stat-card p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1a3d24]/60 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#9ca3af]" />
                </div>
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Finalizados</span>
                <span className="text-3xl font-black text-[#e8e8e8]">{finishedMatches}</span>
              </div>

              <div className="stat-card p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1a3d24]/60 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#9ca3af]" />
                </div>
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Ao Vivo</span>
                <span className="text-3xl font-black text-[#e8e8e8]">{liveMatches}</span>
              </div>

              <div className="stat-card p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1a3d24]/60 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#9ca3af]" />
                </div>
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">A Seguir</span>
                <span className="text-3xl font-black text-[#e8e8e8]">{upcomingMatches}</span>
              </div>
            </div>

            {/* A SEGUIR — upcoming matches preview */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-[#e8e8e8] uppercase tracking-tight">A Seguir</h2>
                <button
                  onClick={() => setActiveTab("jogos")}
                  className="px-4 py-2 rounded-lg border border-[#1a3d24] text-sm font-semibold text-[#9ca3af] hover:text-[#e8e8e8] hover:border-[#2d8a4e] transition-all cursor-pointer"
                >
                  Ver Todos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches
                  .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED")
                  .slice(0, 4)
                  .map((match, i) => (
                    <div
                      key={match.id}
                      className="match-card p-5 animate-slideUp"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {/* Match header: stage + group + date */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#2d8a4e] uppercase tracking-wider">
                            {stageLabel(match.stage)}
                          </span>
                          {match.groupName && (
                            <>
                              <span className="text-[#1a3d24]">•</span>
                              <span className="text-[10px] font-bold text-[#9ca3af] uppercase">
                                {match.groupName.replace("_", " ")}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {formatMatchDateShort(match.utcDate)}
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="flex items-center justify-center gap-6">
                        {/* Home */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                          <div className="w-14 h-14 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1.5 overflow-hidden">
                            {match.homeTeamCrest ? (
                              <img src={match.homeTeamCrest} alt={match.homeTeamName} className="w-full h-full object-contain" />
                            ) : (
                              <User className="w-6 h-6 text-[#6b7280]" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#e8e8e8] text-center leading-tight">{match.homeTeamName}</span>
                        </div>

                        {/* VS */}
                        <span className="text-lg font-black text-[#6b7280]">VS</span>

                        {/* Away */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                          <div className="w-14 h-14 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1.5 overflow-hidden">
                            {match.awayTeamCrest ? (
                              <img src={match.awayTeamCrest} alt={match.awayTeamName} className="w-full h-full object-contain" />
                            ) : (
                              <User className="w-6 h-6 text-[#6b7280]" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#e8e8e8] text-center leading-tight">{match.awayTeamName}</span>
                        </div>
                      </div>

                      {/* Social predictions (Palpites da Família) */}
                      {socialPredictions[match.id] && (
                        <div className="mt-4 pt-4 border-t border-[#1a3d24]/50">
                          <details className="group">
                            <summary className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider cursor-pointer list-none flex items-center justify-between select-none">
                              <span>👥 Palpites da Família</span>
                              <ChevronRight className="w-3.5 h-3.5 transform transition-transform group-open:rotate-90 text-[#9ca3af]" />
                            </summary>
                            <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                              {socialPredictions[match.id].participants.map((p: any) => {
                                const isFinished = match.status === "FINISHED";
                                const hasPoints = p.prediction?.pointsAwarded !== null && p.prediction?.pointsAwarded !== undefined;
                                
                                return (
                                  <div key={p.userId} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#0a1a0f]/40 border border-[#1a3d24]/20">
                                    <span className="font-semibold text-[#e8e8e8] flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4a017]" />
                                      {p.displayName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {p.hasPredicted ? (
                                        p.prediction.predictedHome !== null && p.prediction.predictedAway !== null ? (
                                          <span className="font-bold text-[#d4a017] bg-[#d4a017]/10 px-2 py-0.5 rounded border border-[#d4a017]/20">
                                            {p.prediction.predictedHome} x {p.prediction.predictedAway}
                                            {isFinished && hasPoints && (
                                              <span className="text-[10px] text-emerald-400 ml-1.5 font-bold">
                                                (+{p.prediction.pointsAwarded} pts)
                                              </span>
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-[#9ca3af] italic bg-[#1a3d24]/20 px-2 py-0.5 rounded border border-[#1a3d24]/30 flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-[#d4a017]" /> Palpite oculto
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[10px] text-[#6b7280] italic">Não palpitou</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {matches.filter((m) => m.status === "SCHEDULED" || m.status === "TIMED").length === 0 && (
                <p className="text-sm text-[#6b7280] text-center py-8">Nenhum jogo agendado no momento.</p>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------- */}
        {/* TAB: JOGOS                                     */}
        {/* ---------------------------------------------- */}
        {activeTab === "jogos" && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            <h2 className="text-2xl font-black text-[#e8e8e8] uppercase tracking-tight">Todos os Jogos</h2>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-[#0d2214]/60 border border-[#1a3d24]">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Fase</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1a3d24] rounded-lg py-2 px-3 text-sm text-[#e8e8e8] focus:outline-none focus:border-[#2d8a4e] transition-colors"
                >
                  <option value="ALL">Todas as Fases</option>
                  {availableStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stageLabel(stage)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Buscar Seleção</label>
                <input
                  type="text"
                  placeholder="Ex: Brasil, Argentina..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1a3d24] rounded-lg py-2 px-3 text-sm text-[#e8e8e8] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2d8a4e] transition-colors"
                />
              </div>
            </div>

            {/* Matches List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((match, i) => {
                const isFinished = match.status === "FINISHED";
                const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";

                return (
                  <div
                    key={match.id}
                    className="match-card p-5 animate-slideUp"
                    style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#2d8a4e] uppercase tracking-wider">
                          {stageLabel(match.stage)}
                        </span>
                        {match.groupName && (
                          <>
                            <span className="text-[#1a3d24]">•</span>
                            <span className="text-[10px] font-bold text-[#9ca3af] uppercase">
                              {match.groupName.replace("_", " ")}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="text-[10px] font-black text-red-400 uppercase animate-pulse mr-1">● AO VIVO</span>
                        )}
                        <span className="text-[11px] text-[#9ca3af] font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatMatchDateShort(match.utcDate)}
                        </span>
                      </div>
                    </div>

                    {/* Teams + score */}
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-14 h-14 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1.5 overflow-hidden">
                          {match.homeTeamCrest ? (
                            <img src={match.homeTeamCrest} alt={match.homeTeamName} className="w-full h-full object-contain" />
                          ) : (
                            <User className="w-6 h-6 text-[#6b7280]" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#e8e8e8] text-center leading-tight">{match.homeTeamName}</span>
                      </div>

                      {isFinished || isLive ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-black ${isLive ? "text-red-400" : "text-[#e8e8e8]"}`}>
                            {match.homeScore}
                          </span>
                          <span className="text-sm font-bold text-[#6b7280]">x</span>
                          <span className={`text-2xl font-black ${isLive ? "text-red-400" : "text-[#e8e8e8]"}`}>
                            {match.awayScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-black text-[#6b7280]">VS</span>
                      )}

                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-14 h-14 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1.5 overflow-hidden">
                          {match.awayTeamCrest ? (
                            <img src={match.awayTeamCrest} alt={match.awayTeamName} className="w-full h-full object-contain" />
                          ) : (
                            <User className="w-6 h-6 text-[#6b7280]" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#e8e8e8] text-center leading-tight">{match.awayTeamName}</span>
                      </div>
                    </div>

                    {/* Social predictions (Palpites da Família) */}
                    {socialPredictions[match.id] && (
                      <div className="mt-4 pt-4 border-t border-[#1a3d24]/50">
                        <details className="group">
                          <summary className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider cursor-pointer list-none flex items-center justify-between select-none">
                            <span>👥 Palpites da Família</span>
                            <ChevronRight className="w-3.5 h-3.5 transform transition-transform group-open:rotate-90 text-[#9ca3af]" />
                          </summary>
                          <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                            {socialPredictions[match.id].participants.map((p: any) => {
                              const isFinished = match.status === "FINISHED";
                              const hasPoints = p.prediction?.pointsAwarded !== null && p.prediction?.pointsAwarded !== undefined;
                              
                              return (
                                <div key={p.userId} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#0a1a0f]/40 border border-[#1a3d24]/20">
                                  <span className="font-semibold text-[#e8e8e8] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4a017]" />
                                    {p.displayName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {p.hasPredicted ? (
                                      p.prediction.predictedHome !== null && p.prediction.predictedAway !== null ? (
                                        <span className="font-bold text-[#d4a017] bg-[#d4a017]/10 px-2 py-0.5 rounded border border-[#d4a017]/20">
                                          {p.prediction.predictedHome} x {p.prediction.predictedAway}
                                          {isFinished && hasPoints && (
                                            <span className="text-[10px] text-emerald-400 ml-1.5 font-bold">
                                              (+{p.prediction.pointsAwarded} pts)
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-[#9ca3af] italic bg-[#1a3d24]/20 px-2 py-0.5 rounded border border-[#1a3d24]/30 flex items-center gap-1">
                                          <Lock className="w-3 h-3 text-[#d4a017]" /> Palpite oculto
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[10px] text-[#6b7280] italic">Não palpitou</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredMatches.length === 0 && (
              <div className="text-center py-16 text-[#6b7280]">Nenhum jogo encontrado para os filtros selecionados.</div>
            )}
          </div>
        )}

        {/* ---------------------------------------------- */}
        {/* TAB: RANKING                                   */}
        {/* ---------------------------------------------- */}
        {activeTab === "ranking" && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            <h2 className="text-2xl font-black text-[#e8e8e8] uppercase tracking-tight">Classificação</h2>

            <div className="card-glass rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1a3d24] text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                    <th className="py-4 px-5 w-16">Pos</th>
                    <th className="py-4 px-5">Participante</th>
                    <th className="py-4 px-5 text-right">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3d24]/50">
                  {leaderboard.map((row, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          row.isCurrentUser
                            ? "bg-[#d4a017]/5 border-l-2 border-l-[#d4a017]"
                            : "hover:bg-[#0d2214]/40"
                        }`}
                      >
                        <td className="py-4 px-5 font-extrabold text-sm flex items-center gap-1.5">
                          {rank === 1 ? (
                            <Medal className="w-5 h-5 text-[#d4a017]" />
                          ) : rank === 2 ? (
                            <Medal className="w-5 h-5 text-[#9ca3af]" />
                          ) : rank === 3 ? (
                            <Medal className="w-5 h-5 text-[#cd7f32]" />
                          ) : (
                            <span className="text-[#6b7280] w-5 text-center">{rank}º</span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-semibold text-sm text-[#e8e8e8]">
                          <button
                            onClick={() => handleOpenProfile(row.id)}
                            className="hover:text-[#d4a017] hover:underline transition-colors font-semibold text-left cursor-pointer flex items-center gap-1.5"
                          >
                            {row.displayName}
                          </button>
                          {row.isCurrentUser && (
                            <span className="ml-2 text-[10px] font-bold text-[#d4a017] bg-[#d4a017]/10 border border-[#d4a017]/20 px-2 py-0.5 rounded-full inline-block">
                              Você
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-black text-sm text-right text-[#e8e8e8]">{row.totalPoints} pts</td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-[#6b7280]">
                        Nenhum participante pontuou ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------- */}
        {/* TAB: PALPITES                                  */}
        {/* ---------------------------------------------- */}
        {activeTab === "palpites" && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#e8e8e8] uppercase tracking-tight">Seus Palpites</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#d4a017] bg-[#d4a017]/10 border border-[#d4a017]/20 px-3 py-1.5 rounded-lg">
                  {userTotalPoints} pts • #{userRank || "-"}
                </span>
              </div>
            </div>

            {/* Scoring Rules */}
            <div className="card-glass rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#e8e8e8] mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#d4a017]" />
                Regras de Pontuação
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a1a0f] border border-[#1a3d24]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-[#9ca3af]">Exato</span>
                  <span className="text-xs font-black text-emerald-400 ml-auto">+10</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a1a0f] border border-[#1a3d24]">
                  <div className="w-2 h-2 rounded-full bg-lime-500" />
                  <span className="text-xs text-[#9ca3af]">Resultado+Saldo</span>
                  <span className="text-xs font-black text-lime-400 ml-auto">+7</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a1a0f] border border-[#1a3d24]">
                  <div className="w-2 h-2 rounded-full bg-[#d4a017]" />
                  <span className="text-xs text-[#9ca3af]">Vencedor</span>
                  <span className="text-xs font-black text-[#d4a017] ml-auto">+5</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a1a0f] border border-[#1a3d24]">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-[#9ca3af]">Errou</span>
                  <span className="text-xs font-black text-red-400 ml-auto">0</span>
                </div>
              </div>
            </div>

            {/* Matches with prediction forms */}
            <div className="flex flex-col gap-4">
              {matches.map((match, i) => {
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
                    className="match-card p-5 flex flex-col items-center gap-5 animate-slideUp"
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <div className="w-full flex flex-col lg:flex-row items-center gap-5">
                      {/* Match info */}
                      <div className="flex-1 w-full">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-[#2d8a4e] uppercase tracking-wider">
                          {stageLabel(match.stage)}
                        </span>
                        {match.groupName && (
                          <>
                            <span className="text-[#1a3d24]">•</span>
                            <span className="text-[10px] font-bold text-[#9ca3af] uppercase">
                              {match.groupName.replace("_", " ")}
                            </span>
                          </>
                        )}
                        <span className="text-[10px] text-[#6b7280] ml-auto">{formatMatchDateShort(match.utcDate)}</span>
                      </div>

                      {/* Teams row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 flex-1 justify-end">
                          <span className="text-sm font-bold text-[#e8e8e8] text-right">{match.homeTeamName}</span>
                          <div className="w-10 h-10 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1 overflow-hidden shrink-0">
                            {match.homeTeamCrest ? (
                              <img src={match.homeTeamCrest} alt={match.homeTeamName} className="w-full h-full object-contain" />
                            ) : (
                              <User className="w-5 h-5 text-[#6b7280]" />
                            )}
                          </div>
                        </div>

                        {/* Score or VS */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          {match.status === "FINISHED" ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0a1a0f] border border-[#1a3d24]">
                              <span className="text-lg font-black text-[#e8e8e8]">{match.homeScore}</span>
                              <span className="text-xs font-bold text-[#6b7280]">x</span>
                              <span className="text-lg font-black text-[#e8e8e8]">{match.awayScore}</span>
                            </div>
                          ) : match.status === "IN_PLAY" || match.status === "PAUSED" ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/20 border border-red-900/40">
                                <span className="text-lg font-black text-red-400">{match.homeScore}</span>
                                <span className="text-xs font-bold text-red-500">x</span>
                                <span className="text-lg font-black text-red-400">{match.awayScore}</span>
                              </div>
                              <span className="text-[9px] font-black text-red-500 uppercase animate-pulse mt-1">Ao Vivo</span>
                            </div>
                          ) : (
                            <span className="text-sm font-black text-[#6b7280]">VS</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] flex items-center justify-center p-1 overflow-hidden shrink-0">
                            {match.awayTeamCrest ? (
                              <img src={match.awayTeamCrest} alt={match.awayTeamName} className="w-full h-full object-contain" />
                            ) : (
                              <User className="w-5 h-5 text-[#6b7280]" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#e8e8e8]">{match.awayTeamName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prediction form */}
                    <div className="w-full lg:w-auto flex flex-col items-center p-4 rounded-xl bg-[#0a1a0f]/70 border border-[#1a3d24] min-w-[220px]">
                      <div className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                        {isLocked && <Lock className="w-3 h-3" />}
                        Seu Palpite
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Home score */}
                        <div className="flex items-center gap-1.5">
                          {!isLocked && (
                            <button
                              onClick={() => adjustScore(match.id, "home", -1)}
                              className="w-7 h-7 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center hover:bg-[#1a3d24] transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-[#9ca3af]" />
                            </button>
                          )}
                          <div className="w-10 h-10 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center text-base font-bold text-[#e8e8e8]">
                            {isLocked ? (savedPred?.predictedHome ?? "-") : localPred.home}
                          </div>
                          {!isLocked && (
                            <button
                              onClick={() => adjustScore(match.id, "home", 1)}
                              className="w-7 h-7 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center hover:bg-[#1a3d24] transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-[#9ca3af]" />
                            </button>
                          )}
                        </div>

                        <span className="text-[#6b7280] font-black text-sm">X</span>

                        {/* Away score */}
                        <div className="flex items-center gap-1.5">
                          {!isLocked && (
                            <button
                              onClick={() => adjustScore(match.id, "away", -1)}
                              className="w-7 h-7 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center hover:bg-[#1a3d24] transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-[#9ca3af]" />
                            </button>
                          )}
                          <div className="w-10 h-10 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center text-base font-bold text-[#e8e8e8]">
                            {isLocked ? (savedPred?.predictedAway ?? "-") : localPred.away}
                          </div>
                          {!isLocked && (
                            <button
                              onClick={() => adjustScore(match.id, "away", 1)}
                              className="w-7 h-7 rounded-lg bg-[#0d2214] border border-[#1a3d24] flex items-center justify-center hover:bg-[#1a3d24] transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-[#9ca3af]" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Save action / Points info */}
                      <div className="w-full mt-3">
                        {isLocked ? (
                          savedPred ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-semibold text-[#6b7280]">Palpite Encerrado</span>
                              {savedPred.pointsAwarded !== null && (
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                    savedPred.pointsAwarded === 10
                                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40"
                                      : savedPred.pointsAwarded === 7
                                      ? "bg-lime-950/30 text-lime-400 border-lime-900/40"
                                      : savedPred.pointsAwarded === 5
                                      ? "bg-[#d4a017]/10 text-[#d4a017] border-[#d4a017]/20"
                                      : "bg-red-950/30 text-red-400 border-red-900/40"
                                  }`}
                                >
                                  +{savedPred.pointsAwarded} pts
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#6b7280] font-semibold flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" /> Sem palpite
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => handleSavePrediction(match.id)}
                            disabled={
                              isSaving ||
                              (savedPred &&
                                savedPred.predictedHome === localPred.home &&
                                savedPred.predictedAway === localPred.away)
                            }
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              savedPred &&
                              savedPred.predictedHome === localPred.home &&
                              savedPred.predictedAway === localPred.away
                                ? "bg-[#0d2214] border border-[#1a3d24] text-[#6b7280] cursor-not-allowed"
                                : "bg-[#2d8a4e] hover:bg-[#3da562] text-white shadow-lg shadow-[#2d8a4e]/20"
                            }`}
                          >
                            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {savedPred ? "Atualizar" : "Salvar"}
                          </button>
                        )}
                      </div>

                      {feedback && (
                        <div
                          className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${
                            feedback.type === "success" ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {feedback.type === "success" ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {feedback.text}
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Social predictions (Palpites da Família) */}
                    {socialPredictions[match.id] && (
                      <div className="w-full mt-2 pt-4 border-t border-[#1a3d24]/50">
                        <details className="group">
                          <summary className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider cursor-pointer list-none flex items-center justify-between select-none">
                            <span>👥 Palpites da Família</span>
                            <ChevronRight className="w-3.5 h-3.5 transform transition-transform group-open:rotate-90 text-[#9ca3af]" />
                          </summary>
                          <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                            {socialPredictions[match.id].participants.map((p: any) => {
                              const isFinished = match.status === "FINISHED";
                              const hasPoints = p.prediction?.pointsAwarded !== null && p.prediction?.pointsAwarded !== undefined;
                              
                              return (
                                <div key={p.userId} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#0a1a0f]/40 border border-[#1a3d24]/20">
                                  <span className="font-semibold text-[#e8e8e8] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4a017]" />
                                    {p.displayName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {p.hasPredicted ? (
                                      p.prediction.predictedHome !== null && p.prediction.predictedAway !== null ? (
                                        <span className="font-bold text-[#d4a017] bg-[#d4a017]/10 px-2 py-0.5 rounded border border-[#d4a017]/20">
                                          {p.prediction.predictedHome} x {p.prediction.predictedAway}
                                          {isFinished && hasPoints && (
                                            <span className="text-[10px] text-emerald-400 ml-1.5 font-bold">
                                              (+{p.prediction.pointsAwarded} pts)
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-[#9ca3af] italic bg-[#1a3d24]/20 px-2 py-0.5 rounded border border-[#1a3d24]/30 flex items-center gap-1">
                                          <Lock className="w-3 h-3 text-[#d4a017]" /> Palpite oculto
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[10px] text-[#6b7280] italic">Não palpitou</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------- */}
        {/* TAB: ADMIN                                     */}
        {/* ---------------------------------------------- */}
        {activeTab === "admin" && isAdmin && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            <h2 className="text-2xl font-black text-[#e8e8e8] uppercase tracking-tight">Painel Admin</h2>

            {/* Sub-Navigation for Admin Panel */}
            <div className="flex border-b border-[#1a3d24] mb-2">
              <button
                onClick={() => setActiveAdminTab("sync")}
                className={`px-4 py-2 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeAdminTab === "sync"
                    ? "border-[#d4a017] text-[#d4a017]"
                    : "border-transparent text-[#9ca3af] hover:text-[#e8e8e8]"
                }`}
              >
                <Settings className="w-4 h-4" />
                Sincronização
              </button>
              <button
                onClick={() => setActiveAdminTab("users")}
                className={`px-4 py-2 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeAdminTab === "users"
                    ? "border-[#d4a017] text-[#d4a017]"
                    : "border-transparent text-[#9ca3af] hover:text-[#e8e8e8]"
                }`}
              >
                <Users className="w-4 h-4" />
                Participantes
              </button>
              <button
                onClick={() => setActiveAdminTab("stats")}
                className={`px-4 py-2 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeAdminTab === "stats"
                    ? "border-[#d4a017] text-[#d4a017]"
                    : "border-transparent text-[#9ca3af] hover:text-[#e8e8e8]"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Estatísticas
              </button>
            </div>

            {/* Sub-tab: Sync */}
            {activeAdminTab === "sync" && (
              <div className="card-glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#e8e8e8] mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#d4a017]" />
                  Sincronização de Dados
                </h3>
                <p className="text-sm text-[#9ca3af] mb-6 leading-relaxed">
                  Força a sincronização com a API do <strong className="text-[#e8e8e8]">football-data.org</strong>, ignorando o cache de 60s e
                  recalculando as pontuações.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handleForceSync}
                    disabled={syncing}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#d4a017] hover:bg-[#e6b422] text-[#0a1a0f] font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d4a017]/20 cursor-pointer disabled:opacity-50"
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
                    <div
                      className={`p-3 rounded-lg border flex items-center gap-2 ${
                        syncMessage.type === "success"
                          ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                          : "bg-red-950/20 border-red-900/50 text-red-400"
                      }`}
                    >
                      {syncMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span className="text-xs font-bold">{syncMessage.text}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab: Users (Participantes) */}
            {activeAdminTab === "users" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#e8e8e8] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#d4a017]" />
                    Participantes Cadastrados
                  </h3>
                  <button
                    onClick={fetchAdminUsers}
                    className="text-xs font-bold text-[#d4a017] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Atualizar Lista
                  </button>
                </div>

                {loadingAdminUsers ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#d4a017]" />
                  </div>
                ) : adminUsers.length === 0 ? (
                  <p className="text-sm text-[#9ca3af] py-4">Nenhum participante cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#1a3d24]">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#0f2a18] text-[#9ca3af] font-bold border-b border-[#1a3d24]">
                          <th className="p-4">Nome</th>
                          <th className="p-4">Palpites</th>
                          <th className="p-4">Pontuação</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a3d24]/50">
                        {adminUsers.map((u) => {
                          const isSelf = u.clerkUserId === user?.clerkUserId;
                          return (
                            <tr key={u.id} className="hover:bg-[#0d2214]/40 transition-colors">
                              <td className="p-4 font-bold text-[#e8e8e8] flex items-center gap-2">
                                {u.displayName}
                                {isSelf && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-[#d4a017]/10 text-[#d4a017] border border-[#d4a017]/20 font-normal">
                                    Você
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-[#9ca3af]">
                                {u.totalPredictions} / {matches.length}
                              </td>
                              <td className="p-4 font-bold text-[#d4a017]">{u.totalPoints} pts</td>
                              <td className="p-4 text-right">
                                {!isSelf ? (
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={deletingUserId === u.id}
                                    className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                  >
                                    {deletingUserId === u.id ? "Removendo..." : "Remover"}
                                  </button>
                                ) : (
                                  <span className="text-[#6b7280] text-xs font-bold">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Stats (Estatísticas) */}
            {activeAdminTab === "stats" && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#e8e8e8] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#d4a017]" />
                    Estatísticas do Bolão
                  </h3>
                  <button
                    onClick={fetchAdminStats}
                    className="text-xs font-bold text-[#d4a017] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Atualizar Estatísticas
                  </button>
                </div>

                {loadingAdminStats ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#d4a017]" />
                  </div>
                ) : !adminStats ? (
                  <p className="text-sm text-[#9ca3af] py-4">Nenhuma estatística disponível.</p>
                ) : (
                  <>
                    {/* Overview Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="card-glass p-5 rounded-2xl border border-[#1a3d24] flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Total de Palpites</span>
                        <span className="text-3xl font-black text-[#e8e8e8] mt-2">{adminStats.overview.totalPredictions}</span>
                      </div>
                      <div className="card-glass p-5 rounded-2xl border border-[#1a3d24] flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Participantes</span>
                        <span className="text-3xl font-black text-[#e8e8e8] mt-2">{adminStats.overview.totalParticipants}</span>
                      </div>
                      <div className="card-glass p-5 rounded-2xl border border-[#1a3d24] flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Pontos Distribuídos</span>
                        <span className="text-3xl font-black text-[#d4a017] mt-2">{adminStats.overview.totalPointsDistributed} pts</span>
                      </div>
                      <div className="card-glass p-5 rounded-2xl border border-[#1a3d24] flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">Jogos c/ 100% Palpites</span>
                        <span className="text-3xl font-black text-[#e8e8e8] mt-2">{adminStats.overview.gamesWithFullParticipation}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Points Distribution */}
                      <div className="card-glass p-6 rounded-2xl border border-[#1a3d24] flex flex-col justify-between gap-4">
                        <h4 className="text-sm font-black text-[#e8e8e8] uppercase tracking-wider">Distribuição de Pontuações</h4>
                        <div className="flex flex-col gap-4">
                          {/* 10 pts */}
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-emerald-400">Placar Exato (10 pts)</span>
                              <span className="text-[#e8e8e8]">{adminStats.pointsDistribution.exactScore} ({adminStats.overview.totalPredictions > 0 ? Math.round((adminStats.pointsDistribution.exactScore / adminStats.overview.totalPredictions) * 100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-[#0a1a0f] h-2.5 rounded-full overflow-hidden border border-[#1a3d24]">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    adminStats.overview.totalPredictions > 0
                                      ? Math.round((adminStats.pointsDistribution.exactScore / adminStats.overview.totalPredictions) * 100)
                                      : 0
                                  }%`
                                }}
                              />
                            </div>
                          </div>

                          {/* 7 pts */}
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-cyan-400">Resultado e Saldo (7 pts)</span>
                              <span className="text-[#e8e8e8]">{adminStats.pointsDistribution.resultAndGD} ({adminStats.overview.totalPredictions > 0 ? Math.round((adminStats.pointsDistribution.resultAndGD / adminStats.overview.totalPredictions) * 100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-[#0a1a0f] h-2.5 rounded-full overflow-hidden border border-[#1a3d24]">
                              <div
                                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    adminStats.overview.totalPredictions > 0
                                      ? Math.round((adminStats.pointsDistribution.resultAndGD / adminStats.overview.totalPredictions) * 100)
                                      : 0
                                  }%`
                                }}
                              />
                            </div>
                          </div>

                          {/* 5 pts */}
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-[#d4a017]">Apenas Resultado (5 pts)</span>
                              <span className="text-[#e8e8e8]">{adminStats.pointsDistribution.resultOnly} ({adminStats.overview.totalPredictions > 0 ? Math.round((adminStats.pointsDistribution.resultOnly / adminStats.overview.totalPredictions) * 100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-[#0a1a0f] h-2.5 rounded-full overflow-hidden border border-[#1a3d24]">
                              <div
                                className="bg-[#d4a017] h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    adminStats.overview.totalPredictions > 0
                                      ? Math.round((adminStats.pointsDistribution.resultOnly / adminStats.overview.totalPredictions) * 100)
                                      : 0
                                  }%`
                                }}
                              />
                            </div>
                          </div>

                          {/* 0 pts */}
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-red-400">Erros (0 pts)</span>
                              <span className="text-[#e8e8e8]">{adminStats.pointsDistribution.wrong} ({adminStats.overview.totalPredictions > 0 ? Math.round((adminStats.pointsDistribution.wrong / adminStats.overview.totalPredictions) * 100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-[#0a1a0f] h-2.5 rounded-full overflow-hidden border border-[#1a3d24]">
                              <div
                                className="bg-red-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    adminStats.overview.totalPredictions > 0
                                      ? Math.round((adminStats.pointsDistribution.wrong / adminStats.overview.totalPredictions) * 100)
                                      : 0
                                  }%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hot and Cold Games */}
                      <div className="card-glass p-6 rounded-2xl border border-[#1a3d24] flex flex-col justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-2">
                            🔥 Jogos Mais Palpitados
                          </h4>
                          <ul className="flex flex-col gap-1.5">
                            {adminStats.topAndBottomGames.top.map((m: any, idx: number) => (
                              <li key={idx} className="flex justify-between text-xs font-semibold py-1.5 border-b border-[#1a3d24]/30 last:border-0 text-[#e8e8e8]">
                                <span>{m.homeTeam} vs {m.awayTeam}</span>
                                <span className="text-emerald-400 font-bold">{m.count} palpites</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">
                            ❄️ Jogos Menos Palpitados
                          </h4>
                          <ul className="flex flex-col gap-1.5">
                            {adminStats.topAndBottomGames.bottom.map((m: any, idx: number) => (
                              <li key={idx} className="flex justify-between text-xs font-semibold py-1.5 border-b border-[#1a3d24]/30 last:border-0 text-[#e8e8e8]">
                                <span>{m.homeTeam} vs {m.awayTeam}</span>
                                <span className="text-cyan-400 font-bold">{m.count} palpites</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Participant Engagement */}
                    <div className="card-glass p-6 rounded-2xl border border-[#1a3d24]">
                      <h4 className="text-sm font-black text-[#e8e8e8] uppercase tracking-wider mb-4">Engajamento por Participante</h4>
                      <div className="overflow-x-auto rounded-xl border border-[#1a3d24]/70">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0f2a18] text-[#9ca3af] font-bold border-b border-[#1a3d24]">
                              <th className="p-3">Nome</th>
                              <th className="p-3 text-center">Palpites Feitos</th>
                              <th className="p-3 text-center">Cobertura</th>
                              <th className="p-3 text-center">Exatos (10 pts)</th>
                              <th className="p-3 text-center">Média Pts/Palpite</th>
                              <th className="p-3 text-right">Pontos Totais</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1a3d24]/50">
                            {adminStats.participantEngagement.map((p: any) => (
                              <tr key={p.userId} className="hover:bg-[#0d2214]/40 transition-colors">
                                <td className="p-3 font-bold text-[#e8e8e8]">{p.displayName}</td>
                                <td className="p-3 text-center text-[#9ca3af]">{p.predictionCount} / {matches.length}</td>
                                <td className="p-3 text-center font-semibold text-[#e8e8e8]">{p.coveragePercent}%</td>
                                <td className="p-3 text-center text-emerald-400 font-bold">{p.exactScores}</td>
                                <td className="p-3 text-center text-[#9ca3af]">{p.avgPointsPerPrediction} pts</td>
                                <td className="p-3 text-right font-black text-[#d4a017]">{p.totalPoints} pts</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* MODAL: PERFIL DO USUÁRIO */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="card-glass border border-[#1a3d24] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[#1a3d24] flex items-center justify-between bg-[#0f2a18]/80">
                <div>
                  <h3 className="text-xl font-black text-[#e8e8e8] flex items-center gap-2">
                    <User className="w-6 h-6 text-[#d4a017]" />
                    {loadingProfile ? "Carregando..." : `Palpites de ${selectedProfileUser?.displayName}`}
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Rede Social do Bolão • Copa do Mundo 2026
                  </p>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0a1a0f] border border-[#1a3d24] text-[#9ca3af] hover:text-[#e8e8e8] hover:bg-[#1a3d24] transition-all cursor-pointer font-bold text-xs"
                >
                  Fechar
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#d4a017]" />
                    <span className="text-sm font-semibold text-[#9ca3af]">Buscando palpites da família...</span>
                  </div>
                ) : !profilePredictions || profilePredictions.length === 0 ? (
                  <p className="text-center py-12 text-sm text-[#9ca3af] italic">Nenhum palpite registrado por este participante.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {profilePredictions.map((p) => {
                      const isFinished = p.status === "FINISHED";
                      const isLive = p.status === "IN_PLAY" || p.status === "PAUSED";
                      const hasPoints = p.pointsAwarded !== null && p.pointsAwarded !== undefined;

                      return (
                        <div
                          key={p.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0d2214]/60 border border-[#1a3d24]/50 hover:bg-[#133220]/60 transition-all"
                        >
                          {/* Match Details */}
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[9px] font-black text-[#2d8a4e] uppercase tracking-wider">
                              {stageLabel(p.stage)}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Home Crest */}
                              <div className="w-5 h-5 flex items-center justify-center">
                                {p.homeTeamCrest ? (
                                  <img src={p.homeTeamCrest} alt={p.homeTeamName} className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-[#e8e8e8]">{p.homeTeamName}</span>
                              <span className="text-[10px] font-bold text-[#6b7280]">vs</span>
                              <span className="text-xs font-bold text-[#e8e8e8]">{p.awayTeamName}</span>
                              {/* Away Crest */}
                              <div className="w-5 h-5 flex items-center justify-center">
                                {p.awayTeamCrest ? (
                                  <img src={p.awayTeamCrest} alt={p.awayTeamName} className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
                                )}
                              </div>
                            </div>
                            {/* Real Match Score if finished/live */}
                            {(isFinished || isLive) && (
                              <span className="text-[10px] font-bold text-[#9ca3af] flex items-center gap-1">
                                Placar Oficial: <strong className={isLive ? "text-red-400 animate-pulse" : "text-[#e8e8e8]"}>{p.homeScore} x {p.awayScore}</strong>
                                {isLive && <span className="text-[8px] bg-red-950 border border-red-900 px-1 py-0.5 rounded text-red-400 font-bold uppercase animate-pulse">Ao Vivo</span>}
                              </span>
                            )}
                          </div>

                          {/* Prediction info & Points */}
                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                            {p.isOculto ? (
                              <span className="text-[10px] text-[#9ca3af] italic bg-[#1a3d24]/20 px-2.5 py-1 rounded border border-[#1a3d24]/30 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-[#d4a017]" /> Palpite oculto
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#d4a017] bg-[#d4a017]/10 px-2.5 py-1 rounded border border-[#d4a017]/25 flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-[#9ca3af] mr-1 uppercase">Palpite:</span>
                                  {p.predictedHome} x {p.predictedAway}
                                </span>

                                {isFinished && hasPoints && (
                                  <span
                                    className={`text-[10px] font-black px-2.5 py-1 rounded border ${
                                      p.pointsAwarded === 10
                                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
                                        : p.pointsAwarded === 7
                                        ? "bg-cyan-950/40 text-cyan-400 border-cyan-900/40"
                                        : p.pointsAwarded === 5
                                        ? "bg-[#d4a017]/10 text-[#d4a017] border-[#d4a017]/20"
                                        : "bg-red-950/40 text-red-400 border-red-900/40"
                                    }`}
                                  >
                                    +{p.pointsAwarded} pts
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-[#1a3d24] text-center text-xs text-[#6b7280] font-semibold mt-auto">
        Desenvolvido com carinho para o Bolão da Família Copa 2026.
      </footer>
    </div>
  );
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      } else {
        if (!name.trim()) throw new Error("Por favor, preencha o seu nome.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Conta criada com sucesso! Você já pode fazer login ou confirmar o e-mail.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ocorreu um erro." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1a0f] text-[#e8e8e8] px-4">
      <div className="w-full max-w-md bg-[#0d2214] border border-[#1a3d24] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="p-3 bg-[#d4a017]/10 rounded-full border border-[#d4a017]/25 text-[#d4a017]">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#d4a017] tracking-tight text-center">
            BOLÃO DA FAMÍLIA COPA 2026
          </h1>
          <p className="text-sm text-[#9ca3af] text-center">
            {isLogin
              ? "Entre para salvar seus palpites e ver a classificação"
              : "Crie sua conta para participar do bolão"}
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg border text-sm mb-4 flex items-center gap-2 ${
              message.type === "success"
                ? "bg-[#1a3d24]/20 border-[#1a3d24] text-green-400"
                : "bg-red-950/20 border-red-900/40 text-red-400"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                Seu Nome (como aparecerá no ranking)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tio João, Luisa, Marcelo..."
                required
                className="w-full bg-[#08150c] border border-[#1a3d24] focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] rounded-lg px-4 py-2.5 text-sm outline-none text-[#e8e8e8] placeholder-[#4b5563] transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              className="w-full bg-[#08150c] border border-[#1a3d24] focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] rounded-lg px-4 py-2.5 text-sm outline-none text-[#e8e8e8] placeholder-[#4b5563] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#08150c] border border-[#1a3d24] focus:border-[#d4a017] focus:ring-1 focus:ring-[#d4a017] rounded-lg px-4 py-2.5 text-sm outline-none text-[#e8e8e8] placeholder-[#4b5563] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d4a017] hover:bg-[#b8860b] text-[#0a1a0f] disabled:bg-gray-600 disabled:text-gray-300 font-bold py-3 px-4 rounded-lg text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-[#d4a017]/10"
          >
            {loading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#1a3d24] text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(null);
            }}
            className="text-sm text-[#9ca3af] hover:text-[#d4a017] transition-all cursor-pointer font-medium"
          >
            {isLogin ? "Não tem conta? Crie uma aqui" : "Já tem conta? Faça login"}
          </button>
        </div>
      </div>
    </div>
  );
}
