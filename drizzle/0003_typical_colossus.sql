CREATE TABLE `field_bindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pillarConfigId` int NOT NULL,
	`dataSourceId` int,
	`sourceField` varchar(500) NOT NULL,
	`sourceFieldType` enum('string','number','date','currency','option','boolean','url','other') NOT NULL DEFAULT 'string',
	`slideType` enum('title','agenda','exclusions','executive_summary','initiatives_goals','initiative_deep_dive','launch_schedule','key_dates','budget_update','budget_reforecast','te','appendix_header','budget_detail','appendix_content','end_frame') NOT NULL,
	`slideSection` varchar(500) NOT NULL,
	`slideSectionType` enum('string','number','date','currency','picklist','boolean','other') NOT NULL DEFAULT 'string',
	`syncDirection` enum('source_to_slide','slide_to_source','bidirectional') NOT NULL DEFAULT 'source_to_slide',
	`transformNotes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_bindings_id` PRIMARY KEY(`id`)
);
