-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "realm" TEXT NOT NULL DEFAULT 'velocity',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "chains" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "ownershipVerified" BOOLEAN NOT NULL DEFAULT false,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processAfter" TIMESTAMP(3),
    "scanIndex" INTEGER NOT NULL DEFAULT 0,
    "selectionRationale" TEXT,
    "decoheredAt" TIMESTAMP(3),
    "decohereReason" TEXT,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalSnapshot" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methodVersion" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,

    CONSTRAINT "SignalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "hardSignalScores" TEXT NOT NULL,
    "editorialScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "dossierNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "aiDrafted" BOOLEAN NOT NULL DEFAULT true,
    "editorVerified" BOOLEAN NOT NULL DEFAULT false,
    "editorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "methodologyVersion" TEXT NOT NULL,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerIdentity" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "chainKey" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressType" TEXT NOT NULL DEFAULT 'wallet',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "verificationTier" TEXT NOT NULL DEFAULT 'unverified',
    "verificationMethod" TEXT NOT NULL DEFAULT 'none',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerLink" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "resolves" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "httpStatus" INTEGER,

    CONSTRAINT "InfluencerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Epoch" (
    "number" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'final',
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Epoch_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "EpochScore" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "epochNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reachScore" DOUBLE PRECISION NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "narrative" DOUBLE PRECISION NOT NULL,
    "onchain" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "reachCount" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "rankChange" INTEGER,
    "tier" TEXT NOT NULL,

    CONSTRAINT "EpochScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_handle_key" ON "Influencer"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_slug_key" ON "Influencer"("slug");

-- CreateIndex
CREATE INDEX "Influencer_status_idx" ON "Influencer"("status");

-- CreateIndex
CREATE INDEX "Influencer_submittedBy_idx" ON "Influencer"("submittedBy");

-- CreateIndex
CREATE INDEX "SignalSnapshot_influencerId_signalKey_idx" ON "SignalSnapshot"("influencerId", "signalKey");

-- CreateIndex
CREATE INDEX "Score_influencerId_computedAt_idx" ON "Score"("influencerId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_dossierNumber_key" ON "Dossier"("dossierNumber");

-- CreateIndex
CREATE INDEX "Dossier_influencerId_idx" ON "Dossier"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerIdentity_influencerId_chainKey_address_key" ON "InfluencerIdentity"("influencerId", "chainKey", "address");

-- CreateIndex
CREATE INDEX "InfluencerLink_influencerId_idx" ON "InfluencerLink"("influencerId");

-- CreateIndex
CREATE INDEX "EpochScore_epochNumber_rank_idx" ON "EpochScore"("epochNumber", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "EpochScore_influencerId_epochNumber_key" ON "EpochScore"("influencerId", "epochNumber");

-- CreateIndex
CREATE INDEX "Signal_influencerId_postedAt_idx" ON "Signal"("influencerId", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- AddForeignKey
ALTER TABLE "SignalSnapshot" ADD CONSTRAINT "SignalSnapshot_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerIdentity" ADD CONSTRAINT "InfluencerIdentity_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerLink" ADD CONSTRAINT "InfluencerLink_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Epoch" ADD CONSTRAINT "Epoch_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpochScore" ADD CONSTRAINT "EpochScore_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpochScore" ADD CONSTRAINT "EpochScore_epochNumber_fkey" FOREIGN KEY ("epochNumber") REFERENCES "Epoch"("number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase exposes every table in `public` through its Data API (PostgREST). The API server reaches Postgres as the
-- table owner through Prisma, which bypasses RLS, so enabling RLS with no policies closes the public Data API entirely.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Influencer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignalSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Score" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InfluencerIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InfluencerLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Epoch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EpochScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscriber" ENABLE ROW LEVEL SECURITY;
