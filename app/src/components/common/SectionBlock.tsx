function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

export default SectionBlock;
