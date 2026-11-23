# SyllabiSync 🎓
> **Your syllabus. Your semester. In sync.**

SyllabiSync is an AI-powered academic organization application that transforms lengthy course syllabus PDFs into interactive, structured academic dashboards with automatic Google Calendar synchronization.

---

## 🌟 Key Features

1. **AI Syllabus Extraction (Google Gemini 2.5)**
   - Upload syllabus PDFs via `expo-document-picker`.
   - Native multimodality extracts course details, assignments, quizzes, exams, project milestones, grading policies, required textbooks, and instructor office hours.
   - Preserves source syllabus excerpts and generates confidence scores.
   - Validated against strict Zod schemas with editable review screens prior to saving.

2. **Personalized Course Dashboards**
   - Individual interactive dashboard for every course.
   - Breakdown of course progress, grading criteria weights, and upcoming deadlines.
   - Dedicated views for Assignments, Exams/Quizzes, Course Policies, and Course Notes.

3. **Unified Academic Calendar**
   - Cross-course chronological timeline of all deadlines and exam dates.
   - Filter by course, academic event type (Assignment, Exam, Quiz, Project), and sync status.
   - Color-coded by course.

4. **Google Calendar Synchronization**
   - Direct synchronization of academic deadlines into Google Calendar.
   - Supports exact times and all-day events.
   - Duplicate prevention with stored sync tracking.

5. **Universal Cross-Platform UI**
   - Responsive layout adapting seamlessly between Web (Desktop sidebar navigation) and Mobile (Bottom tab bar).
   - Clean, Notion/Linear-inspired productivity design with rounded cards, clean typography, and accessible contrasts.

---

## 🛠️ Technology Stack

- **Frontend:** React Native, Expo (SDK 58), Expo Router (v58), TypeScript
- **Styling:** Design System with modern theme palette, responsive shell, and Lucide React Native icons
- **Backend & Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Supabase Storage
- **AI Processing:** Google Gemini API (`@google/genai` SDK, Gemini 2.5 Flash) via server API route
- **Calendar:** Google Calendar API & OAuth integration
- **Validation:** Zod schemas for all AI output and forms

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or bun

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Database Migration
Run the SQL migration script located at `supabase/migrations/20261123_init_syllabisync.sql` in your Supabase SQL Editor to create:
- `profiles`
- `classes`
- `syllabi`
- `academic_items`
- `notes`
- `google_calendar_connections`
- Storage bucket `syllabi` with RLS policies

### 4. Run the Application
```bash
# Start development server
npx expo start

# Open on Web
npx expo start --web

# Open on iOS Simulator or Android Emulator
npx expo start --ios
npx expo start --android
```

---

## 📱 Architecture & Project Layout

```
src/
├── app/
│   ├── _layout.tsx                     # Root provider and stack navigator
│   ├── index.tsx                       # Auth gate redirect
│   ├── (auth)/
│   │   ├── login.tsx                   # User authentication
│   │   └── signup.tsx                  # User registration
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Responsive tab & sidebar navigator
│   │   ├── dashboard.tsx               # Academic home & semester overview
│   │   ├── classes.tsx                 # Enrolled courses listing
│   │   ├── calendar.tsx                # Unified calendar & Google sync
│   │   └── settings.tsx                # Settings & account integrations
│   ├── classes/
│   │   ├── [classId].tsx               # Individual course dashboard
│   │   ├── create.tsx                  # Manual course creation
│   │   ├── upload-syllabus.tsx         # Syllabus PDF upload & AI trigger
│   │   └── review-syllabus.tsx         # Editable AI extraction review
│   └── api/
│       └── analyze-syllabus+api.ts     # Secure server-side Gemini API route
├── components/
│   ├── common/                         # Button, Card, Badge, Input, Header, etc.
│   ├── dashboard/                      # StatCard, quick metrics
│   ├── classes/                        # ClassCard, course widgets
│   ├── assignments/                    # TaskItem with checkboxes and status
│   └── layout/                         # ResponsiveShell (Desktop sidebar & Mobile)
├── constants/
│   ├── colors.ts                       # Theme palette & class colors
│   └── theme.ts                        # Spacing, typography, and shadows
├── hooks/
│   ├── useAuth.tsx                     # Supabase authentication context
│   └── useReviewData.ts                # Inter-screen syllabus transfer store
├── services/
│   ├── class.service.ts                # Class CRUD
│   ├── academic-item.service.ts        # Academic items CRUD & status toggles
│   ├── syllabus.service.ts             # PDF storage & record keeping
│   ├── ai-syllabus.service.ts          # Gemini extraction coordination
│   ├── google-calendar.service.ts      # Google Calendar synchronization
│   └── notes.service.ts                # Course notes CRUD
└── types/
    ├── database.ts                     # Database entity interfaces
    └── academic.ts                     # Zod extraction schemas & types
```

---

## 🏆 Hackathon Demonstration Flow

1. **Sign Up / Log In**: Register a new student account or sign in.
2. **Upload Syllabus**: Choose a course syllabus PDF (or select a 1-click sample syllabus).
3. **Gemini Extraction**: Gemini 2.5 Flash analyzes the syllabus and returns verified JSON.
4. **Review & Confirm**: Review the extracted items, confidence ratings, and source quotes.
5. **Class Dashboard**: Explore the newly generated course dashboard with progress tracking and policies.
6. **Unified Schedule**: Open the Unified Calendar to view cross-course deadlines.
7. **Google Calendar Sync**: Select "Sync to Google Calendar" to sync deadlines to Google Calendar.
