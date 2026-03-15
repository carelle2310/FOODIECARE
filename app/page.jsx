import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import UploadForm from "../components/UploadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="space-y-8">
          <Hero />

          <section
            id="analyze"
            className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
          >
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                How It Works
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-slate-900">
                Simple AI Analysis Flow
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Upload your meal photo, enter food name for AI simulation, and
                receive a clean nutrition breakdown with personalized diet
                guidance.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Step 1</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Upload Food Image
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Step 2</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    AI Nutrition Analysis
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Step 3</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Diet Recommendation
                  </p>
                </div>
              </div>
            </div>

            <UploadForm />
          </section>

          <section
            id="about"
            className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              About FoodieCare
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
              Built for smart and practical nutrition awareness
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              FoodieCare demonstrates an AI-inspired healthcare web product
              using a simple and explainable flow. It is ideal for a final year
              BCA project because it combines modern frontend design, API
              integration, data handling, and user-focused experience in one
              deployable application.
            </p>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}
