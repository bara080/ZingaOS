"use client";

export default function CardList({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-lg font-medium mb-6">{title}</h1>
    </div>
  );
}
