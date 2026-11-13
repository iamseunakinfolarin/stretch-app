import { TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-md px-safe pt-safe pb-safe-tabbar">{children}</main>
      <TabBar />
    </>
  );
}
