import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 p-8">
      <SignedOut>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to CoEdit</h1>
          <p className="text-lg text-gray-600 mb-8">
            A real-time collaborative document platform with version control.
            Sign in to start creating and collaborating on documents.
          </p>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Your Documents</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Document cards will go here */}
            <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
              <h3 className="font-semibold mb-2">Create New Document</h3>
              <p className="text-sm text-gray-600 mb-4">Start a new collaborative document</p>
              <Link
                href="/docs/new"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Create Document
              </Link>
            </div>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
