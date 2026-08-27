'use client';
import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Contact Us</h1>
        <p className="text-emerald-400 text-xs mt-1">We'd love to hear from you</p>
      </div>

      <div className="border border-emerald-900/60 bg-[#0B101D] rounded-3xl p-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-emerald-700/80 flex items-center justify-center text-[#E05638] mx-auto">
          <Mail className="h-6 w-6 text-[#E05638]" />
        </div>
        <h2 className="text-xl font-bold text-[#E05638]">Get in Touch</h2>
        <p className="text-xs text-emerald-400 max-w-md mx-auto leading-relaxed">
          If you have any questions, feedback or would like to report an issue, please reach out to us at{' '}
          <a href="mailto:info@foodieprep.ai" className="font-bold underline text-emerald-300">info@foodieprep.ai</a>{' '}
          and we will get back to you as soon as we can.
        </p>
      </div>
    </div>
  );
}
