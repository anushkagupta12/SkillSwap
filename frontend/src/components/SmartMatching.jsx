export default function SmartMatching() {
  return (
    // <section className="bg-gradient-to-r from-purple-600 to-indigo-500 py-12 px-6 rounded-xl max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-stretch gap-8">
    //   {/* Left Section */}
    //   <div className="flex-1 text-white flex flex-col justify-center">
    //     <h2 className="text-3xl font-bold mb-4">Smart AI Matching</h2>
    //     <p className="mb-6 text-lg">
    //       Our algorithm analyzes your skills and needs to find the best possible
    //       matches, saving you hours of manual searching.
    //     </p>
    //     <button className="bg-white text-purple-700 px-4 py-2 rounded-md font-medium shadow hover:bg-gray-100 transition">
    //       Check Your Matches
    //     </button>
    //   </div>

    //   {/* Right Section */}
    //   <div className="bg-white rounded-lg shadow p-6 flex-1">
    //     <h3 className="text-lg font-semibold mb-4">Your Top Matches</h3>
    //     <div className="space-y-4">
    //       {matches.map((match, index) => (
    //         <div
    //           key={index}
    //           className="flex items-center justify-between border-b last:border-b-0 pb-4 last:pb-0"
    //         >
    //           {/* Left User Info */}
    //           <div className="flex items-center gap-3">
    //             <FaUserCircle className="text-gray-300" size={40} />
    //             <div>
    //               <p className="font-medium text-gray-800">{match.name}</p>
    //               <p className="text-sm text-gray-600">
    //                 Offers: {match.offers} | Needs: {match.needs}
    //               </p>
    //             </div>
    //           </div>

    //           {/* Match Score */}
    //           <div className="relative w-14 h-14 flex items-center justify-center">
    //             <svg className="w-full h-full">
    //               <circle
    //                 cx="28"
    //                 cy="28"
    //                 r="25"
    //                 stroke="#e5e7eb"
    //                 strokeWidth="4"
    //                 fill="none"
    //               />
    //               <circle
    //                 cx="28"
    //                 cy="28"
    //                 r="25"
    //                 stroke="#34d399"
    //                 strokeWidth="4"
    //                 fill="none"
    //                 strokeDasharray={`${2 * Math.PI * 25}`}
    //                 strokeDashoffset={`${
    //                   2 * Math.PI * 25 * (1 - match.score / 100)
    //                 }`}
    //                 strokeLinecap="round"
    //               />
    //             </svg>
    //             <span className="absolute text-sm font-semibold text-gray-700">
    //               {match.score}%
    //             </span>
    //           </div>
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // </section>
    <section className="bg-[#f3efe8] py-24 px-10">
      <div className="max-w-7xl mx-auto text-center">

        {/* Heading */}
        <h2
          className="text-4xl font-mono font-bold text-[#0f1117] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Intelligent skill matching
        </h2>

        {/* Subtext */}
        <p className="text-[#6b7280] max-w-2xl mx-auto mb-16">
          Our algorithm surfaces your most compatible swap partners based on
          complementary skills, availability, and learning goals
        </p>

        {/* MATCH BOX */}
        <div className="bg-white border border-[#e8e2d8] rounded-2xl p-10">

          <div className="grid grid-cols-3 gap-10 items-center">

            {/* LEFT USER */}
            <div className="bg-[#faf8f4] border border-[#e8e2d8] rounded-2xl p-6 text-left">

              {/* Profile */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#d8f3dc] flex items-center justify-center font-semibold text-[#2d6a4f]">
                  KP
                </div>
                <div>
                  <h3 className="font-semibold text-[#0f1117]">Kavya Patel</h3>
                  <p className="text-sm text-[#6b7280]">UX Designer · Mumbai</p>
                </div>
              </div>

              {/* CAN TEACH */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-3">
                Can Teach
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {[
                  "Figma & Prototyping",
                  "UI/UX Design",
                  "Design Systems",
                  "User Research",
                ].map((item, i) => (
                  <span
                    key={i}
                    className="bg-[#d8f3dc] text-[#2d6a4f] px-4 py-2 rounded-full text-sm"
                  >
                    ✦ {item}
                  </span>
                ))}
              </div>

              {/* WANTS TO LEARN */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-3">
                Wants to learn
              </p>
              <div className="flex flex-col gap-3">
                {["Python fundamentals", "Data Visualization"].map((item, i) => (
                  <span
                    key={i}
                    className="bg-[#fef3c7] text-[#b45309] px-4 py-2 rounded-full text-sm"
                  >
                    → {item}
                  </span>
                ))}
              </div>
            </div>

            {/* CENTER */}
            <div className="flex flex-col items-center">

              {/* Swap Icon */}
              <div className="w-16 h-16 bg-[#0f1117] text-[#52b788] rounded-full flex items-center justify-center text-xl mb-6 shadow-lg">
                ⇄
              </div>

              {/* Score */}
              <div className="text-center mb-6">
                <h3
                  className="text-5xl font-serif text-[#2d6a4f]"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  93%
                </h3>
                <p className="text-sm text-[#6b7280] mt-1">
                  Compatibility score
                </p>
              </div>

              {/* Button */}
              <button className="bg-[#52b788] text-[#0f1117] px-6 py-3 rounded-full font-medium hover:bg-[#74c69d] transition">
                Connect now
              </button>
            </div>

            {/* RIGHT USER */}
            <div className="bg-[#faf8f4] border border-[#e8e2d8] rounded-2xl p-6 text-left">

              {/* Profile */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#eef2ff] flex items-center justify-center font-semibold text-[#3730a3]">
                  AR
                </div>
                <div>
                  <h3 className="font-semibold text-[#0f1117]">Arjun Rao</h3>
                  <p className="text-sm text-[#6b7280]">
                    Backend Developer · Bangalore
                  </p>
                </div>
              </div>

              {/* CAN TEACH */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-3">
                Can Teach
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {[
                  "Python & Django",
                  "REST API Design",
                  "Data Analysis",
                  "MongoDB",
                ].map((item, i) => (
                  <span
                    key={i}
                    className="bg-[#d8f3dc] text-[#2d6a4f] px-4 py-2 rounded-full text-sm"
                  >
                    ✦ {item}
                  </span>
                ))}
              </div>

              {/* WANTS TO LEARN */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-3">
                Wants to learn
              </p>
              <div className="flex flex-col gap-3">
                {["UI/UX Principles", "Figma basics"].map((item, i) => (
                  <span
                    key={i}
                    className="bg-[#fef3c7] text-[#b45309] px-4 py-2 rounded-full text-sm"
                  >
                    → {item}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
