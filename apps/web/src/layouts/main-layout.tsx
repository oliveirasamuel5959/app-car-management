const MainLayout = ({ children }: { children: React.ReactNode }) => {
  /*
    Full-bleed main: the authenticated AppLayout owns the fixed-header offset and
    all content padding, so this wrapper adds nothing of its own. The header
    itself renders inside AppLayout now — rendering it here as well would put two
    brand bars on the page, which the redesign's diagnosis called out.
  */
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
};

export default MainLayout;
