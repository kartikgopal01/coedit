# CoEdit: Real-Time Docs with Git Superpowers

A real-time collaborative document platform built in 24 hours. SyncScribe combines the seamless editing of Google Docs with robust, Git-like version control—so teams can edit, commit, and roll back changes effortlessly.

---

## 🎯 The Problem

Traditional document collaboration means emailing versions back and forth—leading to confusion, conflicting edits, and lost change history. Most platforms lack powerful version control, making it tough for professional teams to manage important docs (project proposals, specs, contracts) with confidence.

---

## ✨ Our Solution

SyncScribe is your single source of truth. Multiple users edit the same doc in real time, with live cursors and changes for everyone.

**Killer feature:** Built-in version control. At any point, commit the current doc with a message—creating a permanent snapshot. Browse history and instantly roll back to any previous version.

---

## 🚀 Key Features

- **Real-Time Collaborative Editing:** Multiple users type and edit simultaneously, powered by Y.js CRDTs.
- **User Presence & Cursors:** See who’s in the doc and where their cursor is—just like Google Docs.
- **Git-like Version Control:**
  - **Commit:** Save a snapshot of the doc with a message.
  - **History:** View a chronological log of all commits.
  - **Rollback:** Instantly revert to any previous commit.
- **Scalable File Storage:** Content and snapshots stored securely in AWS S3—no free-tier limits.
- **Modern & Responsive UI:** Built with Shadcn/UI and Tailwind CSS for a clean, intuitive experience.
- **Robust Routing:** Proper error handling, loading states, and navigation with fallbacks.

---

## 🛠️ Tech Stack

| Category       | Technology               | Purpose                                       |
| -------------- | ------------------------ | --------------------------------------------- |
| Frontend       | Next.js (React)          | App framework, UI, and server-side logic      |
| UI/UX          | Shadcn/UI & Tailwind CSS | Component library and styling for modern UI   |
| Text Editor    | TipTap                   | Headless, extensible rich-text editor         |
| Real-Time Sync | Y.js                     | CRDTs for real-time collaboration             |
| Database       | Firebase Firestore       | Document metadata, version history, user data |
| File Storage   | AWS S3                   | Document content and version snapshots        |
| Deployment     | Vercel                   | Hosting and deployment                        |

---

## ⚙️ Getting Started

Follow these steps to run the project locally.

## ⚙️ Getting Started

Follow these steps to set up and run SyncScribe locally.

### **Prerequisites**

- **Node.js** (v18 or later)
- **npm** or **yarn**
- **Firebase** project with Firestore enabled
- **AWS** account with an S3 bucket configured

---

### **Local Setup**

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/syncscribe.git
   cd syncscribe
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables:**

   - Copy `.env.example` to `.env.local` in the project root.
   - Fill in your Firebase and AWS credentials.

   ```ini
   # .env.local

   # Firebase Config
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=1:...

   # AWS S3 Config
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-s3-bucket-name
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser:**
   - Visit [http://localhost:3000](http://localhost:3000) to see the app in action.

---

## 🛠️ Tech Stack

| Category       | Technology               | Purpose                                       |
| -------------- | ------------------------ | --------------------------------------------- |
| Frontend       | Next.js (React)          | App framework, UI, and server-side logic      |
| UI/UX          | Shadcn/UI & Tailwind CSS | Component library and modern styling          |
| Text Editor    | TipTap                   | Headless, extensible rich-text editor         |
| Real-Time Sync | Y.js                     | CRDTs for real-time collaboration             |
| Database       | Firebase Firestore       | Document metadata, version history, user data |
| File Storage   | AWS S3                   | Document content and version snapshots        |
| Deployment     | Vercel                   | Hosting and deployment                        |

---

## 👨‍💻 Team

- Your Name
- Teammate's Name

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

