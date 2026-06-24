"use client";

import {
  FeatureShowcase,
  HomeTopBar,
  ROLE_VISUALS,
  RoleCardGrid,
  RolePickerPanel,
  ThemedRoleCard,
} from "@/components/InterviewHomeTheme";

export default function HomePageClient({ name }: { name: string }) {
  return (
    <main className="theme-home-page">
      <div className="theme-home-shell">
        <HomeTopBar name={name} signedIn />

        <RolePickerPanel>
          <RoleCardGrid>
            {ROLE_VISUALS.map((role) => (
              <ThemedRoleCard
                key={role.id}
                role={role}
                href={`/candidate/dashboard?role=${encodeURIComponent(role.id)}`}
              />
            ))}
          </RoleCardGrid>
        </RolePickerPanel>

        <FeatureShowcase />
      </div>
    </main>
  );
}
