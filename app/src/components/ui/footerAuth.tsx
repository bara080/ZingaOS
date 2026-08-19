'use client';

export default function FooterAuth() {
  return (
    <div>
      <footer className="w-full p-4 text-center mt-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Zinga App. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
