import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as google from "./services/google";
import { generateMbrDeck } from "./services/slideGenerator";
import { runAutopilotCollection } from "./services/autopilot";
import { GOOGLE_IDS, PILLAR_TEAMS } from "../shared/types";
import { invokeLLM } from "./_core/llm";
import { listErrorLogs as listErrorLogsSvc, getErrorSummary, resolveError } from "./services/errorLogger";
import { resolveBindings } from "./services/bindingResolver";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

   // ─── Data Sources ───────────────────────────────────────────
  dataSources: router({
    list: protectedProcedure.query(() =>
      db.listDataSources()
    ),
    listByPillar: protectedProcedure
      .input(z.object({ pillarConfigId: z.number() }))
      .query(({ input }) => db.listDataSourcesByPillar(input.pillarConfigId)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        sourceType: z.enum(["google_sheet", "google_doc", "google_slides"]),
        googleFileId: z.string().min(1),
        sheetTab: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["planning_doc", "content_calendar", "budget_tracker", "expense_data", "template", "other"]),
        pillarConfigId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createDataSource({ ...input, userId: ctx.user.id, createdByName: ctx.user.name || "Unknown", updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "created", entityType: "data_source", entityId: result.id, entityName: input.name });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        sourceType: z.enum(["google_sheet", "google_doc", "google_slides"]).optional(),
        googleFileId: z.string().min(1).optional(),
        sheetTab: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["planning_doc", "content_calendar", "budget_tracker", "expense_data", "template", "other"]).optional(),
        pillarConfigId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateDataSource(id, { ...data, updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "updated", entityType: "data_source", entityId: id, entityName: input.name || undefined });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDataSource(input.id);
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "deleted", entityType: "data_source", entityId: input.id });
        return { success: true };
      }),
  }),

  // ─── Source-Slide Mappings ─────────────────────────────────────
  slideMappings: router({
    listByPillar: protectedProcedure
      .input(z.object({ pillarConfigId: z.number() }))
      .query(({ input }) => db.listSlideMappings(input.pillarConfigId)),
    listBySource: protectedProcedure
      .input(z.object({ dataSourceId: z.number() }))
      .query(({ input }) => db.listSlideMappingsBySource(input.dataSourceId)),
    create: protectedProcedure
      .input(z.object({
        dataSourceId: z.number(),
        pillarConfigId: z.number(),
        sourceSection: z.string().optional(),
        slideType: z.enum([
          "title", "agenda", "exclusions", "executive_summary",
          "initiatives_goals", "initiative_deep_dive", "launch_schedule",
          "key_dates", "budget_update", "budget_reforecast",
          "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
        ]),
        mappingNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createSlideMapping({ ...input, userId: ctx.user.id, createdByName: ctx.user.name || "Unknown", updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "created", entityType: "slide_mapping", entityId: result.id, entityName: `${input.slideType} mapping` });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sourceSection: z.string().optional(),
        slideType: z.enum([
          "title", "agenda", "exclusions", "executive_summary",
          "initiatives_goals", "initiative_deep_dive", "launch_schedule",
          "key_dates", "budget_update", "budget_reforecast",
          "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
        ]).optional(),
        mappingNotes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateSlideMapping(id, { ...data, updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "updated", entityType: "slide_mapping", entityId: id });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSlideMapping(input.id);
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "deleted", entityType: "slide_mapping", entityId: input.id });
        return { success: true };
      }),
  }),

  // ─── Field Bindings ──────────────────────────────────────────
  fieldBindings: router({
    list: protectedProcedure
      .input(z.object({ pillarConfigId: z.number().optional() }))
      .query(({ input }) => {
        if (input.pillarConfigId) return db.listFieldBindings(input.pillarConfigId);
        return db.listAllFieldBindings();
      }),
    create: protectedProcedure
      .input(z.object({
        pillarConfigId: z.number(),
        dataSourceId: z.number().optional(),
        sourceField: z.string().min(1),
        sourceFieldType: z.enum(["string", "number", "date", "currency", "option", "boolean", "url", "graph_aggregator", "other"]).default("string"),
        slideType: z.enum([
          "title", "agenda", "exclusions", "executive_summary",
          "initiatives_goals", "initiative_deep_dive", "launch_schedule",
          "key_dates", "budget_update", "budget_reforecast",
          "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
        ]),
        slideSection: z.string().min(1),
        slideSectionType: z.enum(["string", "number", "date", "currency", "picklist", "boolean", "other"]).default("string"),
        syncDirection: z.enum(["source_to_slide", "slide_to_source", "bidirectional"]).default("source_to_slide"),
        transformNotes: z.string().optional(),
        bindingStatus: z.enum(["connected", "not_required", "unbound"]).default("connected"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Enforce one-binding-per-slide-section uniqueness within a pillar
        const existing = await db.listFieldBindings(input.pillarConfigId);
        const duplicate = existing.find(
          (b) => b.slideType === input.slideType && b.slideSection === input.slideSection
        );
        if (duplicate) {
          throw new Error(
            `A binding already exists for ${input.slideType} → ${input.slideSection}. Edit the existing binding instead.`
          );
        }
        const result = await db.createFieldBinding({ ...input, userId: ctx.user.id, createdByName: ctx.user.name || "Unknown", updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "created", entityType: "field_binding", entityId: result.id, entityName: `${input.slideType} → ${input.slideSection}` });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sourceField: z.string().optional(),
        sourceFieldType: z.enum(["string", "number", "date", "currency", "option", "boolean", "url", "graph_aggregator", "other"]).optional(),
        slideType: z.enum([
          "title", "agenda", "exclusions", "executive_summary",
          "initiatives_goals", "initiative_deep_dive", "launch_schedule",
          "key_dates", "budget_update", "budget_reforecast",
          "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
        ]).optional(),
        slideSection: z.string().optional(),
        slideSectionType: z.enum(["string", "number", "date", "currency", "picklist", "boolean", "other"]).optional(),
        syncDirection: z.enum(["source_to_slide", "slide_to_source", "bidirectional"]).optional(),
        transformNotes: z.string().optional(),
        bindingStatus: z.enum(["connected", "not_required", "unbound"]).optional(),
        dataSourceId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateFieldBinding(id, { ...data, updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "updated", entityType: "field_binding", entityId: id });
        return { success: true };
      }),
    /** Upsert: create or update a binding for a specific slide+section within a pillar */
    upsert: protectedProcedure
      .input(z.object({
        pillarConfigId: z.number(),
        slideType: z.enum([
          "title", "agenda", "exclusions", "executive_summary",
          "initiatives_goals", "initiative_deep_dive", "launch_schedule",
          "key_dates", "budget_update", "budget_reforecast",
          "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
        ]),
        slideSection: z.string().min(1),
        bindingStatus: z.enum(["connected", "not_required", "unbound"]),
        sourceField: z.string().optional(),
        sourceFieldType: z.enum(["string", "number", "date", "currency", "option", "boolean", "url", "graph_aggregator", "other"]).optional(),
        slideSectionType: z.enum(["string", "number", "date", "currency", "picklist", "boolean", "other"]).optional(),
        dataSourceId: z.number().nullable().optional(),
        transformNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.listFieldBindings(input.pillarConfigId);
        const match = existing.find(
          (b) => b.slideType === input.slideType && b.slideSection === input.slideSection
        );
        if (match) {
          await db.updateFieldBinding(match.id, {
            bindingStatus: input.bindingStatus,
            sourceField: input.sourceField || match.sourceField,
            sourceFieldType: input.sourceFieldType,
            slideSectionType: input.slideSectionType,
            dataSourceId: input.dataSourceId,
            transformNotes: input.transformNotes,
            updatedByName: ctx.user.name || "Unknown",
          });
          await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "updated", entityType: "field_binding", entityId: match.id, entityName: `${input.slideType} → ${input.slideSection}` });
          return { success: true };
        }
        const result = await db.createFieldBinding({
          pillarConfigId: input.pillarConfigId,
          slideType: input.slideType,
          slideSection: input.slideSection,
          bindingStatus: input.bindingStatus,
          sourceField: input.sourceField || '—',
          sourceFieldType: input.sourceFieldType || 'string',
          slideSectionType: input.slideSectionType || 'string',
          syncDirection: 'source_to_slide',
          dataSourceId: input.dataSourceId ?? undefined,
          transformNotes: input.transformNotes,
          userId: ctx.user.id,
          createdByName: ctx.user.name || "Unknown",
          updatedByName: ctx.user.name || "Unknown",
        });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "created", entityType: "field_binding", entityId: result.id, entityName: `${input.slideType} → ${input.slideSection}` });
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFieldBinding(input.id);
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "deleted", entityType: "field_binding", entityId: input.id });
        return { success: true };
      }),
  }),

  // ─── Pillar Configs ───────────────────────────────────────────
  pillars: router({
    list: protectedProcedure.query(() => db.listPillarConfigs()),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await db.getPillarConfig(input.id);
        return result ?? null;
      }),
    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        pillarName: z.string().min(1),
        driveFolderId: z.string().optional(),
        templatePresentationId: z.string().optional(),
        planningDocId: z.string().optional(),
        contentCalendarId: z.string().optional(),
        contentCalendarTab: z.string().optional(),
        expenseSheetId: z.string().optional(),
        teams: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input }) => db.upsertPillarConfig(input)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePillarConfig(input.id)),
    getTeams: publicProcedure
      .input(z.object({ pillarName: z.string() }))
      .query(({ input }) => ({
        teams: PILLAR_TEAMS[input.pillarName] || [],
      })),
  }),

  // ─── Google Integration ───────────────────────────────────────
  google: router({
    fetchExpenseFilters: protectedProcedure.query(async () => {
      try {
        return await google.fetchExpenseFilters();
      } catch (e: any) {
        console.warn("[GWS Fallback] fetchExpenseFilters failed, using PILLAR_TEAMS:", e.message?.substring(0, 100));
        // Fallback to hardcoded pillar/team data
        const pillars = Object.keys(PILLAR_TEAMS).sort();
        const teams: Record<string, string[]> = {};
        for (const [p, t] of Object.entries(PILLAR_TEAMS)) {
          teams[p] = t as string[];
        }
        return { pillars, teams, years: ["2024", "2025", "2026"], months: ["January","February","March","April","May","June","July","August","September","October","November","December"] };
      }
    }),
    fetchExpenseData: protectedProcedure
      .input(z.object({
        pillar: z.string().optional(),
        team: z.string().optional(),
        year: z.string().optional(),
        month: z.string().optional(),
      }))
      .query(({ input }) =>
        google.fetchExpenseData(input.pillar, input.team, input.year, input.month)
      ),
    fetchLaunchSchedule: protectedProcedure.query(() =>
      google.fetchLaunchSchedule()
    ),
    fetchPlanningDoc: protectedProcedure
      .input(z.object({ docId: z.string() }))
      .query(({ input }) => google.fetchPlanningDoc(input.docId)),
    listDriveFolder: protectedProcedure
      .input(z.object({ folderId: z.string() }))
      .query(({ input }) => google.listDriveFolder(input.folderId)),
    createDriveFolder: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        parentFolderId: z.string().min(1),
      }))
      .mutation(({ input }) =>
        google.createDriveFolder(input.name, input.parentFolderId)
      ),
    listOutputFolders: protectedProcedure
      .query(async () => {
        try {
          return await google.listOutputFolders();
        } catch (e: any) {
          console.warn("[GWS Fallback] listOutputFolders failed:", e.message?.substring(0, 100));
          return [];
        }
      }),
    listYearSubfolders: protectedProcedure
      .input(z.object({ yearFolderId: z.string() }))
      .query(({ input }) => google.listYearSubfolders(input.yearFolderId)),
    listExistingDecks: protectedProcedure
      .input(z.object({ folderId: z.string() }))
      .query(({ input }) => google.listExistingMbrDecks(input.folderId)),
    fetchProjectNames: protectedProcedure
      .input(z.object({
        pillar: z.string().optional(),
        team: z.string().optional(),
        year: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await google.fetchProjectNames(input.pillar, input.team, input.year);
        } catch (e: any) {
          console.warn("[GWS Fallback] fetchProjectNames failed:", e.message?.substring(0, 100));
          return []; // Return empty - frontend will show manual entry option
        }
      }),
    fetchProjectData: protectedProcedure
      .input(z.object({ projectName: z.string() }))
      .query(({ input }) => google.fetchProjectData(input.projectName)),
    fetchDocFromUrl: protectedProcedure
      .input(z.object({ url: z.string() }))
      .query(({ input }) => google.fetchDocFromUrl(input.url)),
    fetchSheetFromUrl: protectedProcedure
      .input(z.object({ url: z.string(), tab: z.string().optional() }))
      .query(({ input }) => google.fetchSheetFromUrl(input.url, input.tab)),
    fetchMasterSummary: protectedProcedure.query(() =>
      google.fetchMasterSummary()
    ),
    fetchBudgetByTeamProject: protectedProcedure
      .input(z.object({ pillar: z.string(), year: z.string() }))
      .query(({ input }) => google.fetchBudgetByTeamProject(input.pillar, input.year)),
  }),

  // ─── MBR Generation ──────────────────────────────────────────
  mbr: router({
    list: protectedProcedure.query(() =>
      db.listMbrGenerations()
    ),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await db.getMbrGeneration(input.id);
        return result ?? null;
      }),
    getLogs: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(({ input }) => db.getGenerationLogs(input.generationId)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const gen = await db.getMbrGeneration(input.id);
        if (!gen) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });
        }
        await db.deleteMbrGeneration(input.id);
        return { success: true };
      }),

    generate: protectedProcedure
      .input(z.object({
        pillarConfigId: z.number(),
        pillarName: z.string(),
        projectName: z.string().optional(),
        month: z.number().min(1).max(12),
        year: z.number().min(2024).max(2028),
        teams: z.array(z.string()),
        planningDocId: z.string().optional(),
        outputFolderId: z.string(),
        templateId: z.string().optional(),
        customTitle: z.string().optional(),
        manualContent: z.object({
          executiveSummary: z.string().optional(),
          initiatives: z.array(z.object({
            name: z.string(),
            outcome: z.string(),
            updates: z.string(),
            risks: z.string(),
          })).optional(),
          launchItems: z.array(z.object({
            date: z.string(),
            title: z.string(),
            quarter: z.string(),
          })).optional(),
          keyDates: z.array(z.object({
            date: z.string(),
            title: z.string(),
            quarter: z.string(),
          })).optional(),
        }).optional(),
        /** Which template slides to include (by index). If omitted, all slides are included. */
        selectedSlides: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create generation record
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const title = input.customTitle || `${input.pillarName} Content MBR - ${monthNames[input.month - 1]} '${String(input.year).slice(2)}`;

        const gen = await db.createMbrGeneration({
          userId: ctx.user.id,
          pillarConfigId: input.pillarConfigId,
          pillarName: input.pillarName,
          month: input.month,
          year: input.year,
          title,
          status: "generating",
          driveFolderId: input.outputFolderId,
          inputData: input as Record<string, unknown>,
        });

        try {
          // Resolve data bindings for this pillar (if configured)
          let resolved;
          try {
            resolved = await resolveBindings(input.pillarConfigId);
          } catch (e) {
            // Bindings are optional — continue without them
            console.log(`[Generate] No bindings resolved for pillar ${input.pillarConfigId}:`, (e as Error).message);
          }

          // Run generation
          const result = await generateMbrDeck({
            pillarName: input.pillarName,
            month: input.month,
            year: input.year,
            teams: input.teams,
            planningDocId: input.planningDocId,
            outputFolderId: input.outputFolderId,
            templateId: input.templateId || GOOGLE_IDS.MBR_TEMPLATE,
            customTitle: input.customTitle,
            manualContent: input.manualContent,
            selectedSlides: input.selectedSlides,
            resolvedBindings: resolved,
          });

          // Update generation record
          await db.updateMbrGeneration(gen.id, {
            status: "completed",
            presentationId: result.presentationId,
            presentationUrl: result.presentationUrl,
            generatedSlideCount: result.slideCount,
            executiveSummary: result.executiveSummary,
            aiCommentary: result.aiCommentary,
            generatedAt: new Date(),
          });

          // Log steps
          for (const step of result.steps) {
            await db.addGenerationLog({
              generationId: gen.id,
              step: step.step,
              status: step.status as any,
              message: step.message,
              durationMs: step.durationMs,
            });
          }

          return {
            id: gen.id,
            ...result,
          };
        } catch (error: any) {
          await db.updateMbrGeneration(gen.id, {
            status: "failed",
            errorMessage: error.message,
          });
          throw error;
        }
      }),

    /** Autopilot: run all data source agents, synthesize, detect conflicts */
    autopilotCollect: protectedProcedure
      .input(z.object({
        pillarName: z.string(),
        month: z.number().min(1).max(12),
        year: z.number().min(2024).max(2028),
        projectName: z.string().optional(),
        planningDocId: z.string().optional(),
        outputFolderId: z.string(),
        autoFileToStaging: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const result = await runAutopilotCollection(input);
        return result;
      }),

    /** AI chat for guided interview-style slide content creation */
    aiChat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
        context: z.object({
          pillarName: z.string().optional(),
          month: z.number().optional(),
          year: z.number().optional(),
          projectName: z.string().optional(),
          selectedSlides: z.array(z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const ctxPillar = input.context?.pillarName || "Not set";
        const ctxMonth = input.context?.month ? monthNames[input.context.month - 1] : "Not set";
        const ctxYear = input.context?.year || "Not set";
        const ctxProject = input.context?.projectName || "Not set";
        const selectedSlides = input.context?.selectedSlides || [];

        const systemPrompt = `You are an MBR (Monthly Business Review) slide content assistant for a high-tech company. You conduct a guided interview to collect all information needed for each slide in the MBR deck.

## Your Behavior
1. **Greet the user** and confirm the MBR context (pillar, month, year).
2. **Walk through each slide one at a time**, asking specific questions to gather the required content.
3. **Ask follow-up questions** if answers are vague, incomplete, or missing key details.
4. **When the user shares a Google Doc or Sheet URL**, acknowledge it and explain you extracted the data.
5. **After gathering info for all slides**, present a summary of what you collected and ask:
   - "Would you like to preview the slides before generating?"
   - "Would you like to add more slides or modify any content?"
   - "Ready to generate the deck?"
6. When the user confirms, respond with a structured JSON block wrapped in \`\`\`json ... \`\`\` containing the collected slide content.

## Slide Types to Cover (in order)
The selected slides for this deck are: ${selectedSlides.length > 0 ? selectedSlides.join(", ") : "All standard slides"}.

For each applicable slide, ask about:
- **Executive Summary**: Key highlights, spend status vs plan, major milestones achieved, risks/blockers
- **Initiatives & Goals**: For each initiative: name, business outcome, target release, measurement criteria, status (On Track/At Risk/Behind)
- **Initiative Deep Dive**: Pick the most important initiative - detailed updates, risks, supporting documents
- **Launch Schedule**: Upcoming launches by quarter - title, date, type
- **Key Dates & Milestones**: Important upcoming dates and deadlines
- **Budget Update**: Any commentary on budget chart (chart is auto-linked from spreadsheet)
- **T&E**: Travel & entertainment highlights or concerns
- **Appendix**: Any additional reference material to include

## Current Context
- Pillar: ${ctxPillar}
- Month: ${ctxMonth}
- Year: ${ctxYear}
- Project: ${ctxProject}

## Output Format
When all info is gathered and user confirms generation, output a JSON block like:
\`\`\`json
{
  "executiveSummary": "...",
  "initiatives": [{"name": "...", "outcome": "...", "updates": "...", "risks": "..."}],
  "launchItems": [{"date": "...", "title": "...", "quarter": "Q1"}],
  "keyDates": [{"date": "...", "title": "...", "quarter": "Q1"}]
}
\`\`\`

Always use professional business language suitable for executive presentations. Be concise but thorough.`;

        // Check if user shared a Google Doc/Sheet URL - fetch content
        const lastMsg = input.messages[input.messages.length - 1];
        let additionalContext = "";
        if (lastMsg?.role === "user") {
          const docMatch = lastMsg.content.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
          const sheetMatch = lastMsg.content.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
          if (docMatch) {
            try {
              const docContent = await google.fetchDocFromUrl(lastMsg.content);
              additionalContext = `\n\n[Document content extracted]:\n${docContent.substring(0, 3000)}`;
            } catch (e) {
              additionalContext = "\n\n[Could not access the document - please check sharing permissions]";
            }
          }
          if (sheetMatch) {
            try {
              const sheetData = await google.fetchSheetFromUrl(lastMsg.content);
              const preview = sheetData.slice(0, 20).map(r => r.join(" | ")).join("\n");
              additionalContext = `\n\n[Spreadsheet content extracted]:\n${preview}`;
            } catch (e) {
              additionalContext = "\n\n[Could not access the spreadsheet - please check sharing permissions]";
            }
          }
        }

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map((m, i) => ({
            role: m.role as "user" | "assistant",
            content: i === input.messages.length - 1 && m.role === "user"
              ? m.content + additionalContext
              : m.content,
          })),
        ];

        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "Could not generate response.";
        return { content };
      }),
  }),

  // ─── Autopilot Schedules ────────────────────────────────────────────
  autopilotSchedules: router({
    /** Get the single global schedule (shared across all users) */
    get: protectedProcedure.query(async () => {
      const result = await db.getGlobalSchedule();
      return result ?? null;
    }),
    /** Create or update the single global schedule */
    upsert: protectedProcedure
      .input(z.object({
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeekOrMonth: z.number().optional(),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
        timezone: z.string().default("America/Los_Angeles"),
        outputFolderId: z.string().optional(),
        folderNameFormat: z.string().default("MBR Slide Deck {month} {day}, {year}"),
        isEnabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.upsertGlobalSchedule({
          userId: ctx.user.id,
          pillarConfigId: null,
          frequency: input.frequency,
          dayOfWeekOrMonth: input.dayOfWeekOrMonth ?? null,
          hour: input.hour,
          minute: input.minute,
          timezone: input.timezone,
          outputFolderId: input.outputFolderId ?? null,
          folderNameFormat: input.folderNameFormat,
          isEnabled: input.isEnabled,
          createdByName: ctx.user.name || "Unknown",
          updatedByName: ctx.user.name || "Unknown",
        });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "saved", entityType: "autopilot_schedule", entityName: `${input.frequency} schedule`, details: `Output folder format: ${input.folderNameFormat}` });
        return result;
      }),
    /** Toggle enabled/disabled */
    toggleEnabled: protectedProcedure
      .input(z.object({ isEnabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const schedule = await db.getGlobalSchedule();
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "No schedule found" });
        await db.updateGlobalSchedule(schedule.id, { isEnabled: input.isEnabled, updatedByName: ctx.user.name || "Unknown" });
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: input.isEnabled ? "enabled" : "disabled", entityType: "autopilot_schedule" });
        return { success: true };
      }),
    /** Delete the global schedule */
    delete: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.deleteGlobalSchedule();
        await db.logActivity({ userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "deleted", entityType: "autopilot_schedule" });
        return { success: true };
      }),
    /** Get last run info */
    lastRun: protectedProcedure.query(async () => {
      const result = await db.getLastAutopilotRun();
      return result ?? null;
    }),
  }),
  // ─── Activity Log ──────────────────────────────────────────────────────
  activityLog: router({
    list: protectedProcedure
      .input(z.object({
        entityType: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(({ input }) => db.listActivityLog({
        entityType: input?.entityType,
        limit: input?.limit || 50,
        offset: input?.offset || 0,
      })),
  }),

  // ─── Error Logs ───────────────────────────────────────────────────────
  errorLogs: router({  list: protectedProcedure
      .input(z.object({
        severity: z.enum(["info", "warning", "error", "critical"]).optional(),
        source: z.string().optional(),
        isResolved: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        return listErrorLogsSvc(input || {});
      }),
    summary: protectedProcedure.query(async () => {
      return getErrorSummary();
    }),
    resolve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await resolveError(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
