import React from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// Gráfico de forecast aislado en su propio módulo para poder cargar recharts
// (~111 kB gzip) de forma diferida con React.lazy. Está debajo del fold, así que
// no necesita estar en el bundle inicial.
const ForecastChart = ({ data, margin }) => (
  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
    <AreaChart data={data} margin={margin}>
      <defs>
        <linearGradient id="colorRealLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight="600" />
      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight="600" />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <Area type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorRealLight)" animationDuration={2000} />
      <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" animationDuration={2000} />
    </AreaChart>
  </ResponsiveContainer>
);

export default ForecastChart;
