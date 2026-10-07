const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function normalizeDriftLimit(value) {
  if (value === undefined || value === null || value === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Drift limit must be an integer between 1 and 100.', 'INVALID_DRIFT_LIMIT');
  }
  return parsed;
}

function driftStorageError(error) {
  if (error?.code === '42P01') {
    return new HttpError(
      503,
      'Drift provenance storage is not provisioned in this GuardAI environment.',
      'DRIFT_STORAGE_NOT_READY',
    );
  }
  return error;
}

function mapDriftRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.from_status === null ? 'finding_introduced' : 'finding_reappeared',
    monitorId: row.monitor_id,
    monitorRunId: row.monitor_run_id,
    scheduledFor: row.scheduled_for,
    scanId: row.scan_id,
    targetId: row.target_id,
    targetDisplayName: row.target_display_name,
    findingId: row.finding_id,
    ruleId: row.rule_id || null,
    ruleTitle: row.rule_title || null,
    ruleVersion: row.rule_version || null,
    severity: row.severity || null,
    message: row.message || null,
    evidenceIds: row.evidence_ids || [],
    fromStatus: row.from_status,
    toStatus: row.to_status,
    detectedAt: row.created_at,
  };
}

function createDriftRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Drift repository requires a PostgreSQL pool.');
  }

  async function listDriftEvents({ organizationId, limit, cursor }) {
    const pageSize = normalizeDriftLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId];
    let cursorClause = '';

    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      cursorClause = `and (se.created_at, se.id) < ($2::timestamptz, $3::uuid)`;
    }

    params.push(pageSize + 1);
    const limitIndex = params.length;

    try {
      const result = await pool.query(
        `select se.id,
                se.organization_id,
                se.finding_id,
                se.scan_id,
                se.from_status,
                se.to_status,
                se.created_at,
                mr.id as monitor_run_id,
                mr.monitor_id,
                mr.scheduled_for,
                m.target_id,
                t.display_name as target_display_name,
                f.rule_id,
                r.title as rule_title,
                fi.rule_version,
                fi.severity,
                fi.message,
                fi.evidence_ids
           from public.finding_status_events se
           join public.monitor_runs mr
             on mr.organization_id = se.organization_id
            and mr.scan_id = se.scan_id
           join public.monitors m
             on m.organization_id = mr.organization_id
            and m.id = mr.monitor_id
           join public.targets t
             on t.organization_id = m.organization_id
            and t.id = m.target_id
           join public.findings f
             on f.organization_id = se.organization_id
            and f.id = se.finding_id
           left join public.rules r
             on r.id = f.rule_id
           left join public.finding_instances fi
             on fi.organization_id = se.organization_id
            and fi.finding_id = se.finding_id
            and fi.scan_id = se.scan_id
          where se.organization_id = $1
            and se.actor_id is null
            and se.to_status = 'open'
            and (se.from_status is null or se.from_status = 'resolved')
            and exists (
              select 1
                from public.monitor_runs prior
               where prior.organization_id = mr.organization_id
                 and prior.monitor_id = mr.monitor_id
                 and (prior.scheduled_for, prior.id) < (mr.scheduled_for, mr.id)
            )
            ${cursorClause}
          order by se.created_at desc, se.id desc
          limit $${limitIndex}`,
        params,
      );

      const hasMore = result.rows.length > pageSize;
      const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
      const last = rows.at(-1);

      return {
        events: rows.map(mapDriftRow),
        nextCursor: hasMore && last
          ? encodeTimestampIdCursor(last.created_at, last.id)
          : null,
      };
    } catch (error) {
      throw driftStorageError(error);
    }
  }

  return { listDriftEvents };
}

module.exports = {
  createDriftRepository,
  driftStorageError,
  mapDriftRow,
  normalizeDriftLimit,
};
