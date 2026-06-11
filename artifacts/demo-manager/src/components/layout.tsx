import { Link, useLocation } from "wouter";
import { HardDrive, MonitorPlay, Settings, Download, Search, LayoutDashboard } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Library", icon: LayoutDashboard },
    { href: "/import", label: "Import", icon: Download },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <MonitorPlay className="w-6 h-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-wider text-foreground">DEMO MANAGER</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center px-4 py-3 rounded-md transition-colors cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center text-xs text-muted-foreground font-mono">
            <HardDrive className="w-4 h-4 mr-2" />
            CS2 VPK Engine
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b border-border flex items-center px-4 bg-card">
          <MonitorPlay className="w-5 h-5 text-primary mr-2" />
          <span className="font-bold">DEMO MANAGER</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
