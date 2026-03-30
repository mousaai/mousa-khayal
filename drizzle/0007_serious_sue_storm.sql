CREATE TABLE `building_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeSystem` enum('DBC','ADIBC','UAE_FIRE','ESMA_ENERGY','TRAKHEES','FEDERAL') NOT NULL,
	`chapter` varchar(255),
	`sectionNumber` varchar(64),
	`titleAr` text,
	`titleEn` text,
	`contentAr` text,
	`contentEn` text,
	`category` enum('structural','fire_safety','energy','plumbing','electrical','accessibility','environmental','zoning','general') NOT NULL,
	`tags` text,
	`minValue` double,
	`maxValue` double,
	`unit` varchar(32),
	`edition` varchar(16),
	`emirate` varchar(64) DEFAULT 'all',
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calculation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','all') NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`category` varchar(128) NOT NULL,
	`formulaAr` text NOT NULL,
	`formulaEn` text,
	`inputParams` json,
	`outputParams` json,
	`formulaLogic` json,
	`exampleInput` json,
	`exampleOutput` json,
	`referenceStandard` varchar(255),
	`emirate` varchar(64) DEFAULT 'all',
	`priority` int DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calculation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `climate_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah','ajman','ras_al_khaimah','fujairah','umm_al_quwain') NOT NULL,
	`month` int NOT NULL,
	`tempMaxAvg` double,
	`tempMinAvg` double,
	`designTempCooling` double,
	`designTempHeating` double,
	`humidityAvg` double,
	`solarIrradiancePeak` double,
	`solarRadiationDaily` double,
	`windSpeedAvg` double,
	`windDirection` int,
	`coolingDegreeDays` double,
	`heatingDegreeDays` double,
	`source` varchar(128),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `climate_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `construction_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255) NOT NULL,
	`category` enum('concrete','steel','insulation','glass','masonry','finishing','mep','waterproofing','roofing','other') NOT NULL,
	`thermalConductivity` double,
	`thermalResistance` double,
	`density` double,
	`specificHeat` double,
	`uValue` double,
	`shgc` double,
	`vlt` double,
	`priceAed` double,
	`priceUnit` varchar(32),
	`suppliers` text,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `construction_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_trees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','all') NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`triggerCondition` text NOT NULL,
	`treeLogic` json NOT NULL,
	`referencedIds` json,
	`confidenceScore` int DEFAULT 90,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decision_trees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('space_planning','lighting','color_theory','furniture','accessibility','acoustics','biophilic','cultural_uae') NOT NULL,
	`titleAr` text NOT NULL,
	`titleEn` text,
	`contentAr` text NOT NULL,
	`contentEn` text,
	`minValue` double,
	`maxValue` double,
	`unit` varchar(32),
	`source` varchar(255),
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','all') NOT NULL,
	`questionAr` text NOT NULL,
	`questionEn` text,
	`answerAr` text NOT NULL,
	`answerEn` text,
	`questionEmbedding` json,
	`hitCount` int NOT NULL DEFAULT 0,
	`creditsSaved` int NOT NULL DEFAULT 0,
	`source` enum('manual','auto') DEFAULT 'auto',
	`qualityScore` int DEFAULT 80,
	`isActive` int NOT NULL DEFAULT 1,
	`lastHitAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSource` varchar(128) NOT NULL,
	`targetTable` varchar(64) NOT NULL,
	`recordsAffected` int DEFAULT 0,
	`status` enum('success','partial','failed') NOT NULL,
	`errorMessage` text,
	`durationMs` int,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `output_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','all') NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`outputType` enum('report','recommendation','checklist','summary','analysis','comparison') NOT NULL,
	`templateAr` text NOT NULL,
	`templateEn` text,
	`requiredFields` json,
	`optionalFields` json,
	`tone` enum('formal','conversational','technical','simplified') DEFAULT 'formal',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `output_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_market_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah','ajman','ras_al_khaimah','fujairah','umm_al_quwain') NOT NULL,
	`area` varchar(255) NOT NULL,
	`propertyType` enum('apartment','villa','townhouse','studio','penthouse','land') NOT NULL,
	`avgSalePricePerSqft` double,
	`avgRentYearly` double,
	`avgServiceCharge` double,
	`avgRoi` double,
	`mortgageRate` double,
	`transactionsLastQuarter` int,
	`quarter` varchar(8),
	`source` varchar(128),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_market_data_id` PRIMARY KEY(`id`)
);
