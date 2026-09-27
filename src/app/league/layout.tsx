import { LeagueTabs } from "@/components/league-tabs";

export default function LeagueLayout({ children }: LayoutProps<"/league">) {
  return (
    <>
      <LeagueTabs />
      {children}
    </>
  );
}
