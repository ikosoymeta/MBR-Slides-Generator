# Binding Enhancement Progress

## Completed
- Added sourceReference, isDynamic, dynamicDateType, dynamicDateFormat, hardcodedValue to schema
- DB migration applied
- Added fetchSheetColumns, fetchSheetTabs, fetchDocSections to google.ts
- Added getDataSource to db.ts
- Added sheetColumns and docSections endpoints to dataSources router
- Updated fieldBindings.upsert to accept new fields
- Zero TS errors, server running

## TODO
- Update DataSources.tsx inline edit form to:
  1. Show column suggestions from Google Sheet (via trpc.dataSources.sheetColumns)
  2. Show doc section suggestions from Google Doc (via trpc.dataSources.docSections)
  3. Add dynamic date options for date-type fields
  4. Add hardcoded value option for text/number fields
  5. Add source reference field
  6. Update saveBinding to pass new fields
  7. Update FieldBinding type to include new fields
  8. Show dynamic/hardcoded info in view mode
