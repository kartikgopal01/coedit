"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiHistoryLine,
  RiMailLine,
  RiShareLine,
  RiTeamLine,
  RiUserLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line
} from "@remixicon/react";
import { format } from "date-fns";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState as useReactState } from "react";
import { db } from "@/lib/firebase-client";
import type { VersionMeta, DocumentData } from "@/lib/firestore-types";
import InviteCollaborator from "@/components/InviteCollaborator";
import ShareAccess from "@/components/ShareAccess";

interface DocumentSidebarProps {
  docId: string;
  onRollback: (delta: unknown) => void;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export default function DocumentSidebar({ docId, onRollback }: DocumentSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'collaborators' | 'invite' | 'share'>('history');
  const [versions, setVersions] = useReactState<VersionMeta[]>([]);
  const [documentData, setDocumentData] = useReactState<DocumentData | null>(null);
  const [collaborators, setCollaborators] = useReactState<Collaborator[]>([]);

  // Fetch versions
  useEffect(() => {
    const q = query(
      collection(db, "documents", docId, "versions"),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: VersionMeta[] = [];
      snap.docs.forEach((d) => {
        items.push(d.data() as VersionMeta);
      });
      setVersions(items);
    });
    return () => unsub();
  }, [docId]);

  // Fetch document data and collaborators
  useEffect(() => {
    const docRef = doc(db, "documents", docId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DocumentData;
        setDocumentData(data);

        // Fetch collaborator details (simplified - in real app you'd fetch from Clerk)
        const collabList: Collaborator[] = [];
        if (data.collaborators) {
          data.collaborators.forEach((userId, index) => {
            collabList.push({
              id: userId,
              name: `User ${index + 1}`,
              email: `${userId}@example.com`,
              isOnline: Math.random() > 0.5, // Mock online status
              lastSeen: new Date(Date.now() - Math.random() * 1000000)
            });
          });
        }
        setCollaborators(collabList);
      }
    });
    return () => unsub();
  }, [docId]);

  const handleRollback = async (fileKey: string) => {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey }),
    });
    if (!res.ok) return;
    const { downloadUrl } = await res.json();
    const delta = await fetch(downloadUrl).then((r) => r.json());
    onRollback(delta);
  };

  const tabs = [
    { id: 'history', label: 'Version History', icon: RiHistoryLine },
    { id: 'collaborators', label: 'Collaborators', icon: RiTeamLine },
    { id: 'invite', label: 'Invite', icon: RiMailLine },
    { id: 'share', label: 'Share', icon: RiShareLine },
  ] as const;

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="rounded-l-lg rounded-r-none border-r-0 shadow-lg"
        >
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-16 h-full w-auto bg-background border-l border-border shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Document Tools</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
        >
          <RiArrowRightLine className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-none border-b-2 ${activeTab === tab.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-transparent"
              }`}
          >
            <tab.icon className="h-4 w-4 mr-1" />
            <span className="text-xs">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{versions.length}</Badge>
            </div>
            {versions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No versions yet
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <Card key={v.versionId} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Version {v.versionId.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(v.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRollback(v.fileKey)}
                        >
                          <RiHistoryLine className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaborators' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{collaborators.length}</Badge>
            </div>
            {collaborators.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No collaborators yet
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <Card key={collab.id} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <RiUserLine className="h-4 w-4 text-primary" />
                          </div>
                          {collab.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{collab.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
                          {collab.lastSeen && (
                            <p className="text-xs text-muted-foreground">
                              Last seen {format(collab.lastSeen, "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                        <Badge variant={collab.isOnline ? "default" : "secondary"} className="text-xs">
                          {collab.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="space-y-3">
            <InviteCollaborator docId={docId} />
          </div>
        )}

        {activeTab === 'share' && (
          <div className="space-y-3">
            <ShareAccess docId={docId} />
          </div>
        )}
      </div>
    </div>
  );
}
