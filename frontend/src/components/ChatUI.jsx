import React from 'react';

const ChatUI = () => {
  const contacts = [
    { name: 'Arjun Rao', message: 'I can share the Python noteb...', initial: 'AR', color: 'bg-[#eef2ff]', text: 'text-[#3730a3]', active: true, online: true },
    { name: 'Shreya Mehta', message: 'When are you free this week?', initial: 'SM', color: 'bg-[#fff7ed]', text: 'text-[#c2410c]' },
    { name: 'Rohan Verma', message: 'Session was great, thanks!', initial: 'RV', color: 'bg-[#fef2f2]', text: 'text-[#b91c1c]' },
    { name: 'Neha Joshi', message: 'Are you teaching next week?', initial: 'NJ', color: 'bg-[#f3f4f6]', text: 'text-[#374151]' },
    { name: 'Priya Kumar', message: 'Loved the last session!', initial: 'PK', color: 'bg-[#f0fdf4]', text: 'text-[#15803d]' },
  ];

  return (
    <div className="min-h-screen bg-[#f2ede4] flex flex-col items-center py-20 px-4">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h2 className="text-5xl font-serif font-bold text-[#0f1117] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Real-time skill conversations
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
          Chat instantly with your swap partners via Socket.IO — share resources, plan sessions, and build momentum together
        </p>
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-sm border border-[#e8e2d8] flex overflow-hidden min-h-[600px]">
        
        {/* Sidebar */}
        <div className="w-1/4 border-r border-[#f0eee9]">
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">Messages</h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search conversations..." 
                className="w-full bg-[#f9f8f6] border border-[#eeebe5] rounded-full py-2 px-4 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-2">
            {contacts.map((contact, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${contact.active ? 'bg-[#f2ede4]/50 border-r-4 border-[#2d6a4f]' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-10 h-10 rounded-full ${contact.color} ${contact.text} flex items-center justify-center font-semibold text-xs shrink-0 relative`}>
                  {contact.initial}
                  {contact.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#52b788] border-2 border-white rounded-full"></span>}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm text-[#0f1117] truncate">{contact.name}</h4>
                  <p className="text-xs text-gray-500 truncate">{contact.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-[#f0eee9] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eef2ff] text-[#3730a3] flex items-center justify-center font-semibold text-xs">
              AR
            </div>
            <div>
              <h4 className="font-bold text-sm">Arjun Rao</h4>
              <p className="text-[11px] text-gray-400">
                <span className="text-[#52b788] font-medium">● Online now</span> — Python ↔ Figma swap
              </p>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 p-8 space-y-8 overflow-y-auto bg-white">
            
            {/* Left Message */}
            <div className="max-w-[70%]">
              <div className="bg-[#f2ede4]/60 text-[#0f1117] p-4 rounded-2xl rounded-tl-none text-[14px] leading-relaxed">
                Hey Kavya! Excited to start our skill swap. When would you like to have our first Figma session?
              </div>
              <span className="text-[10px] text-gray-400 mt-2 block ml-1">10:12 AM</span>
            </div>

            {/* Right Message */}
            <div className="max-w-[70%] ml-auto">
              <div className="bg-[#0f1117] text-white p-4 rounded-2xl rounded-tr-none text-[14px] leading-relaxed">
                Hi Arjun! I was thinking we could do 2 sessions a week. I'll teach you Figma basics on Tuesdays and you can walk me through Python on Thursdays 😊
              </div>
              <span className="text-[10px] text-gray-400 mt-2 block text-right mr-1">10:15 AM</span>
            </div>

            {/* Left Message */}
            <div className="max-w-[70%]">
              <div className="bg-[#f2ede4]/60 text-[#0f1117] p-4 rounded-2xl rounded-tl-none text-[14px] leading-relaxed">
                That sounds perfect! I can share a Python notebook to get you started before Thursday. I already prepared some beginner exercises.
              </div>
              <span className="text-[10px] text-gray-400 mt-2 block ml-1">10:18 AM</span>
            </div>

            {/* Right Message */}
            <div className="max-w-[70%] ml-auto">
              <div className="bg-[#0f1117] text-white p-4 rounded-2xl rounded-tr-none text-[14px] leading-relaxed">
                Amazing! I'll share my Figma file with the UI kit I built. It'll be a great starting point for you to learn component-based design.
              </div>
              <span className="text-[10px] text-gray-400 mt-2 block text-right mr-1">10:21 AM</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;