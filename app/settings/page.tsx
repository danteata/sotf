"use client"

import { useState } from "react"
import {
  Bell,
  Calendar,
  Car,
  Home,
  LogOut,
  Mail,
  UserIcon as Male,
  MapPin,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Wrench,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import React from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile")

  const tabs = ["My details", "Profile", "Password", "Email", "Notification"]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-[220px] border-r bg-white flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center">
            <span className="text-white font-bold">M</span>
          </div>
          <span className="font-bold text-lg">Motiv.</span>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <NavItem icon={<Home size={18} />} label="Dashboard" />
            <NavItem icon={<Package size={18} />} label="Assets" />
            <NavItem icon={<Calendar size={18} />} label="Booking" />
            <NavItem icon={<Car size={18} />} label="Sell Cars" />
            <NavItem icon={<ShoppingCart size={18} />} label="Buy Cars" />
            <NavItem icon={<Wrench size={18} />} label="Services" />
            <NavItem icon={<Calendar size={18} />} label="Calender" />
            <NavItem icon={<Mail size={18} />} label="Messages" />
          </ul>
        </nav>

        <div className="mt-auto py-4 border-t">
          <ul className="space-y-1">
            <NavItem icon={<Settings size={18} />} label="Settings" active />
            <NavItem icon={<LogOut size={18} />} label="Log out" />
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-4">
          <div className="w-[300px]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input className="pl-8 bg-gray-100 border-0" placeholder="Search or type" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            </div>
            <Bell className="text-gray-500" />
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl bg-white rounded-lg p-6 mx-auto">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {/* Tabs */}
            <div className="flex border-b mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`pb-3 px-4 font-medium ${activeTab === tab ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-600"
                    }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Profile Content */}
            <div>
              <h2 className="text-lg font-semibold">Profile</h2>
              <p className="text-gray-500 mb-6">Update your photo and personal details here.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Live in</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-10" defaultValue="Zurich, Switzerland" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-10" defaultValue="2445 Crosswind Drive" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-10" defaultValue="uihutofficial@gmail.com" />
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-10" defaultValue="07.12.195" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <div className="relative">
                    <Male className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-10" defaultValue="Male" />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Your photo</h3>
                <p className="text-gray-500 text-sm mb-4">This will be displayed on your profile.</p>

                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src="/placeholder.svg?height=64&width=64" alt="Profile" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" className="text-purple-600">
                      Update
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Social Profiles</h3>

                <div className="space-y-4">
                  <Input placeholder="facebook.com/" />

                  <Input placeholder="twitter.com/" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active = false }: NavItemProps) {
  return (
    <li>
      <a
        href="#"
        className={`flex items-center gap-3 px-4 py-2 text-sm ${active ? "bg-gray-100 text-purple-600 font-medium" : "text-gray-600 hover:bg-gray-50"
          }`}
      >
        <span className="text-gray-500">{icon}</span>
        <span>{label}</span>
      </a>
    </li>
  )
}
