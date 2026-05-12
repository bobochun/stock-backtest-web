import ProMarketHero from "../components/ProMarketHero";
import ProRiskLab from "../components/ProRiskLab";

export default function ProLabPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-red-200/50 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[30%] h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <ProMarketHero />

        <section
          id="pro-risk-lab"
          className="rounded-[2rem] border border-slate-200 bg-white/80 p-3 shadow-xl backdrop-blur md:p-4"
        >
          <ProRiskLab />
        </section>
      </div>
    </main>
  );
}