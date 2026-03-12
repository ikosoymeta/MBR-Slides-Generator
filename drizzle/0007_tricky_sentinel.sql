CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`action` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`entityName` varchar(500),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `autopilot_schedules` MODIFY COLUMN `pillarConfigId` int;--> statement-breakpoint
ALTER TABLE `autopilot_schedules` ADD `folderNameFormat` varchar(500) DEFAULT 'MBR Slide Deck {month} {day}, {year}';--> statement-breakpoint
ALTER TABLE `autopilot_schedules` ADD `createdByName` varchar(255);--> statement-breakpoint
ALTER TABLE `autopilot_schedules` ADD `updatedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `data_sources` ADD `createdByName` varchar(255);--> statement-breakpoint
ALTER TABLE `data_sources` ADD `updatedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `sourceReference` varchar(500);--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `isDynamic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `dynamicDateType` enum('generation_date','current_month_year','previous_month_year','current_quarter','fiscal_year','custom_format');--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `dynamicDateFormat` varchar(255);--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `createdByName` varchar(255);--> statement-breakpoint
ALTER TABLE `field_bindings` ADD `updatedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `source_slide_mappings` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `source_slide_mappings` ADD `createdByName` varchar(255);--> statement-breakpoint
ALTER TABLE `source_slide_mappings` ADD `updatedByName` varchar(255);