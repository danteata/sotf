"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan 1",
    total: 780,
  },
  {
    name: "Jan 8",
    total: 820,
  },
  {
    name: "Jan 15",
    total: 795,
  },
  {
    name: "Jan 22",
    total: 840,
  },
  {
    name: "Jan 29",
    total: 860,
  },
  {
    name: "Feb 5",
    total: 830,
  },
  {
    name: "Feb 12",
    total: 845,
  },
  {
    name: "Feb 19",
    total: 855,
  },
  {
    name: "Feb 26",
    total: 870,
  },
  {
    name: "Mar 5",
    total: 880,
  },
  {
    name: "Mar 12",
    total: 890,
  },
  {
    name: "Mar 19",
    total: 900,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

