import "./globals.css";
import InfiniteCanvas from "./components/ui/gridBackground";
import TracerApp from "./components/TracerApp";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Ambient interactive geometric grid (fixed, behind everything) */}
      <InfiniteCanvas />

      {/* Soft vignette so content stays readable over the grid */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(10,10,15,0.15) 0%, rgba(10,10,15,0.65) 55%, rgba(10,10,15,0.88) 100%)",
        }}
        aria-hidden
      />

      {/* App UI overlay */}
      <TracerApp />
    </div>
  );
}
