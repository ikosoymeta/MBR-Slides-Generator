CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sourceType` enum('google_sheet','google_doc','google_slides') NOT NULL,
	`googleFileId` varchar(255) NOT NULL,
	`sheetTab` varchar(255),
	`description` text,
	`category` enum('planning_doc','content_calendar','budget_tracker','expense_data','template','other') NOT NULL DEFAULT 'other',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`generationId` int NOT NULL,
	`step` varchar(255) NOT NULL,
	`status` enum('started','completed','failed','skipped') NOT NULL,
	`message` text,
	`details` json,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mbr_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pillarConfigId` int NOT NULL,
	`pillarName` varchar(255) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`status` enum('draft','generating','completed','failed') NOT NULL DEFAULT 'draft',
	`presentationId` varchar(255),
	`presentationUrl` varchar(1000),
	`driveFolderId` varchar(255),
	`generatedSlideCount` int,
	`executiveSummary` text,
	`aiCommentary` json,
	`inputData` json,
	`errorMessage` text,
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mbr_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pillar_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pillarName` varchar(255) NOT NULL,
	`driveFolderId` varchar(255),
	`templatePresentationId` varchar(255),
	`planningDocId` varchar(255),
	`contentCalendarId` varchar(255),
	`contentCalendarTab` varchar(255),
	`expenseSheetId` varchar(255),
	`teams` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillar_configs_id` PRIMARY KEY(`id`)
);
