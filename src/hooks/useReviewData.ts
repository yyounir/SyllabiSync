import { ExtractedSyllabus } from '@/types/academic';

interface PendingSyllabusReview {
  extractedData: ExtractedSyllabus;
  originalFilename: string;
  storagePath: string | null;
}

let pendingReviewData: PendingSyllabusReview | null = null;

export const reviewStore = {
  setPendingData(data: PendingSyllabusReview) {
    pendingReviewData = data;
  },
  getPendingData(): PendingSyllabusReview | null {
    return pendingReviewData;
  },
  clear() {
    pendingReviewData = null;
  },
};
