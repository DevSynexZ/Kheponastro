// "use client";

// import React from "react";
// import { Crosshair, Wrench, Flame } from "lucide-react";

// interface MenuComponentProps {
//   onReturnHome: () => void;
// }

// export default function MenuComponent({ onReturnHome }: MenuComponentProps) {
//   return (
//     <div className="relative w-full flex-grow flex flex-col justify-center">
//       <div
//         className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-65 scale-105 transition-all duration-1000"
//         style={{ backgroundImage: `url('/images/menupage/menupage.jpg')` }}
//       />
//       <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#030508]/90 via-[#030508]/50 to-[#030508]/30 pointer-events-none" />
//       <section className="relative z-20 max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center my-auto space-y-8 animate-fadeIn">
//         <div className="space-y-2 border-b border-cyan-500/30 pb-4 w-full">
//           <h2 className="text-4xl sm:text-7xl lg:text-8xl font-tactical tracking-widest text-zinc-400 uppercase flex items-center justify-center flex-nowrap gap-1.5 sm:gap-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_#27272a]">
//             {/* Tank-K Image */}
//             <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
//               <img
//                 src="/images/homepage/tank-k.png"
//                 alt="Tank K"
//                 className="h-[4.5em] w-[5em] object-contain"
//               />
//             </span>
//             <span>HEP</span>

//             {/* Scope-O Image */}
//             <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
//               <img
//                 src="/images/homepage/scope-o.png"
//                 alt="Scope O"
//                 className="h-[5em] w-auto object-contain"
//               />
//             </span>
//             <span>NASTRO</span>
//           </h2>
//           <p className="text-xs font-mono text-slate-400 tracking-wider">
//             SELECT DEPLOYMENT PROTOCOL
//           </p>
//         </div>

//         <div className="relative w-full max-w-3xl h-[340px] sm:h-[420px] mx-auto flex items-end justify-center gap-1 sm:gap-2 pt-6">
//           {/* Option 1: SELECT ARENA (Left Triangle) */}
//           <button
//             onClick={() => alert("Loading Arena Selector...")}
//             className="group relative w-[32%] h-[80%] sm:h-[85%] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-30 focus:outline-none"
//             style={{
//               clipPath: "polygon(50% 0%, 100% 45%, 100% 100%, 0% 100%, 0% 45%)",
//             }}
//           >
//             {/* Background Image */}
//             <div
//               className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
//               style={{
//                 backgroundImage: `url('/images/menupage/arena-bg.jpg')`,
//               }}
//             />
//             {/* Tactical Gradient Overlay */}
//             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-cyan-950/70 to-slate-900/40 group-hover:from-cyan-950/90 transition-colors" />

//             {/* Content */}
//             <div className="absolute inset-0 p-4 sm:p-6 flex flex-col items-center justify-end text-center pb-8 sm:pb-12">
//               <div className="p-2 sm:p-3 rounded-xl bg-cyan-500/20 text-cyan-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
//                 <Crosshair className="w-5 h-5 sm:w-7 sm:h-7" />
//               </div>
//               <h4 className="font-extrabold text-xs sm:text-base tracking-widest text-white drop-shadow-md">
//                 SELECT ARENA
//               </h4>
//               <p className="hidden sm:block text-[10px] font-mono text-cyan-300/80 mt-1">
//                 Terrain & Weather
//               </p>
//             </div>
//           </button>

//           {/* Option 3: ENTER WARZONE (Center Tall Triangle) */}
//           <button
//             onClick={() => (window.location.href = "/arena")}
//             className="group relative w-[38%] h-full z-20 overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.04] focus:outline-none shadow-[0_0_30px_rgba(245,158,11,0.3)]"
//             style={{
//               clipPath: "polygon(50% 0%, 100% 45%, 100% 100%, 0% 100%, 0% 45%)",
//             }}
//           >
//             {/* Background Image */}
//             <div
//               className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
//               style={{
//                 backgroundImage: `url('/images/menupage/warzone-bg.jpeg')`,
//               }}
//             />
//             {/* Tactical Gradient Overlay */}
//             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-amber-950/70 to-slate-900/40 group-hover:from-amber-950/90 transition-colors" />

//             {/* Content */}
//             <div className="absolute inset-0 p-4 sm:p-6 flex flex-col items-center justify-end text-center pb-10 sm:pb-14">
//               <div className="p-3 sm:p-4 rounded-xl bg-amber-500/20 text-amber-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.5)]">
//                 <Flame className="w-6 h-6 sm:w-8 sm:h-8" />
//               </div>
//               <h4 className="font-extrabold text-sm sm:text-lg tracking-widest text-white drop-shadow-md">
//                 ENTER WARZONE
//               </h4>
//               <p className="hidden sm:block text-[10px] font-mono text-amber-300/80 mt-1">
//                 Initiate Combat
//               </p>
//             </div>
//           </button>

//           {/* Option 2: UPGRADE KHEPONASTRO (Right Triangle) */}
//           <button
//             onClick={() => alert("Opening Arsenal Upgrades...")}
//             className="group relative w-[32%] h-[80%] sm:h-[85%] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-30 focus:outline-none"
//             style={{
//               clipPath: "polygon(50% 0%, 100% 45%, 100% 100%, 0% 100%, 0% 45%)",
//             }}
//           >
//             {/* Background Image */}
//             <div
//               className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
//               style={{
//                 backgroundImage: `url('/images/homepage/upgrade-bg.jpg')`,
//               }}
//             />
//             {/* Tactical Gradient Overlay */}
//             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-emerald-950/70 to-slate-900/40 group-hover:from-emerald-950/90 transition-colors" />

//             {/* Content */}
//             <div className="absolute inset-0 p-4 sm:p-6 flex flex-col items-center justify-end text-center pb-8 sm:pb-12">
//               <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/20 text-emerald-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
//                 <Wrench className="w-5 h-5 sm:w-7 sm:h-7" />
//               </div>
//               <h4 className="font-extrabold text-xs sm:text-base tracking-widest text-white drop-shadow-md">
//                 UPGRADE KHEPONASTRO
//               </h4>
//               <p className="hidden sm:block text-[10px] font-mono text-emerald-300/80 mt-1">
//                 Arsenal & Tuning
//               </p>
//             </div>
//           </button>
//         </div>

//         <div className="pt-6 flex justify-center">
//           <button
//             onClick={onReturnHome}
//             className="px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 font-mono text-xs uppercase tracking-widest border border-cyan-500/30 shadow-lg transition duration-200 cursor-pointer flex items-center gap-2"
//           >
//             <span>←</span>
//             <span>Return to Main Title</span>
//           </button>
//         </div>
//       </section>
//     </div>
//   );
// }

"use client";

import React from "react";
import { Crosshair, Wrench, Flame } from "lucide-react";

interface MenuComponentProps {
  onReturnHome: () => void;
}

export default function MenuComponent({ onReturnHome }: MenuComponentProps) {
  return (
    <div className="relative w-full flex-grow flex flex-col justify-center overflow-hidden">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-65 scale-105 transition-all duration-1000"
        style={{ backgroundImage: `url('/images/menupage/menupage.jpg')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#030508]/95 via-[#030508]/70 to-[#030508]/40 pointer-events-none" />

      <section className="relative z-20 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center my-auto space-y-6 animate-fadeIn">
        {/* Header Title Area */}
        <div className="space-y-1.5">
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-tactical tracking-widest text-zinc-400 uppercase flex items-center justify-center flex-nowrap gap-1.5 sm:gap-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_#27272a]">
            {/* Tank-K Image */}
            <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
              <img
                src="/images/homepage/tank-k.png"
                alt="Tank K"
                className="h-[3.2em] w-auto object-contain"
              />
            </span>
            <span>HEP</span>

            {/* Scope-O Image */}
            <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
              <img
                src="/images/homepage/scope-o.png"
                alt="Scope O"
                className="h-[2.6em] w-auto object-contain"
              />
            </span>
            <span>NASTRO</span>
          </h2>
          <p className="text-[11px] font-mono text-cyan-400 tracking-[0.25em]">
            SELECT DEPLOYMENT PROTOCOL
          </p>
        </div>

        {/* Polygon Buttons Container */}
        <div className="relative w-full max-w-3xl h-[320px] sm:h-[380px] mx-auto flex items-end justify-center gap-1.5 sm:gap-3">
          {/* Option 1: SELECT ARENA (Left Triangle) */}
          {/* <button
            onClick={() => alert("Loading Arena Selector...")}
            className="group relative w-[32%] h-[80%] sm:h-[85%] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-30 focus:outline-none shadow-xl"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{
                backgroundImage: `url('/images/menupage/arena-bg.jpeg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-cyan-950/70 to-slate-900/40 group-hover:from-cyan-950/90 transition-colors" />

            <div className="absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-end text-center pb-6 sm:pb-10">
              <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Crosshair className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm tracking-widest text-white drop-shadow-md">
                SELECT ARENA
              </h4>
              <p className="hidden sm:block text-[10px] font-mono text-cyan-300/80 mt-1">
                Terrain & Weather
              </p>
            </div>
          </button> */}
          <button
            onClick={() => alert("Loading Arena Selector...")}
            className="group relative w-[32%] h-[80%] sm:h-[85%] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-30 focus:outline-none shadow-xl"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          >
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-110"
              style={{
                backgroundImage: `url('/images/menupage/arena-bg.jpeg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-550/95 via-cyan-550/70 to-slate-700/40 group-hover:from-cyan-650/90 transition-colors" />

            <div className="absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-end text-center pb-6 sm:pb-10">
              {/* <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Crosshair className="w-5 h-5 sm:w-6 sm:h-6" />
              </div> */}
              <h4 className="font-extrabold text-xs sm:text-sm tracking-widest text-white drop-shadow-md">
                SELECT ARENA
              </h4>
              <p className="hidden sm:block text-[10px] font-mono text-cyan-300/80 mt-1">
                Terrain & Weather
              </p>
            </div>
          </button>

          {/* Option 3: ENTER WARZONE (Center Tall Triangle) */}
          <button
            onClick={() => (window.location.href = "/arena")}
            className="group relative w-[36%] h-full z-20 overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.04] focus:outline-none shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{
                backgroundImage: `url('/images/menupage/warzone-bg.jpeg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-750/95 via-amber-850/70 to-slate-800/40 group-hover:from-amber-950/90 transition-colors" />

            <div className="absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-end text-center pb-8 sm:pb-12">
              {/* <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/20 text-amber-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7" />
              </div> */}
              <h4 className="font-extrabold text-xs sm:text-base tracking-widest text-white drop-shadow-md">
                ENTER WARZONE
              </h4>
              <p className="hidden sm:block text-[10px] font-mono text-amber-300/80 mt-1">
                Initiate Combat
              </p>
            </div>
          </button>

          {/* Option 2: UPGRADE KHEPONASTRO (Right Triangle) */}
          <button
            onClick={() => alert("Opening Arsenal Upgrades...")}
            className="group relative w-[32%] h-[80%] sm:h-[85%] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:z-30 focus:outline-none shadow-xl"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{
                backgroundImage: `url('/images/menupage/upgrade-bg.jpeg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-550/95 via-emerald-550/70 to-slate-700/40 group-hover:from-emerald-650/90 transition-colors" />

            <div className="absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-end text-center pb-6 sm:pb-10">
              {/* <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
              </div> */}
              {/* <h4 className="font-extrabold text-xs sm:text-sm tracking-widest text-white drop-shadow-md">
                UPGRADE KHEPONASTRO
              </h4> */}
              {/* <p className="hidden sm:block text-[10px] font-mono text-emerald-300/80 mt-1">
                Arsenal & Tuning
              </p> */}
            </div>
          </button>
        </div>

        {/* Return Button */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={onReturnHome}
            className="px-6 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 font-mono text-xs uppercase tracking-widest border border-cyan-500/30 shadow-lg transition duration-200 cursor-pointer flex items-center gap-2"
          >
            <span>←</span>
            <span>Return to Main Title</span>
          </button>
        </div>
      </section>
    </div>
  );
}
