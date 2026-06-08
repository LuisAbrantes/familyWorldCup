"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  Shield,
  Coins,
  ArrowRight,
  Lock,
  RefreshCw,
  BarChart3,
  Check,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Como os resultados dos jogos são atualizados?",
      a: "Tudo é 100% automático! Nosso sistema se integra diretamente com a API oficial do football-data.org. Assim que uma partida termina, os placares são atualizados e os pontos de todos os participantes são recalculados na mesma hora.",
    },
    {
      q: "Como funciona a liberação da sala após a compra?",
      a: "Ao clicar em 'Criar Meu Bolão', você será redirecionado para a página de checkout seguro da Stripe. Após o pagamento, nosso webhook identifica seu e-mail de compra e libera imediatamente a permissão para criar o seu grupo. Basta logar com o mesmo e-mail no site!",
    },
    {
      q: "Posso convidar mais de 15 pessoas?",
      a: "O limite padrão por sala é de 15 participantes. Caso precise de mais vagas para um bolão corporativo ou um grupo maior, compre a sala normalmente e fale com a gente no WhatsApp para negociar um upgrade de vagas personalizado por um valor amigável.",
    },
    {
      q: "Consigo participar de mais de um grupo com a mesma conta?",
      a: "Sim! Você pode criar sua conta e entrar em múltiplos grupos utilizando códigos de convite diferentes. No topo do painel, um seletor permite alternar instantaneamente entre os seus grupos.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1a0f] text-[#e8e8e8] font-sans overflow-x-hidden selection:bg-[#d4a017] selection:text-[#0a1a0f]">
      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-[#1a3d24]/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d2214]/80 backdrop-blur-md border-b border-[#1a3d24]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <Trophy className="w-8 h-8 text-[#d4a017]" />
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-[#d4a017]">BOLÃO</span>
                <span className="text-white ml-1.5">2026</span>
              </span>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#e8e8e8] hover:text-[#d4a017] hover:bg-[#1a3d24]/40 transition-all duration-200"
              >
                Entrar
              </Link>
              <Link
                href="/dashboard"
                className="bg-[#2d8a4e] hover:bg-[#3da562] text-white px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 shadow-lg shadow-[#2d8a4e]/20"
              >
                Acessar Painel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d4a017]/10 border border-[#d4a017]/25 text-xs font-semibold text-[#d4a017] mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Copa do Mundo de 2026
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic text-gold-gradient tracking-tight leading-tight max-w-4xl uppercase">
          O melhor bolão da copa com a sua galera
        </h1>
        <p className="mt-6 text-[#9ca3af] text-base sm:text-xl max-w-2xl leading-relaxed">
          Crie grupos privados, convide seus amigos, dê palpites de placar e acompanhe a classificação em tempo real de forma 100% automatizada.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a
            href="https://buy.stripe.com/eVq4gBgHJ4u63XE5RD28802"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#d4a017] to-[#b8860b] hover:from-[#e6b422] hover:to-[#d4a017] text-[#0a1a0f] font-black text-sm uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-[#d4a017]/20 group cursor-pointer"
          >
            Criar Nosso Bolão
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 bg-[#1a3d24]/60 hover:bg-[#1a3d24] border border-[#2d5c38] text-[#e8e8e8] font-bold text-sm uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Acessar Meus Grupos
          </Link>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16 w-full max-w-5xl rounded-2xl border border-[#1a3d24] bg-[#0d2214]/60 p-2 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0f] via-transparent to-transparent z-10" />
          <div className="rounded-xl overflow-hidden border border-[#1a3d24]/40 bg-[#0a1a0f] p-4 sm:p-6 flex flex-col gap-6 text-left">
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-[#1a3d24]/40 pb-4">
              <span className="text-xs font-black text-[#d4a017] uppercase tracking-wider">⚽ Copa 2026 — Grupo: Galera da Firma</span>
              <span className="text-xs font-bold text-[#9ca3af] bg-[#1a3d24]/80 px-2.5 py-1 rounded">12/15 Integrantes</span>
            </div>
            {/* Mock Match Row */}
            <div className="grid md:grid-cols-3 gap-4 items-center p-4 rounded-xl bg-[#0d2214]/40 border border-[#1a3d24]/30">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#2d8a4e] uppercase bg-[#1a3d24] px-2 py-0.5 rounded">Fase de Grupos</span>
                <span className="text-xs text-[#9ca3af]">Hoje, 17:00</span>
              </div>
              <div className="flex items-center justify-center gap-4 my-2 md:my-0">
                <span className="font-bold text-sm text-[#e8e8e8]">Brasil</span>
                <span className="text-lg font-black text-[#d4a017] bg-[#d4a017]/10 border border-[#d4a017]/20 px-3 py-0.5 rounded">3 x 1</span>
                <span className="font-bold text-sm text-[#e8e8e8]">Alemanha</span>
              </div>
              <div className="flex justify-end gap-1.5">
                <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2 py-1 rounded font-bold">Seu palpite: 3 x 1 (+10 pts)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 bg-[#08150c] border-y border-[#1a3d24]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#e8e8e8] uppercase italic tracking-tight">
              Recursos Premium do Bolão
            </h2>
            <p className="mt-3 text-[#9ca3af] text-sm sm:text-base">
              Desenvolvemos a melhor experiência para você competir e vibrar a cada gol da Copa do Mundo.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-glass p-6 rounded-2xl border border-[#1a3d24]/50 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a017]/10 border border-[#d4a017]/25 flex items-center justify-center text-[#d4a017]">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#e8e8e8]">Placares 100% Automáticos</h3>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Resultados atualizados automaticamente. Acabou a partida, a pontuação é calculada e o ranking atualiza na hora.
              </p>
            </div>

            <div className="card-glass p-6 rounded-2xl border border-[#1a3d24]/50 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a017]/10 border border-[#d4a017]/25 flex items-center justify-center text-[#d4a017]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#e8e8e8]">Proteção Anti-Spoiler</h3>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Você só consegue ver o palpite dos outros participantes em jogos pendentes após ter salvado o seu próprio palpite.
              </p>
            </div>

            <div className="card-glass p-6 rounded-2xl border border-[#1a3d24]/50 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a017]/10 border border-[#d4a017]/25 flex items-center justify-center text-[#d4a017]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#e8e8e8]">Dashboard de Estatísticas</h3>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Métricas completas de engajamento do grupo, jogos mais quentes, distribuição de pontos e muito mais.
              </p>
            </div>

            <div className="card-glass p-6 rounded-2xl border border-[#1a3d24]/50 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a017]/10 border border-[#d4a017]/25 flex items-center justify-center text-[#d4a017]">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#e8e8e8]">Regras Claras de Pontuação</h3>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Placar exato (10 pts), resultado com mesmo saldo (7 pts), vencedor da partida (5 pts) ou erro (0 pts).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#e8e8e8] uppercase italic tracking-tight">
            Como Funciona?
          </h2>
          <p className="mt-3 text-[#9ca3af] text-sm sm:text-base">
            Do pagamento à disputa do troféu, tudo é feito de forma simples e rápida.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          <div className="flex flex-col gap-4 relative">
            <span className="text-5xl font-black text-[#1a3d24]">01</span>
            <h3 className="font-extrabold text-lg text-[#e8e8e8]">Adquira a Sala</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Pague a taxa única de R$ 15,00 de forma 100% segura através do checkout da Stripe.
            </p>
          </div>
          <div className="flex flex-col gap-4 relative">
            <span className="text-5xl font-black text-[#1a3d24]">02</span>
            <h3 className="font-extrabold text-lg text-[#e8e8e8]">Crie o Grupo</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Logue no site com o mesmo e-mail e crie seu grupo em segundos. Um código de 6 letras será gerado.
            </p>
          </div>
          <div className="flex flex-col gap-4 relative">
            <span className="text-5xl font-black text-[#1a3d24]">03</span>
            <h3 className="font-extrabold text-lg text-[#e8e8e8]">Convide Seus Amigos</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Envie o código de convite para os participantes. Eles entram na sua sala digitando o código na aba Grupos.
            </p>
          </div>
          <div className="flex flex-col gap-4 relative">
            <span className="text-5xl font-black text-[#1a3d24]">04</span>
            <h3 className="font-extrabold text-lg text-[#e8e8e8]">Dê os Palpites</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Todos registram seus palpites de placar para os jogos antes de começarem e disputam o topo do ranking!
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 bg-[#08150c] border-t border-[#1a3d24]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#e8e8e8] uppercase italic tracking-tight">
              Preço Simples & Transparente
            </h2>
            <p className="mt-3 text-[#9ca3af] text-sm sm:text-base">
              Sem mensalidades ou surpresas. Pague uma vez e aproveite a Copa inteira.
            </p>
          </div>

          <div className="w-full max-w-md bg-[#0d2214] border-2 border-[#d4a017] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 bg-[#d4a017] text-[#0a1a0f] font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-xl">
              Copa 2026
            </div>
            
            <h3 className="text-2xl font-extrabold text-[#e8e8e8]">Grupo de Amigos</h3>
            <p className="text-xs text-[#9ca3af] mt-2">Ideal para grupos familiares, de trabalho ou amigos próximos.</p>

            <div className="my-8 flex items-baseline gap-1.5 justify-center sm:justify-start">
              <span className="text-5xl font-black text-[#e8e8e8]">R$ 15</span>
              <span className="text-xs font-bold text-[#9ca3af]">/ taxa única</span>
            </div>

            <ul className="space-y-4 mb-8 text-left text-xs text-[#9ca3af]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Até 15 participantes inclusos</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Atualizações de jogos e placares automáticas</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Spoiler protection ativo para palpites sociais</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Estatísticas de participante e dashboard admin</span>
              </li>
            </ul>

            <a
              href="https://buy.stripe.com/eVq4gBgHJ4u63XE5RD28802"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#d4a017] hover:bg-[#b8860b] text-[#0a1a0f] py-4 rounded-xl text-center text-sm font-black uppercase tracking-wider block transition-all duration-200 shadow-lg shadow-[#d4a017]/20 cursor-pointer"
            >
              Comprar Minha Sala
            </a>

            <p className="text-[10px] text-[#9ca3af] leading-relaxed text-center mt-4 italic">
              Precisa de mais vagas? Compre e solicite um upgrade no WhatsApp!
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#e8e8e8] uppercase italic tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#0d2214]/60 border border-[#1a3d24]/50 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer select-none"
                >
                  <span className="font-bold text-sm sm:text-base text-[#e8e8e8] flex items-center gap-2.5">
                    <HelpCircle className="w-5 h-5 text-[#d4a017] shrink-0" />
                    {faq.q}
                  </span>
                  <span className={`text-xl font-bold text-[#d4a017] transform transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-[#9ca3af] leading-relaxed border-t border-[#1a3d24]/20 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#1a3d24]/50 bg-[#08150c] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-xs text-[#6b7280]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#d4a017]" />
            <span className="font-bold text-[#e8e8e8]">BOLÃO DA COPA 2026</span>
          </div>
          <p>© 2026 Bolão da Copa do Mundo. Desenvolvido para entretenimento pessoal e corporativo.</p>
        </div>
      </footer>
    </div>
  );
}
