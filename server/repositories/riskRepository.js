const { HttpError } = require('../lib/httpError');
const { scoreRisk } = require('../domain/risk');
const { writeAuditEvent } = require('./auditWriter');

function mapRiskRow(row) {
  const residualScore =
    row.residual_likelihood === null || row.residual_likelihood === undefined
      ? null
      : scoreRisk(row.residual_likelihood, row.residual_impact);
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    status: row.status,
    treatment: row.treatment,
    likelihood: row.likelihood,
    impact: row.impact,
    inherentScore: scoreRisk(row.likelihood, row.impact),
    residualLikelihood: row.residual_likelihood,
    residualImpact: row.residual_impact,
    residualScore,
    ownerUserId: row.owner_user_id,
    reviewDueAt: row.review_due_at,
    targetIds: row.target_ids || [],
    findingIds: row.finding_ids || [],
    controlIds: row.control_ids || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function storageNotReady(error) {
  if (error?.code === '42P01') {
    return new HttpError(
      503,
      'Risk Register storage is not provisioned in this GuardAI environment.',
      'RISK_STORAGE_NOT_READY',
    );
  }
  return error;
}

const RISK_SELECT = `
  select r.id, r.organization_id, r.title, r.description, r.status, r.treatment,
         r.likelihood, r.impact, r.residual_likelihood, r.residual_impact,
         r.owner_user_id, r.review_due_at, r.created_by, r.created_at, r.updated_at,
         coalesce((
           select array_agg(rt.target_id order by rt.target_id)
             from public.risk_targets rt
            where rt.organization_id = r.organization_id and rt.risk_id = r.id
         ), '{}'::uuid[]) as target_ids,
         coalesce((
           select array_agg(rf.finding_id order by rf.finding_id)
             from public.risk_findings rf
            where rf.organization_id = r.organization_id and rf.risk_id = r.id
         ), '{}'::uuid[]) as finding_ids,
         coalesce((
           select array_agg(rc.control_id order by rc.control_id)
             from public.risk_controls rc
            where rc.organization_id = r.organization_id and rc.risk_id = r.id
         ), '{}'::text[]) as control_ids
    from public.risks r
`;

async function insertRelations(client, { organizationId, riskId, targetIds, findingIds, controlIds }) {
  for (const targetId of targetIds) {
    const result = await client.query(
      `insert into public.risk_targets (organization_id, risk_id, target_id)
       select $1, $2, t.id
         from public.targets t
        where t.organization_id = $1 and t.id = $3
       on conflict do nothing
       returning target_id`,
      [organizationId, riskId, targetId],
    );
    if (result.rowCount !== 1) {
      throw new HttpError(404, 'Linked Target was not found in this organization.', 'RISK_TARGET_NOT_FOUND');
    }
  }

  for (const findingId of findingIds) {
    const result = await client.query(
      `insert into public.risk_findings (organization_id, risk_id, finding_id)
       select $1, $2, f.id
         from public.findings f
        where f.organization_id = $1 and f.id = $3
       on conflict do nothing
       returning finding_id`,
      [organizationId, riskId, findingId],
    );
    if (result.rowCount !== 1) {
      throw new HttpError(404, 'Linked Finding was not found in this organization.', 'RISK_FINDING_NOT_FOUND');
    }
  }

  for (const controlId of controlIds) {
    await client.query(
      `insert into public.risk_controls (organization_id, risk_id, control_id)
       values ($1, $2, $3)
       on conflict do nothing`,
      [organizationId, riskId, controlId],
    );
  }
}

function createRiskRepository(pool) {
  if (!pool || typeof pool.connect !== 'function' || typeof pool.query !== 'function') {
    throw new TypeError('Risk repository requires a PostgreSQL pool.');
  }

  async function listRisks(organizationId) {
    try {
      const result = await pool.query(
        `${RISK_SELECT}
         where r.organization_id = $1
         order by r.updated_at desc, r.id desc`,
        [organizationId],
      );
      return result.rows.map(mapRiskRow);
    } catch (error) {
      throw storageNotReady(error);
    }
  }

  async function getRisk(organizationId, riskId) {
    try {
      const result = await pool.query(
        `${RISK_SELECT}
         where r.organization_id = $1 and r.id = $2
         limit 1`,
        [organizationId, riskId],
      );
      return result.rowCount > 0 ? mapRiskRow(result.rows[0]) : null;
    } catch (error) {
      throw storageNotReady(error);
    }
  }

  async function createRisk({ organizationId, userId, risk }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `insert into public.risks (
           organization_id, title, description, status, treatment,
           likelihood, impact, residual_likelihood, residual_impact,
           owner_user_id, review_due_at, created_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning id`,
        [
          organizationId,
          risk.title,
          risk.description,
          risk.status,
          risk.treatment,
          risk.likelihood,
          risk.impact,
          risk.residualLikelihood,
          risk.residualImpact,
          risk.ownerUserId,
          risk.reviewDueAt,
          userId,
        ],
      );
      const riskId = result.rows[0].id;
      await insertRelations(client, { organizationId, riskId, ...risk });
      await writeAuditEvent(client, {
        organizationId,
        actorId: userId,
        action: 'risk.created',
        targetType: 'risk',
        targetId: riskId,
        metadata: {
          status: risk.status,
          treatment: risk.treatment,
          targetCount: risk.targetIds.length,
          findingCount: risk.findingIds.length,
          controlCount: risk.controlIds.length,
        },
      });
      await client.query('commit');
      return getRisk(organizationId, riskId);
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw storageNotReady(error);
    } finally {
      client.release();
    }
  }

  async function updateRisk({ organizationId, userId, riskId, risk }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select id from public.risks
          where organization_id = $1 and id = $2
          for update`,
        [organizationId, riskId],
      );
      if (locked.rowCount === 0) {
        throw new HttpError(404, 'Risk was not found in this organization.', 'RISK_NOT_FOUND');
      }

      await client.query(
        `update public.risks
            set title = $3,
                description = $4,
                status = $5,
                treatment = $6,
                likelihood = $7,
                impact = $8,
                residual_likelihood = $9,
                residual_impact = $10,
                owner_user_id = $11,
                review_due_at = $12,
                updated_at = now()
          where organization_id = $1 and id = $2`,
        [
          organizationId,
          riskId,
          risk.title,
          risk.description,
          risk.status,
          risk.treatment,
          risk.likelihood,
          risk.impact,
          risk.residualLikelihood,
          risk.residualImpact,
          risk.ownerUserId,
          risk.reviewDueAt,
        ],
      );

      await client.query('delete from public.risk_targets where organization_id = $1 and risk_id = $2', [organizationId, riskId]);
      await client.query('delete from public.risk_findings where organization_id = $1 and risk_id = $2', [organizationId, riskId]);
      await client.query('delete from public.risk_controls where organization_id = $1 and risk_id = $2', [organizationId, riskId]);
      await insertRelations(client, { organizationId, riskId, ...risk });

      await writeAuditEvent(client, {
        organizationId,
        actorId: userId,
        action: 'risk.updated',
        targetType: 'risk',
        targetId: riskId,
        metadata: {
          status: risk.status,
          treatment: risk.treatment,
          ownerUserId: risk.ownerUserId,
          reviewDueAt: risk.reviewDueAt,
        },
      });
      await client.query('commit');
      return getRisk(organizationId, riskId);
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw storageNotReady(error);
    } finally {
      client.release();
    }
  }

  return { createRisk, getRisk, listRisks, updateRisk };
}

module.exports = {
  createRiskRepository,
  mapRiskRow,
  storageNotReady,
};
