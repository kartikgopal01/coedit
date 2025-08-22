"use client";

import {
  RiArrowRightLine,
  RiFileTextLine,
  RiFlashlightLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiShieldCheckLine,
  RiTeamLine,
  RiMagicLine,
  RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { FlipWords } from "@/components/ui/flip-words";

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Hero Icons */}
        <div className="mt-12 flex gap-8 justify-center">
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 50 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2,
            }}
            className="relative"
          >
            <img
              src="/logo.svg"
              alt="CoEdit Logo"
              className="w-40 h-40 dark:hidden opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
            <img
              src="/logowhite.svg"
              alt="CoEdit Logo"
              className="w-40 h-40 hidden dark:block opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <RiFlashlightLine className="w-3 h-3 mr-1" />
              Real-time collaboration
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Co
              <FlipWords
                words={["Edit", "Create", "Collaborate", "Innovate"]}
              />{" "}
              Docs with
              <span className="text-primary block">Git Superpowers</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Edit documents together in real-time with built-in version
              control. Commit changes, track history, and rollback
              instantly—just like Git for documents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/dashboard" className="flex items-center group">
                  Get Started Free
                  <RiArrowRightLine className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 bg-muted/30 min-h-screen flex items-center justify-center w-full"
      >
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need for team collaboration
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for modern teams who need more than just basic document
              editing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg flex-1">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiTeamLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Real-Time Collaboration</CardTitle>
                <CardDescription>
                  Multiple users can edit simultaneously with live cursors and
                  instant sync
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiMagicLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI Tools</CardTitle>
                <CardDescription>
                  Summarize content, explain version diffs, and use speech I/O
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiGitBranchLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Version Control</CardTitle>
                <CardDescription>
                  Commit changes with messages, track history, and rollback to
                  any version
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiShieldCheckLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Enterprise-grade security with AWS S3 storage and Firebase
                  authentication
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiFileTextLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Rich Text Editor</CardTitle>
                <CardDescription>
                  Powered by Quill editor with formatting, lists, and
                  collaborative features
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiUserLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Live Presence</CardTitle>
                <CardDescription>
                  See collaborators' cursors and selections update in real time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiGlobalLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Share & Invite</CardTitle>
                <CardDescription>
                  Easy sharing with invite links and granular permission
                  controls
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <RiFlashlightLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Built with Next.js and Y.js for optimal performance and
                  real-time sync
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2 justify-center">
            <img
              src="/logo.svg"
              alt="CoEdit"
              className="w-10 h-10 dark:hidden"
            />
            <img
              src="/logowhite.svg"
              alt="CoEdit"
              className="w-10 h-10 hidden dark:block"
            />
            <p className="text-muted-foreground mb-4">
              Real-time collaborative documents with version control
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
