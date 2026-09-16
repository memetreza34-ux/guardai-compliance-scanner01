import { Outlet } from 'react-router-dom';
// import { Sidebar } from '../../components/Sidebar'; // Assuming we have one, wait we deleted the old Sidebar? No, we deleted the one we created in the root of src/components earlier, but the repo has one?
export default function AppShell() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans overflow-hidden">
      {/* <Sidebar /> */}
      <div className="w-64 border-r border-slate-800 p-4">
         <div className="font-bold mb-4">GuardAI App</div>
         <nav className="flex flex-col gap-2">
            <a href="/app" className="hover:text-emerald-400">Dashboard</a>
            <a href="/app/scans" className="hover:text-emerald-400">Scans</a>
            <a href="/app/ai-governance" className="hover:text-emerald-400">AI Governance</a>
         </nav>
      </div>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}