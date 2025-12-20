export default function Footer() {
  return (
    <footer className="relative mt-24">
      {/* Curved Top Shape */}
      <div className="absolute top-0 left-0 right-0 -mt-10">
        <svg
          viewBox="0 0 1440 120"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 C360,160 1080,0 1440,80 L1440,0 L0,0 Z"
            fill="#e6f3ff"
          ></path>
        </svg>
      </div>

      <div className="backdrop-blur-xl bg-white/50 shadow-2xl border-t border-white/40">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Logo & Caption */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <img
                src="/og-image.png"
                className="w-14 h-14 rounded-xl shadow-md"
                alt="Logo"
              />
              <h1 className="text-2xl font-bold text-[#0066b8]">
                Campus Toolkit
              </h1>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Made by students for students 💙
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-[#0066b8]">
              Quick Navigation
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li><a href="/" className="hover:text-[#004a86] transition">Home</a></li>
              <li><a href="/papers" className="hover:text-[#004a86] transition">Exam Papers</a></li>
              <li><a href="/materials" className="hover:text-[#004a86] transition">Study Materials</a></li>
              <li><a href="/attendance" className="hover:text-[#004a86] transition">Attendance Tool</a></li>
              <li><a href="/request" className="hover:text-[#004a86] transition">Request Resources</a></li>
            </ul>
          </div>

          {/* Social / Contact */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-[#0066b8]">
              Connect With Us
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Follow updates & contribute
            </p>

            {/*<div className="flex justify-center md:justify-start gap-4 text-2xl mt-4 text-[#0066b8]">
              <a className="hover:text-[#004a86] transition">🐦</a>
              <a className="hover:text-[#004a86] transition">📘</a>
              <a className="hover:text-[#004a86] transition">📸</a>
              <a className="hover:text-[#004a86] transition">💼</a>
            </div>*/}
            <div className="mt-4 text-sm text-gray-700 space-y-1">

              <p>Email: <a href="mailto:campus-toolkit@example.com">studentskare@gmail.com</a></p>
              </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="border-t border-white/40 py-5 text-center text-xs text-gray-500 backdrop-blur-lg">
          © {new Date().getFullYear()} Campus Toolkit • Empowering Students Everywhere
        </div>
      </div>
    </footer>
  );
}
