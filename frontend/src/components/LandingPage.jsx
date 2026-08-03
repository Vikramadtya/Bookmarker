import { Meteors } from "@/components/magicui/meteors";
import { NeonGradientCard } from "@/components/magicui/neon-gradient-card";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Particles } from "@/components/magicui/particles";
import { BASE_URL } from "@/lib/metadata";

export default function LandingPage() {
  const handleLogin = () => {
    try {
      const url = new URL(BASE_URL);
      window.location.href = url.origin + "/auth/google";
    } catch (e) {
      window.location.href = "http://localhost:8080/auth/google";
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Background Particles */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={150}
        ease={80}
        color="#ffffff"
        refresh
      />
      <div className="absolute inset-0 z-0">
        <Meteors number={50} />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="pt-24 pb-20">
          <main className="text-white">
            {/* Hero Section */}
            <section className="px-6 py-28 text-center md:px-16">
              <h1 className="mb-6 text-5xl leading-tight font-extrabold md:text-7xl">
                <TextAnimate
                  animation="blurInUp"
                  by="character"
                  duration={3}
                  once
                >
                  Save Smarter, Access Faster
                </TextAnimate>
              </h1>
              <p className="mx-auto mb-10 max-w-xl text-lg text-slate-300 md:text-xl">
                Your personalized bookmark manager to organize, sync, and
                retrieve your favorite web content effortlessly.
              </p>

              <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
                <button
                  onClick={handleLogin}
                  className="rounded-lg bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
                >
                  Get Started
                </button>
                <a
                  href="#features"
                  className="rounded-lg bg-slate-800 px-8 py-4 font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  Learn More
                </a>
              </div>
            </section>

            {/* Features Section */}
            <section id="features" className="px-6 py-24 md:px-16">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-3xl font-bold text-white">
                  Features You’ll Love
                </h2>
                <p className="mx-auto max-w-2xl text-slate-400">
                  Bookmarker is packed with intuitive tools to help you manage
                  your digital world with elegance and ease.
                </p>
              </div>
              <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
                {[
                  {
                    icon: "🔖",
                    title: "Organize with Folders",
                    desc: "Structure your bookmarks with unlimited nested folders for easy navigation.",
                  },
                  {
                    icon: "⚡",
                    title: "Fast Search",
                    desc: "Blazing fast, fuzzy search across all your saved links and tags.",
                  },
                  {
                    icon: "📱",
                    title: "Mobile Friendly",
                    desc: "Access and manage your bookmarks from any device, anywhere.",
                  },
                  {
                    icon: "🔐",
                    title: "Private & Secure",
                    desc: "Your data is yours. End-to-end encrypted and privacy-focused.",
                  },
                  {
                    icon: "💬",
                    title: "Notes & Tags",
                    desc: "Add custom notes and tag bookmarks for future reference and sorting.",
                  },
                  {
                    icon: "🤝",
                    title: "Shareable Collections",
                    desc: "Share public or private bookmark folders with friends or teams.",
                  },
                ].map(({ icon, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-md backdrop-blur-sm transition hover:border-slate-700 hover:shadow-lg hover:shadow-blue-900/20"
                  >
                    <div className="mb-4 text-4xl">{icon}</div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {title}
                    </h3>
                    <p className="text-slate-400">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="px-6 py-20 text-center md:px-16">
              <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-12 shadow-2xl backdrop-blur-md">
                <h2 className="mb-6 text-4xl font-bold">
                  <SparklesText text="Ready to streamline your web life?" />
                </h2>
                <p className="mb-10 text-xl text-slate-300">
                  Try Bookmarker for free and transform how you interact with
                  the internet.
                </p>
                <div className="flex justify-center">
                  <NeonGradientCard className="max-w-sm cursor-pointer items-center justify-center text-center">
                    <button
                      onClick={handleLogin}
                      className="pointer-events-none z-10 h-full bg-gradient-to-br from-[#ff2975] from-35% to-[#8c1eff] bg-clip-text text-center text-2xl leading-none font-bold tracking-tighter whitespace-pre-wrap text-transparent dark:drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]"
                    >
                      Login with Google
                    </button>
                  </NeonGradientCard>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
