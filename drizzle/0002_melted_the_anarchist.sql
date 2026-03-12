CREATE TABLE `source_slide_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`pillarConfigId` int NOT NULL,
	`sourceSection` varchar(500),
	`slideType` enum('title','agenda','exclusions','executive_summary','initiatives_goals','initiative_deep_dive','launch_schedule','key_dates','budget_update','budget_reforecast','te','appendix_header','budget_detail','appendix_content','end_frame') NOT NULL,
	`mappingNotes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_slide_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `data_sources` ADD `pillarConfigId` int;