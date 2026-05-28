-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "lastSettlementAt" DATETIME;

-- CreateTable
CREATE TABLE "AIFeatureConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "promptTemplate" TEXT NOT NULL DEFAULT '',
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StarRegion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "color" TEXT NOT NULL DEFAULT '#4FC3F7',
    "order" INTEGER NOT NULL DEFAULT 0,
    "knowledgeTreeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StarRegion_knowledgeTreeId_fkey" FOREIGN KEY ("knowledgeTreeId") REFERENCES "KnowledgeTree" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StarPlanet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "problemIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StarPlanet_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "StarRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPlanetProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNEXPLORED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPlanetProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPlanetProgress_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "StarPlanet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedTopics" TEXT NOT NULL DEFAULT '[]',
    "hints" TEXT NOT NULL DEFAULT '[]',
    "correctAnswer" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BugScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "buggyCode" TEXT NOT NULL,
    "correctCode" TEXT NOT NULL,
    "hints" TEXT NOT NULL DEFAULT '[]',
    "bugExplanations" TEXT NOT NULL DEFAULT '[]',
    "language" TEXT NOT NULL DEFAULT 'python',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grade" TEXT,
    "classCode" TEXT NOT NULL DEFAULT '',
    "aiBillingMode" TEXT NOT NULL DEFAULT 'STUDENT_PAYS',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "classes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_classes" ("classCode", "createdAt", "createdBy", "description", "grade", "id", "name", "updatedAt") SELECT "classCode", "createdAt", "createdBy", "description", "grade", "id", "name", "updatedAt" FROM "classes";
DROP TABLE "classes";
ALTER TABLE "new_classes" RENAME TO "classes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AIFeatureConfig_featureKey_key" ON "AIFeatureConfig"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "StarRegion_knowledgeTreeId_key" ON "StarRegion"("knowledgeTreeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlanetProgress_userId_planetId_key" ON "UserPlanetProgress"("userId", "planetId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemFeature_featureKey_key" ON "SystemFeature"("featureKey");
