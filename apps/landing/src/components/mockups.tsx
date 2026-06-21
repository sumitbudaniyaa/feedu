/* Real Feedu app screenshots (in /public/mockups), framed for the landing.
   Same export names as before so every section keeps working. */

/** Framed desktop/app screenshot. */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="shadow-product overflow-hidden rounded-2xl ring-1 ring-black/5">
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}

/** Owner dashboard (admin app). */
export function DashboardMockup() {
  return <Shot src="/mockups/admin.png" alt="Feedu owner dashboard" />;
}

/** Compact dashboard tile — reuses the admin screenshot. */
export function MiniDashboard(_props?: { variant?: 'owner' | 'platform' }) {
  return <Shot src="/mockups/admin.png" alt="Feedu dashboard" />;
}

/** Kitchen display system. */
export function KdsMockup() {
  return <Shot src="/mockups/kitchen.png" alt="Feedu kitchen display" />;
}

/** Waiter / floor app. */
export function WaiterPanel() {
  return <Shot src="/mockups/waiter.png" alt="Feedu waiter floor" />;
}

/** Customer ordering PWA — shown in a phone frame. */
export function PhoneMockup() {
  return (
    <div className="shadow-product mx-auto w-[248px] overflow-hidden rounded-[2.2rem] border-[6px] border-[#111] bg-[#111]">
      <img src="/mockups/userapp.png" alt="Feedu customer app" loading="lazy" className="block w-full rounded-[1.7rem]" />
    </div>
  );
}
