import { TrendingUp, Phone, Target, Clock } from 'lucide-react';

type QuickStatProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'blue' | 'amber' | 'indigo';
};

function StatCard({ label, value, icon, trend, color = 'indigo' }: QuickStatProps) {
  const colorMap = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    indigo: 'text-indigo-500'
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-200/50 dark:border-slate-800">
      <div className={`p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-tight">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{value}</p>
          {trend && (
            <TrendingUp className={`w-3 h-3 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`} />
          )}
        </div>
      </div>
    </div>
  );
}

type QuickStatsProps = {
  todaysCalls: number;
  connectRate: number;
  avgDuration: number;
  revenue: number;
};

export function QuickStats({ todaysCalls, connectRate, avgDuration, revenue }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard
        label="Calls Today"
        value={todaysCalls}
        icon={<Phone className="w-4 h-4" />}
        color="indigo"
      />
      <StatCard
        label="Connect Rate"
        value={`${connectRate}%`}
        icon={<Target className="w-4 h-4" />}
        color="emerald"
        trend="up"
      />
      <StatCard
        label="Avg Duration"
        value={`${avgDuration}m`}
        icon={<Clock className="w-4 h-4" />}
        color="blue"
      />
      <StatCard
        label="Revenue"
        value={`$${revenue}`}
        icon={<TrendingUp className="w-4 h-4" />}
        color="amber"
        trend="up"
      />
    </div>
  );
}
