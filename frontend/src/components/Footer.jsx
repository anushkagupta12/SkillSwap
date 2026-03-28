// src/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    // <footer className="bg-gray-900 text-white py-10">
    //   <div className="container mx-auto px-4">
    //     <div className="flex justify-between items-start">
    //       <div className="w-1/4">
    //         <h2 className="text-lg font-bold">SkillSwap</h2>
    //         <p className="text-sm mt-2">
    //           Connecting people through knowledge exchange for a better, more collaborative future.
    //         </p>
    //       </div>
    //       <div className="w-1/4">
    //         <h3 className="text-md font-semibold">Navigation</h3>
    //         <ul className="mt-2">
    //           <li><a href="#" className="text-sm hover:underline">Home</a></li>
    //           <li><a href="#" className="text-sm hover:underline">How It Works</a></li>
    //           <li><a href="#" className="text-sm hover:underline">Browse Skills</a></li>
    //           <li><a href="#" className="text-sm hover:underline">AI Matching</a></li>
    //         </ul>
    //       </div>
    //       <div className="w-1/4">
    //         <h3 className="text-md font-semibold">Legal</h3>
    //         <ul className="mt-2">
    //           <li><a href="#" className="text-sm hover:underline">Privacy Policy</a></li>
    //           <li><a href="#" className="text-sm hover:underline">Terms of Service</a></li>
    //           <li><a href="#" className="text-sm hover:underline">Cookie Policy</a></li>
    //         </ul>
    //       </div>
    //       <div className="w-1/4">
    //         <h3 className="text-md font-semibold">Contact Us</h3>
    //         <p className="text-sm mt-2">+1 (555) 123-4567</p>
    //         <p className="text-sm">hello@skillswap.com</p>
    //         <div className="flex space-x-4 mt-2">
    //           <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-twitter"></i></a>
    //           <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-instagram"></i></a>
    //           <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-linkedin"></i></a>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    //   <div className="border-t border-gray-700 mt-5 pt-5 text-center text-sm">
    //     © 2023 SkillSwap. All rights reserved.
    //   </div>
    // </footer>
    <footer className="bg-[#0b0f1a] text-[#9ca3af] pt-20 pb-10 px-10">
      <div className="max-w-7xl mx-auto">

        {/* Top Grid */}
        <div className="grid grid-cols-4 gap-16 mb-16">

          {/* Logo + Description */}
          <div>
            <h2 className="text-white text-2xl font-semibold mb-4">
              Skill<span className="text-[#52b788]">Swap</span>
            </h2>

            <p className="text-sm leading-relaxed max-w-xs">
              A platform for humans who believe the best way to learn is to teach,
              and the best currency is genuine knowledge shared freely.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm text-[#6b7280] uppercase mb-4 tracking-wider">
              Platform
            </h4>
            <ul className="space-y-3">
              <li className="hover:text-white cursor-pointer">Browse Skills</li>
              <li className="hover:text-white cursor-pointer">Find Matches</li>
              <li className="hover:text-white cursor-pointer">Community</li>
              <li className="hover:text-white cursor-pointer">Leaderboard</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm text-[#6b7280] uppercase mb-4 tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              <li className="hover:text-white cursor-pointer">About Us</li>
              <li className="hover:text-white cursor-pointer">Blog</li>
              <li className="hover:text-white cursor-pointer">Careers</li>
              <li className="hover:text-white cursor-pointer">Press</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm text-[#6b7280] uppercase mb-4 tracking-wider">
              Support
            </h4>
            <ul className="space-y-3">
              <li className="hover:text-white cursor-pointer">Help Center</li>
              <li className="hover:text-white cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white cursor-pointer">Terms of Service</li>
              <li className="hover:text-white cursor-pointer">Contact</li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-[#1f2937] pt-6 flex items-center justify-between flex-wrap gap-4">

          {/* Left */}
          <p className="text-sm">
            © 2026 SkillSwap. Built with React, Node.js, Express & MongoDB.
          </p>

          {/* Right Social Icons */}
          <div className="flex items-center gap-4">

            <div className="w-10 h-10 flex items-center justify-center border border-[#1f2937] rounded-full hover:bg-[#111827] cursor-pointer">
              x
            </div>

            <div className="w-10 h-10 flex items-center justify-center border border-[#1f2937] rounded-full hover:bg-[#111827] cursor-pointer">
              in
            </div>

            <div className="w-10 h-10 flex items-center justify-center border border-[#1f2937] rounded-full hover:bg-[#111827] cursor-pointer">
              gh
            </div>

          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;
