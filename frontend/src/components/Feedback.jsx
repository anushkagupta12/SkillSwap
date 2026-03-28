import React from 'react';

const Feedback = () => {
  const reviews = [
    {
      text: "In three months of swapping Figma sessions for Python lessons, I went from knowing nothing about data to building my own analytics dashboard. Genuinely life-changing.",
      name: "Kavya Patel",
      swap: "Figma ↔ Python",
      initials: "KP",
      bgColor: "bg-[#d8f3dc]",
      textColor: "text-[#2d6a4f]"
    },
    {
      text: "The matching algorithm is scarily good. It found me a partner whose skills were exactly what I needed, and what I had was exactly what they were looking for. Pure magic.",
      name: "Arjun Rao",
      swap: "Python ↔ UI Design",
      initials: "AR",
      bgColor: "bg-[#eef2ff]",
      textColor: "text-[#3730a3]"
    },
    {
      text: "I've tried expensive online courses, but nothing beats learning one-on-one from someone who genuinely cares. The real-time chat makes scheduling and communication effortless.",
      name: "Shreya Mehta",
      swap: "Tableau ↔ React",
      initials: "SM",
      bgColor: "bg-[#fff7ed]",
      textColor: "text-[#c2410c]"
    }
  ];

  return (
    <section className="bg-[#f2ede4] py-24 px-6">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 
          className="text-5xl font-serif font-bold text-[#0f1117] mb-6"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          What swappers are saying
        </h2>
        <p className="text-[#6b7280] max-w-xl mx-auto text-lg leading-relaxed">
          Thousands of people have already transformed their skills through SkillSwap
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviews.map((review, index) => (
          <div 
            key={index} 
            className="bg-white rounded-[2rem] p-10 border border-[#e8e2d8] shadow-sm flex flex-col justify-between"
          >
            <div>
              {/* Quote Icon */}
              <div className="text-[#52b788] text-4xl mb-6 font-serif">
                <span className="inline-block scale-x-[-1] leading-none">"</span>
                <span className="inline-block leading-none"></span>
              </div>
              
              <p className="italic text-[#374151] leading-relaxed text-[15px] mb-10">
                "{review.text}"
              </p>
            </div>

            {/* Author Info */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${review.bgColor} ${review.textColor}`}>
                {review.initials}
              </div>
              <div>
                <h4 className="font-bold text-[#0f1117] text-sm">{review.name}</h4>
                <p className="text-xs text-[#9ca3af]">{review.swap}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Feedback;