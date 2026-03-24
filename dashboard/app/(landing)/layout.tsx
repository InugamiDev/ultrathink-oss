/* Full-screen layout for marketing pages — covers the dashboard chrome */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#06060e]">{children}</div>;
}
