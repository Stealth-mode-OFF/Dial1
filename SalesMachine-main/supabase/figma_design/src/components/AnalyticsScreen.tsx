import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, MessageSquare, Zap, ThumbsUp, AlertTriangle, Shield, Trophy, User, Battery, Coffee, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function AnalyticsScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-139017f8/analytics`, {
                headers: { 'Authorization': `Bearer ${publicAnonKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Analytics fetch error", e);
        } finally {
            setLoading(false);
        }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
      return (
          <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
      );
  }

  // Fallback data if stats are empty (fresh install)
  const chartData = stats?.dailyVolume?.length > 0 ? stats.dailyVolume : [{ time: 'Today', value: 0 }];
  const breakdownData = stats?.dispositionBreakdown?.length > 0 ? stats.dispositionBreakdown : [{ name: 'No Data', value: 0 }];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-20 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Intelligence Hub</h1>
           <p className="text-slate-500 text-sm">Post-game analysis based on your live calls.</p>
         </div>
         <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Clock className="w-4 h-4 text-indigo-500" /> Real-time Data
         </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-6">
        <KpiCard 
          icon={<Trophy className="w-5 h-5 text-yellow-600" />} 
          label="Total Interactions" 
          value={stats?.totalCalls || 0} 
          subtext="Calls & Emails"
          color="bg-yellow-50 border-yellow-100"
        />
        <KpiCard 
          icon={<Zap className="w-5 h-5 text-indigo-600" />} 
          label="Connect Rate" 
          value={`${stats?.connectRate || 0}%`} 
          subtext="Target: 15%"
          color="bg-indigo-50 border-indigo-100"
        />
        <KpiCard 
          icon={<Shield className="w-5 h-5 text-emerald-600" />} 
          label="Est. Pipeline Value" 
          value={`€${stats?.revenue || 0}`} 
          subtext="Based on €500/demo"
          color="bg-emerald-50 border-emerald-100"
        />
        <KpiCard 
          icon={<MessageSquare className="w-5 h-5 text-blue-600" />} 
          label="Talk/Listen Ratio" 
          value="45/55" 
          subtext="Optimal range"
          color="bg-blue-50 border-blue-100"
        />
      </div>

      {/* Main Chart Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Activity Trend Chart */}
        <div className="col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-indigo-500" /> Activity Velocity
             </h3>
             <span className="text-xs font-mono text-slate-400">VOLUME / DAY</span>
           </div>
           <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Disposition Breakdown */}
        <div className="col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
             <AlertTriangle className="w-4 h-4 text-amber-500" /> Outcome Distribution
           </h3>
           <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData} layout="vertical" margin={{ left: 0, right: 30 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} />
                   <Tooltip cursor={{fill: 'transparent'}} />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {breakdownData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={
                            entry.name === 'connected' ? '#10b981' : 
                            entry.name === 'no-answer' ? '#94a3b8' : 
                            '#6366f1'
                        } />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>


    </div>
  );
}

function KpiCard({ icon, label, value, subtext, color }: any) {
  return (
    <div className={`p-5 rounded-xl border ${color}`}>
       <div className="flex items-center gap-3 mb-3">
          <div className="bg-white p-2 rounded-lg shadow-sm">{icon}</div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
       </div>
       <div className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</div>
       <div className="text-xs font-medium opacity-70">{subtext}</div>
    </div>
  );
}
