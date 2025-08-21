"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { db } from "@/lib/firebase-client";
import type { DocumentData } from "@/lib/firestore-types";
// Removed PendingInvites card in favor of header notifications on dashboard

// Utility function to format Firebase timestamps
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return "Unknown";
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return format(timestamp.toDate(), "MMM d, yyyy 'at' h:mm a");
  }
  if (timestamp instanceof Date) {
    return format(timestamp, "MMM d, yyyy 'at' h:mm a");
  }
  return "Unknown";
};

export default function DashboardPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [ownedDocs, setOwnedDocs] = useState<DocumentData[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentData[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [ownerNames, setOwnerNames] = useState<
    Record<string, { name: string; email?: string; imageUrl?: string }>
  >({});

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (!userId) return;
    const ownedQ = query(
      collection(db, "documents"),
      where("ownerId", "==", userId)
    );
    const sharedQ = query(
      collection(db, "documents"),
      where("collaborators", "array-contains", userId)
    );
    const unsubOwned = onSnapshot(ownedQ, (snap) => {
      const items: DocumentData[] = [];
      snap.docs.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as DocumentData);
      });
      setOwnedDocs(items);
    });
    const unsubShared = onSnapshot(sharedQ, (snap) => {
      const items: DocumentData[] = [];
      snap.docs.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as DocumentData);
      });
      setSharedDocs(items);
    });
    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [userId]);

  // Fetch owner profile names for shared docs
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const ids = Array.from(
          new Set(sharedDocs.map((d) => d.ownerId).filter(Boolean))
        );
        if (ids.length === 0) return;
        const res = await fetch("/api/users/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<
          string,
          { name: string; email?: string; imageUrl?: string }
        > = {};
        for (const p of data.profiles || []) {
          map[p.id] = { name: p.name, email: p.email, imageUrl: p.imageUrl };
        }
        setOwnerNames((prev) => ({ ...prev, ...map }));
      } catch (e) {
        console.error("Failed to fetch owner profiles", e);
      }
    };
    fetchOwners();
  }, [sharedDocs]);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RiLoader4Line className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access your dashboard.
          </p>
          <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle.trim() || "Untitled",
          description: newDocDescription.trim() || "",
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create document");
      }
      const { id } = await res.json();
      setShowCreateDialog(false);
      setNewDocTitle("");
      setNewDocDescription("");
      router.push(`/docs/${id}`);
    } catch (error) {
      console.error("Error creating document:", error);
      // You could add a toast notification here
    } finally {
      setIsCreating(false);
    }
  };

  const handleCollaborate = async () => {
    if (!joinUrl.trim()) return;

    setIsJoining(true);
    setJoinError("");
    try {
      const url = new URL(joinUrl);
      router.push(url.pathname + url.search);
    } catch {
      // If a plain key is pasted or invalid URL, show error
      setJoinError("Please enter a valid URL");
      console.error("Invalid URL format");
    } finally {
      setIsJoining(false);
    }
  };

  const handleEditDocument = (doc: DocumentData) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || "");
    setEditDescription(doc.description || "");
  };

  const handleUpdateDocument = async () => {
    if (!editingDoc) return;

    setIsUpdating(true);
    try {
      const docRef = doc(db, "documents", editingDoc.id);
      await updateDoc(docRef, {
        title: editTitle.trim() || "Untitled",
        description: editDescription.trim() || "",
        updatedAt: new Date(),
      });
      setEditingDoc(null);
      setEditTitle("");
      setEditDescription("");
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setDeletingDocId(docId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDocId) return;

    setIsDeleting(true);
    try {
      const docRef = doc(db, "documents", deletingDocId);
      await deleteDoc(docRef);
      setShowDeleteDialog(false);
      setDeletingDocId(null);
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="flex-1 p-6 md:p-8 lg:p-12">
      <SignedOut>
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-8 md:p-12">
            <CardHeader className="space-y-4">
              <CardTitle className="text-3xl md:text-4xl font-bold">
                Welcome to CoEdit
              </CardTitle>
              <CardDescription className="text-base md:text-lg leading-relaxed">
                A real-time collaborative document platform with version
                control. Sign in to start creating and collaborating on
                documents.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12">
          {/* Header Section */}
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-base">
                  Create or join collaborative documents.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Create Document
                </Button>

                {/* Divider */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-muted-foreground px-2">or</span>
                </div>

                {/* Join Document Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={joinUrl}
                      onChange={(e) => {
                        setJoinUrl(e.target.value);
                        setJoinError(""); // Clear error when user types
                      }}
                      placeholder="Paste a share link to collaborate"
                      className={`w-full sm:w-80 h-10 ${
                        joinError ? "border-destructive" : ""
                      }`}
                    />
                    <Button
                      onClick={handleCollaborate}
                      variant="secondary"
                      size="lg"
                      disabled={isJoining || !joinUrl.trim()}
                    >
                      {isJoining ? (
                        <>
                          <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
                          Joining...
                        </>
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>
                  {joinError && (
                    <p className="text-sm text-destructive">{joinError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid gap-8 lg:gap-12 md:grid-cols-2">
            {/* Your Documents */}
            <Card className="shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  Your Documents
                  <Badge variant="secondary" className="text-sm">
                    {ownedDocs.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base">
                  Documents you've created and own
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ownedDocs.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-2">
                        No documents yet
                      </div>
                      <Button
                        onClick={handleCreate}
                        variant="outline"
                        size="sm"
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <>
                            <RiLoader4Line className="h-3 w-3 animate-spin mr-1" />
                            Creating...
                          </>
                        ) : (
                          "Create your first document"
                        )}
                      </Button>
                    </div>
                  )}
                  {ownedDocs.map((d) => (
                    <Card
                      key={d.id}
                      className="hover:bg-muted/50 transition-all duration-200"
                    >
                      <CardContent>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/docs/${d.id}`}
                            className="flex-1 min-w-0"
                          >
                            <div className="font-medium text-base mb-1 truncate">
                              {d.title || "Untitled"}
                            </div>
                            {d.description && (
                              <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {d.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Updated {formatTimestamp(d.updatedAt)}
                            </div>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <RiMoreLine className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditDocument(d)}
                              >
                                <RiEditLine className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteDocument(d.id)}
                                className="text-destructive"
                              >
                                <RiDeleteBinLine className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shared Documents */}
            <Card className="shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  Shared Documents
                  <Badge variant="secondary" className="text-sm">
                    {sharedDocs.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base">
                  Documents shared with you by others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sharedDocs.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-2">
                        No shared documents yet
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Documents shared with you will appear here
                      </p>
                    </div>
                  )}
                  {sharedDocs.map((d) => (
                    <Card
                      key={d.id}
                      className="hover:bg-muted/50 transition-all duration-200"
                    >
                      <CardContent>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/docs/${d.id}`}
                            className="flex-1 min-w-0"
                          >
                            <div className="font-medium text-base mb-1 truncate">
                              {d.title || "Untitled"}
                            </div>
                            {d.description && (
                              <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {d.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Owner: {ownerNames[d.ownerId]?.name || d.ownerId}
                            </div>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <RiMoreLine className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditDocument(d)}
                              >
                                <RiEditLine className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SignedIn>

      {/* Create Document Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => !open && setShowCreateDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Create New Document
            </DialogTitle>
            <DialogDescription>
              Create a new collaborative document with title and description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="new-title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="new-description"
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="Document description (optional)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newDocTitle.trim()}
            >
              {isCreating ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog
        open={!!editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Edit Document
            </DialogTitle>
            <DialogDescription>
              Update the document title and description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Document description (optional)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingDoc(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDocument}
              disabled={isUpdating || !editTitle.trim()}
            >
              {isUpdating ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => !open && setShowDeleteDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiDeleteBinLine className="h-5 w-5 text-destructive" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
