import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { ClassItem, AcademicItem, Profile } from '@/types/database';

export const DEMO_USER_ID = 'demo_user';
const LOCAL_CLASSES_KEY = 'syllabisync_local_classes';
const LOCAL_ITEMS_KEY = 'syllabisync_local_academic_items';
const DEMO_SEEDED_KEY = 'syllabisync_demo_seeded_v1';

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  app_metadata: { provider: 'demo' },
  user_metadata: { full_name: 'Demo Student' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo.student@syllabisync.edu',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  full_name: 'Demo Student',
  created_at: new Date().toISOString(),
};

function addDays(days: number, hour: number = 23, minute: number = 59): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function getSampleClasses(): ClassItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      professor_name: 'Dr. Sarah Chen',
      professor_email: 'schen@university.edu',
      description:
        'Fundamental concepts in operating systems: concurrency, virtual memory virtualization, file systems, and CPU scheduling.',
      semester: 'Fall 2026',
      color: '#2563EB', // vibrant blue
      grading_breakdown: [
        { category: 'Programming Projects', weight: 40 },
        { category: 'Midterm Exam', weight: 25 },
        { category: 'Final Exam', weight: 30 },
        { category: 'Homework & Quizzes', weight: 5 },
      ],
      office_hours: 'Tuesdays & Thursdays 2:00 PM - 4:00 PM, Turing Hall 402',
      attendance_policy: 'Attendance strongly encouraged; live code demonstrations are not recorded.',
      late_policy: '3 slip days allowed for semester. 10% penalty per day thereafter up to 3 days.',
      required_textbooks: [
        'Operating Systems: Three Easy Pieces by Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau',
      ],
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_class_econ201',
      user_id: DEMO_USER_ID,
      course_name: 'Principles of Macroeconomics',
      course_code: 'ECON 201',
      professor_name: 'Prof. Marcus Vance',
      professor_email: 'mvance@university.edu',
      description:
        'Analysis of aggregate economic activity, GDP, inflation, unemployment, fiscal and monetary policies, and international trade.',
      semester: 'Fall 2026',
      color: '#059669', // emerald
      grading_breakdown: [
        { category: 'Problem Sets', weight: 20 },
        { category: 'Midterm 1', weight: 20 },
        { category: 'Midterm 2', weight: 25 },
        { category: 'Final Exam', weight: 35 },
      ],
      office_hours: 'Wednesdays 10:00 AM - 12:00 PM, Smith Hall 210',
      attendance_policy: 'Lecture attendance is required and factored into class participation.',
      late_policy: 'No late submissions accepted without Dean of Students accommodation.',
      required_textbooks: ['Macroeconomics (11th Edition) by N. Gregory Mankiw'],
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_class_psyc101',
      user_id: DEMO_USER_ID,
      course_name: 'Introduction to Psychology',
      course_code: 'PSYC 101',
      professor_name: 'Dr. Elena Rostova',
      professor_email: 'erostova@university.edu',
      description:
        'Scientific exploration of human cognition, perception, developmental psychology, neurobiology, and behavioral conditioning.',
      semester: 'Fall 2026',
      color: '#7C3AED', // purple
      grading_breakdown: [
        { category: 'Examinations', weight: 40 },
        { category: 'Research Papers', weight: 30 },
        { category: 'Weekly Readings', weight: 15 },
        { category: 'Discussion Lab', weight: 15 },
      ],
      office_hours: 'Mondays 1:00 PM - 3:00 PM, Adler Hall 105',
      attendance_policy: 'Active participation in weekly lab discussion sections is required.',
      late_policy: '5% deduction per 24 hours late. Max 5 days.',
      required_textbooks: ['Psychological Science (7th Edition) by Michael S. Gazzaniga'],
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function getSampleAcademicItems(): AcademicItem[] {
  const now = new Date().toISOString();
  return [
    // CS 350
    {
      id: 'demo_item_cs_1',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Assignment 1: Thread Concurrency & Locks',
      description: 'Implement mutex locks, condition variables, and reader-writer solution in C.',
      type: 'assignment',
      due_date: addDays(-3, 23, 59),
      status: 'completed',
      priority: 'high',
      points: 50,
      grade: 48,
      source_excerpt: 'Assignment 1: Thread Concurrency & Locks - Due Week 3',
      original_date_text: 'Week 3 Friday',
      confidence: 0.95,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_cs_2',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Quiz 1: Concurrency Primitives',
      description: 'Online 20-minute quiz covering deadlock conditions and semaphores.',
      type: 'quiz',
      due_date: addDays(-1, 14, 0),
      status: 'completed',
      priority: 'medium',
      points: 20,
      grade: 19,
      source_excerpt: 'Quiz 1 in class',
      original_date_text: 'Week 4',
      confidence: 0.92,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_cs_3',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Project 1: User-Level Thread Scheduler',
      description: 'Design and benchmark a cooperative user-level threading library with round-robin scheduler.',
      type: 'project',
      due_date: addDays(4, 23, 59),
      status: 'in_progress',
      priority: 'high',
      points: 100,
      grade: null,
      source_excerpt: 'Project 1: User-Level Thread Scheduler - Due: 2026-10-09 (100 pts)',
      original_date_text: '2026-10-09',
      confidence: 0.98,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_cs_4',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Midterm Examination: Virtual Memory & CPU Scheduling',
      description: 'In-person closed-book examination covering paging, TLB, multi-level feedback queues.',
      type: 'exam',
      due_date: addDays(14, 15, 30),
      status: 'pending',
      priority: 'high',
      points: 150,
      grade: null,
      source_excerpt: 'Midterm Examination: Virtual Memory & CPU Scheduling - Date: 2026-10-22 (150 pts)',
      original_date_text: '2026-10-22',
      confidence: 0.99,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_cs_5',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Project 2: Ext2 File System Driver',
      description: 'Implement directory traversal, inode allocation, and file read/write routines.',
      type: 'project',
      due_date: addDays(28, 23, 59),
      status: 'pending',
      priority: 'high',
      points: 120,
      grade: null,
      source_excerpt: 'Project 2: Ext2 File System Driver - Due: 2026-11-20 (120 pts)',
      original_date_text: '2026-11-20',
      confidence: 0.96,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_cs_6',
      class_id: 'demo_class_cs350',
      user_id: DEMO_USER_ID,
      title: 'Final Examination (Cumulative)',
      description: 'Comprehensive 3-hour examination across all semester topics.',
      type: 'exam',
      due_date: addDays(48, 9, 0),
      status: 'pending',
      priority: 'high',
      points: 200,
      grade: null,
      source_excerpt: 'Final Examination: Cumulative Exam - Date: 2026-12-14 (200 pts)',
      original_date_text: '2026-12-14',
      confidence: 0.99,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Operating Systems & Systems Programming',
      course_code: 'CS 350',
      course_color: '#2563EB',
      created_at: now,
      updated_at: now,
    },

    // ECON 201
    {
      id: 'demo_item_econ_1',
      class_id: 'demo_class_econ201',
      user_id: DEMO_USER_ID,
      title: 'Problem Set 1: GDP & Price Indices',
      description: 'Calculate real vs nominal GDP and compute consumer price index variations.',
      type: 'assignment',
      due_date: addDays(-2, 23, 59),
      status: 'completed',
      priority: 'medium',
      points: 30,
      grade: 29,
      source_excerpt: 'Problem Set 1 Due Week 3',
      original_date_text: 'Week 3',
      confidence: 0.91,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Principles of Macroeconomics',
      course_code: 'ECON 201',
      course_color: '#059669',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_econ_2',
      class_id: 'demo_class_econ201',
      user_id: DEMO_USER_ID,
      title: 'Problem Set 2: Aggregate Demand & Supply',
      description: 'Short-run economic fluctuations and equilibrium shifting exercises.',
      type: 'assignment',
      due_date: addDays(2, 23, 59),
      status: 'pending',
      priority: 'medium',
      points: 30,
      grade: null,
      source_excerpt: 'Problem Set 2 Due Week 5',
      original_date_text: 'Week 5',
      confidence: 0.94,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Principles of Macroeconomics',
      course_code: 'ECON 201',
      course_color: '#059669',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_econ_3',
      class_id: 'demo_class_econ201',
      user_id: DEMO_USER_ID,
      title: 'Midterm Examination 1: Fiscal Policy & Keynesian Cross',
      description: 'In-hall exam with multiple choice and short quantitative modeling problems.',
      type: 'exam',
      due_date: addDays(11, 11, 0),
      status: 'pending',
      priority: 'high',
      points: 100,
      grade: null,
      source_excerpt: 'Midterm 1 in lecture hall',
      original_date_text: 'October 15',
      confidence: 0.97,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Principles of Macroeconomics',
      course_code: 'ECON 201',
      course_color: '#059669',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_econ_4',
      class_id: 'demo_class_econ201',
      user_id: DEMO_USER_ID,
      title: 'Problem Set 3: Money Supply & Federal Reserve Policy',
      description: 'Fractional reserve banking, money multipliers, and open market operations.',
      type: 'assignment',
      due_date: addDays(22, 23, 59),
      status: 'pending',
      priority: 'medium',
      points: 30,
      grade: null,
      source_excerpt: 'Problem Set 3 Due Week 8',
      original_date_text: 'Week 8',
      confidence: 0.93,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Principles of Macroeconomics',
      course_code: 'ECON 201',
      course_color: '#059669',
      created_at: now,
      updated_at: now,
    },

    // PSYC 101
    {
      id: 'demo_item_psyc_1',
      class_id: 'demo_class_psyc101',
      user_id: DEMO_USER_ID,
      title: 'Reading 1: Biological Foundations & Synaptic Transmission',
      description: 'Read Gazzaniga Chapter 2 and complete 5-question comprehension check.',
      type: 'reading',
      due_date: addDays(-5, 23, 59),
      status: 'completed',
      priority: 'low',
      points: 15,
      grade: 15,
      source_excerpt: 'Weekly Reading 1',
      original_date_text: 'Week 2',
      confidence: 0.9,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Introduction to Psychology',
      course_code: 'PSYC 101',
      course_color: '#7C3AED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_psyc_2',
      class_id: 'demo_class_psyc101',
      user_id: DEMO_USER_ID,
      title: 'Research Essay: Operant Conditioning in Modern Algorithms',
      description: '1,500-word APA style analysis on variable reward schedules in digital product designs.',
      type: 'assignment',
      due_date: addDays(7, 23, 59),
      status: 'in_progress',
      priority: 'high',
      points: 75,
      grade: null,
      source_excerpt: 'Essay 1 Due Week 6',
      original_date_text: 'Week 6 Friday',
      confidence: 0.95,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Introduction to Psychology',
      course_code: 'PSYC 101',
      course_color: '#7C3AED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo_item_psyc_3',
      class_id: 'demo_class_psyc101',
      user_id: DEMO_USER_ID,
      title: 'Midterm Exam: Cognition, Memory & Learning Models',
      description: 'Exam covering sensory memory, working memory decay, and classical conditioning.',
      type: 'exam',
      due_date: addDays(25, 13, 0),
      status: 'pending',
      priority: 'high',
      points: 100,
      grade: null,
      source_excerpt: 'Midterm Examination',
      original_date_text: 'Week 8',
      confidence: 0.98,
      is_confirmed: true,
      google_event_id: null,
      google_calendar_id: null,
      last_google_sync_at: null,
      google_sync_status: 'not_synced',
      course_name: 'Introduction to Psychology',
      course_code: 'PSYC 101',
      course_color: '#7C3AED',
      created_at: now,
      updated_at: now,
    },
  ];
}

export async function seedDemoDataIfEmpty(): Promise<void> {
  try {
    const isAlreadySeeded = await AsyncStorage.getItem(DEMO_SEEDED_KEY);
    const existingClassesRaw = await AsyncStorage.getItem(LOCAL_CLASSES_KEY);
    const existingClasses: ClassItem[] = existingClassesRaw ? JSON.parse(existingClassesRaw) : [];

    // If classes already exist and have been seeded, keep user's demo modifications
    const hasDemoClasses = existingClasses.some((c) => c.id.startsWith('demo_'));
    if (isAlreadySeeded === 'true' && hasDemoClasses) {
      return;
    }

    const demoClasses = getSampleClasses();
    const demoItems = getSampleAcademicItems();

    // Merge or replace demo items without disturbing non-demo user items
    const nonDemoClasses = existingClasses.filter((c) => !c.id.startsWith('demo_'));
    const combinedClasses = [...demoClasses, ...nonDemoClasses];
    await AsyncStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(combinedClasses));

    const existingItemsRaw = await AsyncStorage.getItem(LOCAL_ITEMS_KEY);
    const existingItems: AcademicItem[] = existingItemsRaw ? JSON.parse(existingItemsRaw) : [];
    const nonDemoItems = existingItems.filter((i) => !i.id.startsWith('demo_'));
    const combinedItems = [...demoItems, ...nonDemoItems];
    await AsyncStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(combinedItems));

    await AsyncStorage.setItem(DEMO_SEEDED_KEY, 'true');
  } catch (err) {
    console.warn('Error seeding demo data:', err);
  }
}

export async function resetDemoData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEMO_SEEDED_KEY);
    const existingClassesRaw = await AsyncStorage.getItem(LOCAL_CLASSES_KEY);
    const existingClasses: ClassItem[] = existingClassesRaw ? JSON.parse(existingClassesRaw) : [];
    const nonDemoClasses = existingClasses.filter((c) => !c.id.startsWith('demo_'));
    await AsyncStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(nonDemoClasses));

    const existingItemsRaw = await AsyncStorage.getItem(LOCAL_ITEMS_KEY);
    const existingItems: AcademicItem[] = existingItemsRaw ? JSON.parse(existingItemsRaw) : [];
    const nonDemoItems = existingItems.filter((i) => !i.id.startsWith('demo_'));
    await AsyncStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(nonDemoItems));

    await seedDemoDataIfEmpty();
  } catch (err) {
    console.warn('Error resetting demo data:', err);
  }
}
