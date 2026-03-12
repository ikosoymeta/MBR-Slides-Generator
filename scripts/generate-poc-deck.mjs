/**
 * POC Deck Generation Script — Direct Server-Side Execution
 * Generates a "POC 2026 March" MBR deck with simulated data.
 * Each field is annotated with where real data would come from.
 *
 * Usage: cd /home/ubuntu/mbr-generator && npx tsx scripts/generate-poc-deck.mjs
 */

// We need to import the server modules directly
// Using dynamic import since this runs with tsx
const { generateMbrDeck } = await import("../server/services/slideGenerator.ts");
const { createDriveFolder } = await import("../server/services/google.ts");
const db = await import("../server/db.ts");

const TEMPLATE_ID = "1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA";

async function main() {
  console.log("🚀 POC 2026 March MBR Deck Generation");
  console.log("━".repeat(60));

  // Step 1: Create output folder
  console.log("\n📁 Creating output folder...");
  let outputFolderId = "root"; // fallback to root
  try {
    // Try to create a folder in the user's Drive root
    const folder = await createDriveFolder("MBR POC Decks", "root");
    outputFolderId = folder.id;
    console.log(`   ✅ Created folder: ${folder.name} (${folder.id})`);
  } catch (e) {
    console.log(`   ⚠️  Could not create folder, using root: ${e.message}`);
  }

  // Step 2: Prepare simulated content with data source annotations
  // NOTE: Text must be short enough to fit slide text boxes and table cells.
  // Source annotations are stripped by the generator; they're here for documentation only.
  const simulatedContent = {
    executiveSummary: `SIMULATED DATA — Real data from Planning Doc Agent

• Spend tracking at 92% of plan ($4.2M vs $4.6M planned)
• MBR automation v1.0 launched — deck creation reduced from 8h to 45min
• Risk: UXR & CWs 2 FTEs below plan; Q2 backfill likely
• Growth & Monetization exceeded Q1 targets (+15% discovery)`,

    initiatives: [
      {
        name: "MBR Automation Platform",
        outcome: "Reduce MBR creation time by 80% across all pillars",
        updates: "v1.0 launched Mar 1. Autopilot in beta. 6 pillars onboarded.",
        risks: "LLM API rate limits may impact parallel generation.",
      },
      {
        name: "Content Discovery",
        outcome: "Improve content discovery rate by 20% YoY",
        updates: "A/B testing phase 2 complete. 15% lift in test cohort.",
        risks: "Dependency on platform team for API changes in Q2.",
      },
      {
        name: "Dev Tools Modernization",
        outcome: "Migrate 100% of internal tools to new platform by H2",
        updates: "Phase 1 (40%) complete. SDK v2 in testing.",
        risks: "Legacy system dependencies creating migration blockers.",
      },
      {
        name: "Budget Forecasting",
        outcome: "Achieve <5% variance between forecast and actuals",
        updates: "New forecasting model deployed. Feb variance at 3.2%.",
        risks: "Q2 reforecast pending executive approval.",
      },
    ],

    launchItems: [
      { date: "Mar 15", title: "MBR Automation v1.0 — Full release", quarter: "Q1" },
      { date: "Mar 28", title: "Content Discovery A/B Phase 3", quarter: "Q1" },
      { date: "Apr 10", title: "Developer SDK v2 Beta", quarter: "Q2" },
      { date: "May 1", title: "Budget Dashboard v2", quarter: "Q2" },
      { date: "Jun 15", title: "H1 Business Review", quarter: "Q2" },
    ],

    keyDates: [
      { date: "Mar 20", title: "Q1 Close — Final expense submissions", quarter: "Q1" },
      { date: "Apr 5", title: "Q2 Planning Kickoff", quarter: "Q2" },
      { date: "Apr 15", title: "Headcount Review — H2 staffing", quarter: "Q2" },
    ],
  };

  console.log("\n📋 Simulated content prepared with data source annotations");
  console.log(`   • Executive Summary: ${simulatedContent.executiveSummary.length} chars`);
  console.log(`   • Initiatives: ${simulatedContent.initiatives.length} items`);
  console.log(`   • Launch Items: ${simulatedContent.launchItems.length} items`);
  console.log(`   • Key Dates: ${simulatedContent.keyDates.length} items`);

  // Step 3: Generate the deck
  console.log("\n🔄 Generating MBR deck from template...");
  const result = await generateMbrDeck({
    pillarName: "Business Operations and Strategy",
    month: 3,
    year: 2026,
    teams: ["Content Operations", "Growth and Monetization", "Tools", "UXR & CWs", "Studios Strategy", "MH+", "Consumer Insights"],
    outputFolderId,
    templateId: TEMPLATE_ID,
    customTitle: "POC 2026 March — Business Operations and Strategy MBR",
    manualContent: simulatedContent,
    // Include all slides
    selectedSlides: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 14],
  });

  console.log("\n✅ Deck generated successfully!");
  console.log(`   📊 Presentation ID: ${result.presentationId}`);
  console.log(`   🔗 URL: ${result.presentationUrl}`);
  console.log(`   📄 Title: ${result.title}`);
  console.log(`   📑 Slides: ${result.slideCount}`);

  console.log("\n📝 Generation Steps:");
  for (const step of result.steps) {
    const icon = step.status === "completed" ? "✅" : step.status === "failed" ? "❌" : "⏭️";
    console.log(`   ${icon} ${step.step}: ${step.message} (${step.durationMs}ms)`);
  }

  // Step 4: Save to database (history)
  console.log("\n💾 Saving to history...");
  try {
    // Get the owner user from the database
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    let userId = 1; // default
    if (ownerOpenId) {
      const user = await db.getUserByOpenId(ownerOpenId);
      if (user) {
        userId = user.id;
        console.log(`   Found owner user: ${user.name} (ID: ${user.id})`);
      }
    }

    const gen = await db.createMbrGeneration({
      userId,
      pillarConfigId: 0, // POC - no specific pillar config
      pillarName: "Business Operations and Strategy",
      month: 3,
      year: 2026,
      title: "POC 2026 March — Business Operations and Strategy MBR",
      status: "completed",
      presentationId: result.presentationId,
      presentationUrl: result.presentationUrl,
      driveFolderId: outputFolderId,
      generatedSlideCount: result.slideCount,
      executiveSummary: result.executiveSummary,
      aiCommentary: result.aiCommentary,
      inputData: {
        mode: "autopilot_poc",
        simulatedData: true,
        dataSourceAnnotations: {
          executiveSummary: "Planning Doc Agent → Google Doc (configured in Pillar Settings)",
          initiatives: "Planning Doc Agent → Initiatives section + Salesforce/GSD Agent",
          launchSchedule: "Horizon Content Calendar Agent → Launch dates sheet",
          keyDates: "Finance Data Agent + Meeting Notes Agent + Workplace Scanner Agent",
          budgetData: "Finance Data Agent → SF Main Expense Data spreadsheet",
          budgetChart: "Auto-linked from expense spreadsheet (no agent needed)",
        },
      },
      generatedAt: new Date(),
    });

    console.log(`   ✅ Saved to history with ID: ${gen.id}`);

    // Add generation logs
    for (const step of result.steps) {
      await db.addGenerationLog({
        generationId: gen.id,
        step: step.step,
        status: step.status,
        message: step.message,
        durationMs: step.durationMs,
      });
    }
    console.log(`   ✅ ${result.steps.length} log entries saved`);

  } catch (e) {
    console.log(`   ⚠️  Could not save to history: ${e.message}`);
  }

  // Final summary
  console.log("\n" + "═".repeat(60));
  console.log("🎉 POC 2026 March MBR Deck — Generation Complete!");
  console.log("═".repeat(60));
  console.log(`\n🔗 Open the deck: ${result.presentationUrl}`);
  console.log(`📁 Output folder: https://drive.google.com/drive/folders/${outputFolderId}`);
  console.log("\n📌 Note: All data fields are marked [SIMULATED] with annotations");
  console.log("   showing where real data would come from when data sources are connected.");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
