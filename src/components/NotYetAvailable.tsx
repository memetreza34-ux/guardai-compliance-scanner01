import { ShieldAlert } from 'lucide-react';

export default function NotYetAvailable({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
      <ShieldAlert className="w-12 h-12 text-slate-500 mb-4" />
      <h2 className="text-xl font-semibold text-slate-200">{title}</h2>
      <p className="text-sm text-slate-400 mt-2 max-w-md">
        This module is currently unavailable or requires configuration.
      </p>
    </div>
  );
}