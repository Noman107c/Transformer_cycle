# TODO - Transformer Lifecycle Management Updates

## Step 1: Transactional transformer creation (table + policy rollback)
- [ ] Update `app/api/admin/transformers/route.ts` POST:
  - [ ] Compute next transformer number from existing `transformer_{N}` tables
  - [ ] Create sensor table + enable RLS + create policy "allow read" in one workflow
  - [ ] Rollback if policy creation fails after table creation succeeds
  - [ ] Persist metadata to `public.transformers` using id `transformer_{N}`
  - [ ] Return assigned transformer id/name

## Step 2: Remove manual ID UI + table column from admin dashboard
- [ ] Update `app/admin/transformers/page.tsx`:
  - [ ] Remove ID column
  - [ ] Remove ID input from modal
  - [ ] Update “Add/Create Transformer” UX to use response assigned id

## Step 3: Add CSV import endpoint
- [ ] Create `app/api/admin/transformers/import/route.ts`
  - [ ] Accept multipart form-data (transformer selection + CSV)
  - [ ] Parse CSV server-side
  - [ ] Validate required columns + numeric fields + timestamp format
  - [ ] Bulk insert into corresponding `public.transformer_{N}` table
  - [ ] Return import statistics + detailed row/field errors

## Step 4: Admin UI CSV upload + import status
- [ ] Update `app/admin/transformers/page.tsx`:
  - [ ] Add CSV upload section
  - [ ] Add transformer selector for upload
  - [ ] Show import status (records imported + last import date)

## Step 5: Ensure public dashboard immediately reflects changes
- [ ] Verify dashboards use `BroadcastChannel` refresh on success
- [ ] Ensure create/import endpoints trigger refresh in admin UI

## Step 6: Compatibility adjustments
- [ ] Update any code still referencing `T{N}` format (to `transformer_{N}`)
- [ ] Confirm GET endpoints parse transformer ids correctly

