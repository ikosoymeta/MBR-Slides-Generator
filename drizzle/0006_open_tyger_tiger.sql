CREATE TABLE `autopilot_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pillarConfigId` int NOT NULL,
	`frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'monthly',
	`dayOfWeekOrMonth` int,
	`hour` int NOT NULL DEFAULT 9,
	`minute` int NOT NULL DEFAULT 0,
	`timezone` varchar(100) NOT NULL DEFAULT 'America/Los_Angeles',
	`outputFolderId` varchar(255),
	`isEnabled` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`lastRunStatus` enum('success','failed','running','cancelled'),
	`lastRunError` text,
	`lastRunOutputUrl` varchar(1000),
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autopilot_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'error',
	`source` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`stackTrace` text,
	`context` json,
	`generationId` int,
	`pillarConfigId` int,
	`userId` int,
	`isResolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `error_logs_id` PRIMARY KEY(`id`)
);
