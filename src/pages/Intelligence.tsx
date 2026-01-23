import React from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Filter,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { useSales } from '../contexts/SalesContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ElementType> = {
  'Filter': Filter,
  'Target': Target,
  'ArrowDownRight': ArrowDownRight,
  'Phone': Phone,
  'Calendar': Calendar,
  'TrendingUp': TrendingUp,
  'Download': Download
};

export function Intelligence() {
  const { stats, schedule, updateScheduleStatus } = useSales();

  const handleToggleStatus = (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      updateScheduleStatus(id, newStatus);
  };

  return (
    <div className="p-4 space-y-6 relative font-sans text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end bg-white border-2 border-black p-4 neobrutal-shadow gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-600 text-white px-2 py-0.5 text-xs font-mono font-bold uppercase border-2 border-black">Analytics V2.0</span>
           </div>
           <h1 className="text-4xl font-black text-black uppercase tracking-tighter leading-none">Intelligence Hub</h1>
        </div>
        
        <div className="flex gap-3">
           <button className="bg-white border-2 border-black px-4 py-2 font-bold font-mono text-xs uppercase flex items-center gap-2 hover:bg-slate-100 shadow-[2px_2px_0px_0px_black] active:translate-y-[2px] active:shadow-none transition-all">
              <Calendar size={14} /> Last 7 Days
           </button>
           <button className="bg-black text-white border-2 border-black px-4 py-2 font-bold font-mono text-xs uppercase flex items-center gap-2 hover:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none transition-all">
              <Download size={14} /> Export CSV
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Calls', value: stats.callsToday, change: '+12%', color: 'bg-white', text: 'text-black' },
           { label: 'Connect Rate', value: '18%', change: '-2%', color: 'bg-white', text: 'text-black' },
           { label: 'Meetings Booked', value: stats.meetingsBooked, change: '+5%', color: 'bg-yellow-300', text: 'text-black' },
           { label: 'Pipeline Added', value: `€${stats.pipelineValue.toLocaleString()}`, change: '+24%', color: 'bg-black', text: 'text-white' }
         ].map((kpi, i) => (
           <div key={i} className={`${kpi.color} border-2 border-black p-4 shadow-[4px_4px_0px_0px_black] group hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_0px_black] transition-all`}>
              <div className={`text-xs font-mono font-bold uppercase mb-2 ${kpi.text === 'text-white' ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.label}</div>
              <div className={`text-4xl font-black mb-2 ${kpi.text} tracking-tighter`}>{kpi.value}</div>
              <div className={`inline-flex items-center gap-1 text-xs font-bold border-2 border-current px-1 ${kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-500'} ${kpi.text === 'text-white' && kpi.change.startsWith('+') ? 'text-green-400 border-green-400' : ''} ${kpi.text === 'text-white' && kpi.change.startsWith('-') ? 'text-red-400 border-red-400' : ''}`}>
                 {kpi.change.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                 {kpi.change}
              </div>
           </div>
         ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Main Chart - TACTICAL SCHEDULE (Connected to Backend) */}
         <div className="lg:col-span-2 bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_black] relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
               <h3 className="text-xl font-black uppercase flex items-center gap-2">
                  <Calendar size={24} strokeWidth={3} /> 
                  <span className="bg-yellow-300 px-2 border-2 border-black shadow-[2px_2px_0px_0px_black] rotate-1">Tactical Schedule</span>
               </h3>
               <div className="flex items-center gap-2">
                   <div className="text-[10px] font-mono font-bold uppercase bg-slate-100 px-2 py-1 border-2 border-black">Max 5h Active Duty</div>
                   <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-black animate-pulse"></div>
               </div>
            </div>

            <div className="space-y-0 relative">
                {/* Vertical Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-200 z-0"></div>

                {schedule.map((slot, i) => {
                    const Icon = iconMap[slot.icon] || Target;
                    return (
                        <div key={i} className={`relative z-10 flex gap-4 group ${slot.type === 'break' ? 'opacity-70 hover:opacity-100' : ''}`}>
                            {/* Time Column */}
                            <div className="w-14 flex flex-col items-end pt-1">
                                <span className="text-xs font-mono font-black text-slate-900">{slot.time}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">{slot.end}</span>
                            </div>

                            {/* Timeline Node */}
                            <div className="relative pt-1">
                                <button 
                                    onClick={() => handleToggleStatus(slot.id, slot.status)}
                                    className={`w-4 h-4 border-2 border-black rounded-full z-20 relative flex items-center justify-center transition-colors ${
                                    slot.status === 'completed' ? 'bg-green-500' :
                                    slot.type === 'work' ? 'bg-black' : 
                                    slot.type === 'break' ? 'bg-white' : 'bg-yellow-300'
                                }`}>
                                    {slot.status === 'completed' && <CheckCircle2 size={10} className="text-white" />}
                                </button>
                            </div>

                            {/* Content Card */}
                            <div 
                                onClick={() => handleToggleStatus(slot.id, slot.status)}
                                className={`flex-1 mb-4 p-3 border-2 border-black transition-all cursor-pointer ${
                                slot.status === 'completed' ? 'bg-slate-100 opacity-60 decoration-slate-400' :
                                slot.type === 'work' ? 'bg-white shadow-[4px_4px_0px_0px_black] hover:translate-x-1' : 
                                slot.type === 'break' ? 'bg-slate-50 border-dashed text-slate-500' : 
                                'bg-yellow-50 shadow-[2px_2px_0px_0px_black]'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className={`text-sm font-black uppercase flex items-center gap-2 ${slot.type === 'work' ? 'text-black' : 'text-slate-600'} ${slot.status === 'completed' ? 'line-through decoration-2 decoration-black' : ''}`}>
                                            <Icon size={14} />
                                            {slot.title}
                                        </div>
                                        <div className="text-xs font-mono font-bold mt-1 opacity-80">{slot.desc}</div>
                                    </div>
                                    {slot.type === 'work' && slot.status !== 'completed' && (
                                        <div className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 uppercase">Focus</div>
                                    )}
                                    {slot.status === 'completed' && (
                                        <div className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 uppercase border border-green-500">Done</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="ml-20 mt-2 p-3 bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] text-center transform -rotate-1">
                    <div className="text-lg font-black uppercase tracking-widest">System Shutdown</div>
                    <div className="text-xs font-mono text-yellow-300">Recover for tomorrow.</div>
                </div>
            </div>
         </div>

         {/* Secondary Stats */}
         <div className="bg-slate-50 border-2 border-black p-6 space-y-6 shadow-[4px_4px_0px_0px_black]">
            <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2">Top Objections</h3>
            
            <div className="space-y-4">
               {[
                  { name: "Too expensive", count: 42, pct: 45 },
                  { name: "Send email", count: 28, pct: 30 },
                  { name: "Not interested", count: 15, pct: 16 },
               ].map((obj, i) => (
                  <div key={i} className="group cursor-pointer">
                     <div className="flex justify-between text-xs font-bold uppercase mb-1">
                        <span>{obj.name}</span>
                        <span className="font-mono">{obj.count} ({obj.pct}%)</span>
                     </div>
                     <div className="w-full h-6 bg-white border-2 border-black relative">
                        <div 
                           className="h-full bg-orange-500 absolute top-0 left-0 border-r-2 border-black transition-all group-hover:bg-orange-400" 
                           style={{ width: `${obj.pct}%` }}
                        ></div>
                     </div>
                  </div>
               ))}
            </div>

            <div className="bg-blue-600 text-white p-4 border-2 border-black mt-6 transform rotate-1">
               <div className="text-[10px] font-mono font-bold uppercase opacity-70 mb-1">AI Coach Insight</div>
               <div className="font-bold text-sm leading-tight">"Focus on price objection handling. Your conversion drops by 15% when budget is mentioned."</div>
            </div>
         </div>

      </div>
    </div>
  );
}
