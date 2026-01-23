import React from 'react';
import { useSales } from '../contexts/SalesContext';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export function Intelligence({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { stats, objectionCounts, recentActivity } = useSales();

  const connectRate = stats.callsToday > 0 ? Math.round((stats.connected / stats.callsToday) * 100) : 0;
  
  // Calculate top objections dynamically from context
  const sortedObjections = Object.entries(objectionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4);

  const totalObjections = Object.values(objectionCounts).reduce((a, b) => a + b, 0);

  const objectionColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-indigo-500'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Intelligence Hub</h1>
          <p className="text-slate-500 font-medium mt-1">Tactical analysis of your sales performance</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option>This Week</option>
            <option>Last Week</option>
            <option>This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Connect Rate', value: `${connectRate}%`, trend: '+2.1%', up: true, icon: Target },
          { label: 'Avg Call Duration', value: '4m 12s', trend: '+30s', up: true, icon: Clock },
          { label: 'Meetings Booked', value: stats.meetingsBooked.toString(), trend: '+2', up: true, icon: Users },
          { label: 'Pipeline Value', value: `€${stats.pipelineValue.toLocaleString()}`, trend: '+15%', up: true, icon: TrendingUp },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                <kpi.icon size={20} className="text-slate-400 group-hover:text-indigo-600" />
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${kpi.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {kpi.up ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                {kpi.trend}
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{kpi.value}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Objection Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Top Objections
            </h3>
            <button className="text-indigo-600 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {sortedObjections.map(([label, count], i) => (
              <div key={label} className="group">
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="text-slate-700">{label}</span>
                  <span className="text-slate-900">{count}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${objectionColors[i % 4]} rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${(count / (totalObjections || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed (replaced static Market Pulse) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              Recent Activity
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Live Feed</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px]">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  activity.type === 'meeting' ? 'bg-indigo-100 text-indigo-600' : 
                  activity.type === 'call' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activity.type === 'meeting' ? <Users size={18} /> : 
                   activity.type === 'call' ? <Clock size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{activity.description}</p>
                  <p className="text-xs text-slate-500">{activity.timestamp}</p>
                </div>
                {activity.score && (
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${activity.score > 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                    {activity.score}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
