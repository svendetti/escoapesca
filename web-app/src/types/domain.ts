export type AgeBand = "18_24" | "25_34" | "35_44" | "45_54" | "55_64" | "65_plus";
export type WaterType = "sea" | "freshwater" | "both";
export type SkillLevel = "beginner" | "intermediate" | "expert";
export type TripWaterType = Exclude<WaterType, "both">;
export type TripType = "free" | "protected";
export type RecommendedLevel = "any" | SkillLevel;
export type TripStatus = "draft" | "open" | "confirmed" | "completed" | "cancelled";
export type TripParticipationStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "confirmed"
  | "completed"
  | "no_show";

export type CatalogItem = {
  id: number;
  slug: string;
  label: string;
};

export type RegistrationValues = {
  displayName: string;
  email: string;
  password: string;
  provinceCode: string;
  municipalityName: string;
  ageBand: AgeBand | "";
  adultConfirmed: boolean;
  privacyAccepted: boolean;
  termsAccepted: boolean;
};

export type ProfileValues = {
  displayName: string;
  provinceCode: string;
  municipalityName: string;
  genericZone: string;
  ageBand: AgeBand | "";
  bio: string;
  waterType: WaterType | "";
  skillLevel: SkillLevel | "";
  travelRadiusKm: "" | "10" | "25" | "50" | "100";
  techniqueIds: number[];
  availabilitySlotIds: number[];
};

export type TripValues = {
  title: string;
  techniqueId: number | "";
  waterType: TripWaterType | "";
  date: string;
  startTime: string;
  endTime: string;
  provinceCode: string;
  publicZone: string;
  publicMeetingPoint: string;
  maxParticipants: number;
  recommendedLevel: RecommendedLevel;
  description: string;
  gearNotes: string;
  tripType: TripType;
};

export type FishingTrip = {
  id: string;
  organizerUserId: string;
  title: string;
  techniqueId: number;
  techniqueName: string;
  waterType: TripWaterType;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  publicZone: string;
  publicMeetingPoint: string | null;
  maxParticipants: number;
  recommendedLevel: RecommendedLevel;
  description: string;
  gearNotes: string | null;
  tripType: TripType;
  status: TripStatus;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripParticipationRequest = {
  id: string;
  userId: string;
  displayName: string;
  skillLevel: SkillLevel | null;
  status: TripParticipationStatus;
  requestedAt: string;
  decidedAt: string | null;
};

export type TripDiscoveryFilters = {
  provinceCode: string;
  techniqueId: number | "";
  waterType: TripWaterType | "";
  date: string;
};

export type FishingTripDiscovery = {
  id: string;
  organizerUserId: string;
  organizerName: string;
  title: string;
  techniqueId: number;
  techniqueName: string;
  waterType: TripWaterType;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  provinceName: string;
  publicZone: string;
  maxParticipants: number;
  availablePlaces: number;
  recommendedLevel: RecommendedLevel;
  description: string;
  tripType: TripType;
  participationStatus: TripParticipationStatus | null;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const LAZIO_PROVINCES = [
  { code: "FR", name: "Frosinone" },
  { code: "LT", name: "Latina" },
  { code: "RI", name: "Rieti" },
  { code: "RM", name: "Roma" },
  { code: "VT", name: "Viterbo" },
] as const;

export const AGE_BANDS: ReadonlyArray<{ value: AgeBand; label: string }> = [
  { value: "18_24", label: "18–24 anni" },
  { value: "25_34", label: "25–34 anni" },
  { value: "35_44", label: "35–44 anni" },
  { value: "45_54", label: "45–54 anni" },
  { value: "55_64", label: "55–64 anni" },
  { value: "65_plus", label: "65 anni o più" },
];

export const EMPTY_PROFILE: ProfileValues = {
  displayName: "",
  provinceCode: "RM",
  municipalityName: "",
  genericZone: "",
  ageBand: "",
  bio: "",
  waterType: "",
  skillLevel: "",
  travelRadiusKm: "25",
  techniqueIds: [],
  availabilitySlotIds: [],
};

export const EMPTY_TRIP: TripValues = {
  title: "",
  techniqueId: "",
  waterType: "",
  date: "",
  startTime: "07:00",
  endTime: "12:00",
  provinceCode: "RM",
  publicZone: "",
  publicMeetingPoint: "",
  maxParticipants: 4,
  recommendedLevel: "any",
  description: "",
  gearNotes: "",
  tripType: "protected",
};

export const EMPTY_TRIP_DISCOVERY_FILTERS: TripDiscoveryFilters = {
  provinceCode: "",
  techniqueId: "",
  waterType: "",
  date: "",
};
