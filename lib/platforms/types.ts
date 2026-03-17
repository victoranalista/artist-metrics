export interface CollectedMetrics {
  followers: number | null;
  totalViews: number | null;
  totalLikes: number | null;
  totalComments: number | null;
  totalShares: number | null;
  engagementRate: number | null;
  platformData: Record<string, unknown>;
  content: ContentItem[];
  audience: AudienceData | null;
}

export interface ContentItem {
  contentId: string;
  contentType: string;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  platformData: Record<string, unknown>;
}

export interface AudienceData {
  ageRanges: Record<string, number> | null;
  genderSplit: Record<string, number> | null;
  topCountries: Record<string, number> | null;
  topCities: Record<string, number> | null;
}

export type CollectionStatus = "idle" | "pending" | "processing" | "completed" | "error";

export interface PlatformCollectionStatus {
  platform: string;
  status: CollectionStatus;
  message?: string;
}
