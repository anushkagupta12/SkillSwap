export default function Community() {
  const users = [
    {
      initials: "KP",
      name: "Kavya Patel",
      role: "Mumbai, India · UX Designer",
      bio: "5 years designing mobile-first products at a Series B startup. Passionate about accessible design and wants to learn data skills to better inform design decisions.",
      teach: ["Figma", "Prototyping", "UI Design"],
      learn: ["Python", "Data Viz"],
      color: "bg-[#d8f3dc] text-[#2d6a4f]",
    },
    {
      initials: "AR",
      name: "Arjun Rao",
      role: "Bangalore, India · Backend Dev",
      bio: "Django & Python developer who loves building APIs. Wants to improve his design eye and Figma skills to collaborate more effectively with product teams.",
      teach: ["Python", "Django", "MongoDB"],
      learn: ["Figma", "UX Research"],
      color: "bg-[#eef2ff] text-[#3730a3]",
    },
    {
      initials: "SM",
      name: "Shreya Mehta",
      role: "Delhi, India · Data Analyst",
      bio: "Working with Tableau & Power BI at a fintech company. Wants to pick up React to build her own dashboards and start sharing projects in her portfolio.",
      teach: ["Tableau", "Power BI", "SQL"],
      learn: ["React", "JavaScript"],
      color: "bg-[#fef3c7] text-[#b45309]",
    },
  ];

  return (
    <section className="bg-[#faf8f4] py-24 px-10">
      <div className="max-w-7xl mx-auto text-center">

        {/* Heading */}
        <h2
          className="text-4xl font-serif font-bold text-[#0f1117] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Meet your skill community
        </h2>

        {/* Subtext */}
        <p className="text-[#6b7280] max-w-xl mx-auto mb-16">
          Real people, genuine expertise, ready to exchange knowledge and grow together
        </p>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-8 text-left">
          {users.map((user, i) => (
            <div
              key={i}
              className="bg-white border border-[#e8e2d8] rounded-2xl p-6 transition hover:-translate-y-2 hover:shadow-lg"
            >

              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${user.color}`}>
                  {user.initials}
                </div>
                <div>
                  <h3 className="font-semibold text-[#0f1117]">
                    {user.name}
                  </h3>
                  <p className="text-sm text-[#6b7280]">
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-[#3a3d4a] leading-relaxed mb-5">
                {user.bio}
              </p>

              {/* Teaching */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-2">
                Teaching
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {user.teach.map((t, idx) => (
                  <span
                    key={idx}
                    className="bg-[#d8f3dc] text-[#2d6a4f] px-3 py-1 rounded-full text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Learning */}
              <p className="text-xs font-semibold text-[#6b7280] uppercase mb-2">
                Learning
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {user.learn.map((l, idx) => (
                  <span
                    key={idx}
                    className="bg-[#fef3c7] text-[#b45309] px-3 py-1 rounded-full text-xs"
                  >
                    {l}
                  </span>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-full border border-[#e8e2d8] text-sm text-[#3a3d4a] hover:bg-gray-100 transition">
                  View profile
                </button>

                <button className="flex-1 bg-[#0f1117] text-white px-4 py-2 rounded-full text-sm hover:bg-[#1a1c23] transition">
                  Request swap →
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}