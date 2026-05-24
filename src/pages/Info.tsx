export default function GlicoMamaLanding() {
  const features = [
    {
      title: 'Controle Completo de Glicemia',
      description:
        'Registre glicemia pré-prandial, pós 1h e pós 2h, insulina, refeições, carboidratos e sintomas em um único lugar.',
      icon: '💜',
    },
    {
      title: 'Amamentação Integrada',
      description:
        'Controle peito, bomba, duração, lado da mama e quantidade extraída com insights personalizados.',
      icon: '🤱',
    },
    {
      title: 'Compartilhamento com Médicos',
      description:
        'Compartilhe dados via QR Code com médicos e familiares de forma segura e prática.',
      icon: '🩺',
    },
    {
      title: 'PWA Instalável',
      description:
        'Use como aplicativo no iPhone e Android sem precisar baixar pela App Store.',
      icon: '📱',
    },
    {
      title: 'Relatórios Inteligentes',
      description:
        'Exportação em PDF e CSV com gráficos, tendências glicêmicas e estatísticas detalhadas.',
      icon: '📊',
    },
    {
      title: 'Notificações Push',
      description:
        'Lembretes reais para medições, refeições, insulina e amamentação mesmo com o app fechado.',
      icon: '🔔',
    },
  ];

  const techs = [
    'React 19',
    'TypeScript',
    'Vite',
    'Supabase',
    'FastAPI',
    'PostgreSQL',
    'Vercel',
    'Render',
    'Chart.js',
    'PWA',
  ];

  return (
    <div className="min-h-screen bg-[#0b0613] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.3),_transparent_30%)]" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-black/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logoglicomama.png"
              alt="GlicoMama Logo"
              className="w-12 h-12 rounded-2xl shadow-2xl shadow-pink-500/30 object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold">GlicoMama</h1>
              <p className="text-sm text-white/60">
                Controle inteligente para gestação e amamentação
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="#features"
              className="text-white/70 hover:text-white transition"
            >
              Funcionalidades
            </a>
            <a
              href="#tech"
              className="text-white/70 hover:text-white transition"
            >
              Stack
            </a>
            <a
              href="https://glico-mama-supabase.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-medium shadow-lg shadow-pink-500/20 hover:scale-105 transition"
            >
              Abrir Aplicativo
            </a>
          </div>
        </div>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-200 text-sm mb-8">
            💜 App completo para diabetes gestacional e amamentação
          </div>

          <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            O cuidado da
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}mamãe
            </span>
            <br />
            na palma da mão.
          </h2>

          <p className="mt-8 text-xl text-white/70 leading-relaxed max-w-2xl">
            O GlicoMama é um aplicativo moderno criado para gestantes,
            puérperas e lactantes acompanharem glicemia, insulina,
            alimentação e amamentação com gráficos inteligentes,
            notificações push e compartilhamento médico.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="https://glico-mama-supabase.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg shadow-2xl shadow-pink-500/30 hover:scale-105 transition inline-flex"
            >
              Começar Agora
            </a>

            <button className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg text-lg hover:bg-white/10 transition">
              Ver Demonstração
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
            <div>
              <h3 className="text-3xl font-bold">100%</h3>
              <p className="text-white/60 text-sm mt-1">Português BR</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold">PWA</h3>
              <p className="text-white/60 text-sm mt-1">iPhone & Android</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold">Cloud</h3>
              <p className="text-white/60 text-sm mt-1">Sincronização segura</p>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute w-[500px] h-[500px] bg-pink-500/20 blur-3xl rounded-full" />

          <div className="relative w-[360px] rounded-[3.5rem] border border-white/10 bg-black/30 backdrop-blur-2xl p-4 shadow-[0_0_80px_rgba(236,72,153,0.25)]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20" />

            <div className="rounded-[3rem] overflow-hidden border border-white/10 bg-[#120b1d]">
              <img
                src="/image.png"
                alt="Demonstração do aplicativo GlicoMama"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 py-24"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-5xl font-black">
            Funcionalidades pensadas para a maternidade
          </h2>
          <p className="text-white/60 text-xl mt-6 leading-relaxed">
            Tudo que uma gestante ou lactante precisa para acompanhar sua saúde,
            seu bebê e sua rotina em um único aplicativo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 hover:bg-white/10 hover:-translate-y-2 transition duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-xl shadow-pink-500/20">
                {feature.icon}
              </div>

              <h3 className="text-2xl font-bold mt-6">{feature.title}</h3>
              <p className="text-white/60 mt-4 leading-relaxed text-lg">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 border-y border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl font-black leading-tight">
              Compartilhe com médicos e familiares em tempo real.
            </h2>

            <p className="mt-6 text-xl text-white/60 leading-relaxed">
              Gere QR Codes seguros com expiração automática para que médicos,
              parceiros e familiares acompanhem a evolução da gestação e da
              glicemia de forma prática e segura.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'QR Code com expiração de 24h',
                'Visualização médica em modo leitura',
                'Relatórios completos em PDF',
                'Histórico sincronizado na nuvem',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    ✓
                  </div>
                  <span className="text-lg text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#1a1028] to-[#0f0819] p-8 shadow-[0_0_100px_rgba(168,85,247,0.2)]">
              <div className="rounded-3xl bg-white p-8 text-black text-center">
                <div className="w-48 h-48 mx-auto rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-6xl">
                  ▣
                </div>

                <h3 className="text-3xl font-black mt-8">GLM-482931</h3>
                <p className="text-gray-500 mt-3">
                  Código seguro para compartilhamento médico
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tech" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black">Stack Moderna e Escalável</h2>
          <p className="text-xl text-white/60 mt-6">
            Construído com tecnologias modernas focadas em performance,
            segurança e experiência mobile.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {techs.map((tech) => (
            <div
              key={tech}
              className="px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-lg hover:bg-white/10 transition"
            >
              {tech}
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-2xl p-12 text-center shadow-[0_0_100px_rgba(236,72,153,0.15)]">
          <h2 className="text-5xl font-black leading-tight">
            Desenvolvido com 💜 para gestantes e lactantes.
          </h2>

          <p className="text-xl text-white/70 mt-6 max-w-3xl mx-auto leading-relaxed">
            O GlicoMama nasceu para transformar o acompanhamento glicêmico em
            algo humano, bonito, intuitivo e realmente pensado para a
            maternidade.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="https://glico-mama-supabase.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-semibold shadow-2xl shadow-pink-500/30 hover:scale-105 transition inline-flex"
            >
              Acessar Aplicativo
            </a>

            <button className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-lg hover:bg-white/10 transition">
              Ver no GitHub
            </button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-white/40">
        <p>© 2026 GlicoMama • Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
