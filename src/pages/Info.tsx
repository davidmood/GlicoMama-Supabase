import { motion } from "framer-motion";

type Feature = {
  title: string;
  description: string;
  icon: string;
};

const features: Feature[] = [
  {
    title: "Controle Completo de Glicemia",
    description:
      "Registre glicemia pré-prandial, pós 1h e pós 2h, insulina, refeições, carboidratos e sintomas em um único lugar.",
    icon: "💜",
  },
  {
    title: "Amamentação Integrada",
    description:
      "Controle peito, bomba, duração, lado da mama e quantidade extraída com insights personalizados.",
    icon: "🤱",
  },
  {
    title: "Compartilhamento Médico",
    description:
      "Compartilhe relatórios e QR Codes seguros com médicos e familiares em tempo real.",
    icon: "🩺",
  },
  {
    title: "Notificações Inteligentes",
    description:
      "Receba lembretes para medições, refeições, insulina e amamentação.",
    icon: "🔔",
  },
  {
    title: "Relatórios e Gráficos",
    description:
      "Visualize tendências glicêmicas e exporte relatórios em PDF.",
    icon: "📊",
  },
  {
    title: "Instalável no iPhone",
    description:
      "Use como aplicativo no iOS e Android sem precisar da App Store.",
    icon: "📱",
  },
];

const techs: string[] = [
  "React",
  "TypeScript",
  "Vite",
  "Supabase",
  "PostgreSQL",
  "PWA",
  "Vercel",
  "FastAPI",
];

export default function Info() {
  return (
    <div className="min-h-screen bg-[#090412] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.25),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.2),_transparent_25%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logoglicomama.png"
              alt="GlicoMama"
              className="w-12 h-12 rounded-2xl object-cover shadow-2xl shadow-pink-500/30"
            />

            <div>
              <h1 className="font-bold text-2xl">GlicoMama</h1>
              <p className="text-white/50 text-sm">
                Saúde inteligente para mamães
              </p>
            </div>
          </div>

          <a
            href="https://glico-mama-supabase.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:scale-105 transition-all shadow-2xl shadow-pink-500/30"
          >
            Abrir Aplicativo
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-200 text-sm mb-8">
            💜 Diabetes Gestacional • Amamentação • Puerpério
          </div>

          <h2 className="text-6xl md:text-7xl font-black leading-tight">
            O cuidado da{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              mamãe
            </span>{" "}
            na palma da mão.
          </h2>

          <p className="mt-8 text-xl text-white/65 leading-relaxed max-w-2xl">
            Um aplicativo moderno para acompanhar glicemia, insulina,
            alimentação, amamentação e evolução da maternidade com gráficos,
            relatórios e compartilhamento médico.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="https://glico-mama-supabase.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all"
            >
              Começar Agora
            </a>

            <a
              href="#features"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-lg transition-all"
            >
              Ver Recursos
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <h3 className="text-3xl font-black">PWA</h3>
              <p className="text-white/50 mt-1">iPhone & Android</p>
            </div>

            <div>
              <h3 className="text-3xl font-black">Cloud</h3>
              <p className="text-white/50 mt-1">Sincronização segura</p>
            </div>

            <div>
              <h3 className="text-3xl font-black">PDF</h3>
              <p className="text-white/50 mt-1">Relatórios médicos</p>
            </div>
          </div>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9 }}
          className="relative flex justify-center"
        >
          <div className="absolute w-[500px] h-[500px] bg-pink-500/20 blur-3xl rounded-full" />

          <div className="relative w-[360px] rounded-[3.5rem] bg-black/30 border border-white/10 backdrop-blur-2xl p-4 shadow-[0_0_100px_rgba(236,72,153,0.25)]">
            {/* notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-20" />

            <div className="overflow-hidden rounded-[3rem] border border-white/10">
              <img
                src="/image.png"
                alt="Aplicativo GlicoMama"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 py-24"
      >
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl font-black">
            Tudo que uma mamãe precisa 💜
          </h2>

          <p className="text-white/60 text-xl mt-6 leading-relaxed">
            Recursos desenvolvidos especialmente para gestação, diabetes
            gestacional, puerpério e amamentação.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-7 hover:bg-white/10 hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-2xl shadow-pink-500/20">
                {feature.icon}
              </div>

              <h3 className="text-2xl font-bold mt-6">{feature.title}</h3>

              <p className="mt-4 text-white/60 leading-relaxed text-lg">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.03] backdrop-blur-xl py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black">
            Tecnologia moderna e escalável
          </h2>

          <p className="text-white/60 text-xl mt-6">
            Construído com as melhores tecnologias web modernas.
          </p>

          <div className="mt-14 flex flex-wrap justify-center gap-4">
            {techs.map((tech) => (
              <div
                key={tech}
                className="px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-purple-500/15 to-pink-500/15 backdrop-blur-2xl p-14 text-center shadow-[0_0_100px_rgba(236,72,153,0.2)]">
          <h2 className="text-5xl font-black leading-tight">
            Desenvolvido com 💜 para mamães reais.
          </h2>

          <p className="mt-8 text-xl text-white/65 max-w-3xl mx-auto leading-relaxed">
            O GlicoMama nasceu para tornar o acompanhamento glicêmico e da
            maternidade mais humano, intuitivo, bonito e acessível.
          </p>

          <div className="mt-10">
            <a
              href="https://glico-mama-supabase.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-xl font-bold shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all"
            >
              Acessar Aplicativo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-white/40">
        © 2026 GlicoMama • Todos os direitos reservados.
      </footer>
    </div>
  );
}
