import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold tracking-tight">
          <span className="text-red-500">4</span>0<span className="text-red-500">4</span>
        </p>
        <h1 className="text-2xl font-semibold mt-4">Page not found</h1>
        <p className="text-white/60 mt-2">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
