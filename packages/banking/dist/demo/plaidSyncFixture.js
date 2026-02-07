import fixtureJson from './plaidSyncFixture.json' assert { type: 'json' };
export const PLAID_SYNC_FIXTURE = fixtureJson;
export function getPlaidSyncFixture() {
    // Return a deep-ish copy so callers can't mutate module singleton in dev.
    return {
        added: PLAID_SYNC_FIXTURE.added.map((t) => ({ ...t })),
        modified: PLAID_SYNC_FIXTURE.modified.map((t) => ({ ...t })),
        removed: [...PLAID_SYNC_FIXTURE.removed],
    };
}
export function applyFixtureSyncState(f) {
    const byId = new Map();
    for (const t of f.added)
        byId.set(t.transaction_id, t);
    for (const t of f.modified)
        byId.set(t.transaction_id, t);
    for (const id of f.removed)
        byId.delete(id);
    return Array.from(byId.values()).sort((a, b) => {
        // Newest first, stable by id.
        if (a.date !== b.date)
            return a.date < b.date ? 1 : -1;
        return a.transaction_id < b.transaction_id ? -1 : 1;
    });
}
//# sourceMappingURL=plaidSyncFixture.js.map