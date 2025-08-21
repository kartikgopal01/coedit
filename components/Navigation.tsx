"use client";

import {
  RiArrowRightSLine,
  RiFileTextLine,
  RiHomeLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export default function Navigation() {
  const pathname = usePathname();
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  // Fetch document title if we're on a document page
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "docs" && segments[1] && segments[1] !== "[id]") {
      const docId = segments[1];
      const fetchDocumentTitle = async () => {
        try {
          const docRef = doc(db, "documents", docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDocumentTitle(data.title || "Untitled Document");
          } else {
            setDocumentTitle("Document Not Found");
          }
        } catch (error) {
          console.error("Error fetching document title:", error);
          setDocumentTitle("Document");
        }
      };
      fetchDocumentTitle();
    } else {
      setDocumentTitle(null);
    }
  }, [pathname]);

  // Don't show navigation on the landing page
  if (pathname === "/") return null;

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = `/${segments.slice(0, i + 1).join("/")}`;

      if (segment === "dashboard") {
        breadcrumbs.push({ label: "Dashboard", path, icon: null });
      } else if (segment === "docs") {
        // Skip adding "Documents" as a separate breadcrumb
        continue;
      } else if (segment === "new") {
        breadcrumbs.push({ label: "New Document", path, icon: null });
      } else if (segment !== "[id]" && segment.length > 0) {
        // This is likely a document ID - use the fetched title or fallback
        const title = documentTitle || "Document";
        breadcrumbs.push({ label: title, path, icon: RiFileTextLine });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground px-4 py-2 border-b bg-muted/30">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <RiHomeLine className="h-4 w-4" />
        </Link>
      </Button>

      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center">
          <RiArrowRightSLine className="h-4 w-4 mx-1" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">
              {breadcrumb.icon && (
                <breadcrumb.icon className="h-4 w-4 inline mr-1" />
              )}
              {breadcrumb.label}
            </span>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={breadcrumb.path}>
                {breadcrumb.icon && (
                  <breadcrumb.icon className="h-4 w-4 mr-1" />
                )}
                {breadcrumb.label}
              </Link>
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}
