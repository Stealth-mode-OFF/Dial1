import React from 'react';
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

export function Intelligence() {
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
          { label: 'Conversion Rate', value: '18.4%', trend: '+2.1%', up: true, icon: Target },
          { label: 'Avg Call Duration', value: '4m 12s', trend: '+30s', up: true, icon: Clock },
          { label: 'Objections Handled', value: '84%', trend: '-2%', up: false, icon: AlertTriangle },
          { label: 'Total Revenue', value: '$12,450', trend: '+15%', up: true, icon: TrendingUp },
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
            {[
              { label: 'Too Expensive', count: 42, color: 'bg-red-500' },
              { label: 'Send me an email', count: 28, color: 'bg-orange-500' },
              { label: 'Competitor Contract', count: 15, color: 'bg-yellow-500' },
              { label: 'Bad Timing', count: 12, color: 'bg-indigo-500' },
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="text-slate-900">{item.count}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${(item.count / 42) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call Sentiment Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              Market Pulse
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Last 30 Days</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-6">
            <p className="text-indigo-900 font-medium text-sm leading-relaxed">
              <span className="font-bold">Insight:</span> Prospects in the FinTech sector are responding 20% better to the "Compliance" value prop this week.
            </p>
          </div>
          <div className="space-y-4">
             <div className="flex items-center gap-4">
               <div className="w-16 text-xs font-bold text-slate-500">FinTech</div>
               <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                 <div className="w-[60%] bg-emerald-400"></div>
                 <div className="w-[30%] bg-slate-300"></div>
                 <div className="w-[10%] bg-red-400"></div>
               </div>
               <div className="w-8 text-xs font-bold text-emerald-600">60%</div>
             </div>
             <div className="flex items-center gap-4">
               <div className="w-16 text-xs font-bold text-slate-500">SaaS</div>
               <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                 <div className="w-[45%] bg-emerald-400"></div>
                 <div className="w-[20%] bg-slate-300"></div>
                 <div className="w-[35%] bg-red-400"></div>
               </div>
               <div className="w-8 text-xs font-bold text-emerald-600">45%</div>
             </div>
             <div className="flex items-center gap-4">
               <div className="w-16 text-xs font-bold text-slate-500">Retail</div>
               <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                 <div className="w-[30%] bg-emerald-400"></div>
                 <div className="w-[50%] bg-slate-300"></div>
                 <div className="w-[20%] bg-red-400"></div>
               </div>
               <div className="w-8 text-xs font-bold text-emerald-600">30%</div>
             </div>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-slate-400">
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Positive</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Neutral</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Negative</div>
          </div>
        </div>
      </div>
    </div>
  );
}