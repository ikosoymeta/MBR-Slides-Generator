import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as google from "./services/google";
import { generateMbrDeck } from "./services/slideGenerator";
import { runAutopilotCollection } from "./services/autopilot";
import { GOOGLE_IDS, PILLAR_TEAMS } from "../shared/types";
import { invokeLLM } from "./_core/llm";

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

  // ─── Data Sources ─────────────────────────────────────────────
  dataSources: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.listDataSources(ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        sourceType: z.enum(["google_sheet", "google_doc", "google_slides"]),
        googleFileId: z.string().min(1),
        sheetTab: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["planning_doc", "content_calendar", "budget_tracker", "expense_data", "template", "other"]),
      }))
      .mutation(({ ctx, input }) =>
        db.createDataSource({ ...input, userId: ctx.user.id })
      ),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        sheetTab: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["planning_doc", "content_calendar", "budget_tracker", "expense_data", "template", "other"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateDataSource(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) =>
        db.deleteDataSource(input.id, ctx.user.id)
      ),
  }),

  // ─── Pillar Configs ───────────────────────────────────────────
  pillars: router({
    list: protectedProcedure.query(() => db.listPillarConfigs()),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getPillarConfig(input.id)),
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
    list: protectedProcedure.query(({ ctx }) =>
      db.listMbrGenerations(ctx.user.id)
    ),
    listAll: protectedProcedure.query(() =>
      db.listMbrGenerations()
    ),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getMbrGeneration(input.id)),
    getLogs: protectedProcedure
      .input(z.object({ generationId: z.number() }))
      .query(({ input }) => db.getGenerationLogs(input.generationId)),

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
});

export type AppRouter = typeof appRouter;
