const { pool } = require('../config/database');
const { today } = require('../utils/helpers');

/*
 * Group lending — groups, members and member businesses.
 *
 * A registered group is also ONE row in `customers` (the group as a borrower),
 * linked through client_groups.customer_id, so group loans use the existing
 * loan, repayment, collection and report flows unchanged.
 */

const GROUP_SELECT = `
  SELECT g.*,
         (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS member_count,
         (SELECT COUNT(*) FROM loans x WHERE x.group_id = g.id)        AS loan_count,
         (SELECT COALESCE(SUM(b.average_weekly_sales), 0)
            FROM member_businesses b JOIN group_members bm ON bm.id = b.member_id
           WHERE bm.group_id = g.id)                                    AS weekly_sales,
         (SELECT COALESCE(SUM(b.average_weekly_profit), 0)
            FROM member_businesses b JOIN group_members bm ON bm.id = b.member_id
           WHERE bm.group_id = g.id)                                    AS weekly_profit,
         leader.full_name    AS leader_name,
         leader.phone_number AS leader_phone
  FROM client_groups g
  LEFT JOIN group_members leader ON leader.id = g.group_leader_id
`;

async function findAll() {
  const [rows] = await pool.query(`${GROUP_SELECT} ORDER BY g.created_at DESC, g.id DESC`);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`${GROUP_SELECT} WHERE g.id = ?`, [id]);
  if (!rows.length) return null;

  const [members] = await pool.query(
    `SELECT m.*,
            b.id AS business_id, b.business_name, b.business_type, b.room_or_location_number,
            b.business_duration, b.average_weekly_sales, b.average_weekly_profit, b.ownership_type,
            b.group_leader_name, b.group_leader_phone
       FROM group_members m
       LEFT JOIN member_businesses b ON b.member_id = m.id
      WHERE m.group_id = ?
      ORDER BY m.id`,
    [id]
  );
  return {
    ...rows[0],
    members: members.map(({
      business_id, business_name, business_type, room_or_location_number, business_duration,
      average_weekly_sales, average_weekly_profit, ownership_type, group_leader_name, group_leader_phone,
      ...member
    }) => ({
      ...member,
      is_leader: member.id === rows[0].group_leader_id,
      business: business_id ? {
        id: business_id, business_name, business_type, room_or_location_number, business_duration,
        average_weekly_sales, average_weekly_profit, ownership_type, group_leader_name, group_leader_phone,
      } : null,
    })),
  };
}

async function nameExists(groupName) {
  const [rows] = await pool.query('SELECT id FROM client_groups WHERE group_name = ?', [groupName]);
  return rows.length > 0;
}

/** Members whose ID number is already registered in any group (identity is unique system-wide). */
async function identityConflicts(members) {
  const pairs = members
    .filter(m => m.identity_number)
    .map(m => [m.identity_type, m.identity_number]);
  if (!pairs.length) return [];
  const [rows] = await pool.query(
    `SELECT m.identity_type, m.identity_number, m.full_name, g.group_name
       FROM group_members m JOIN client_groups g ON g.id = m.group_id
      WHERE (m.identity_type, m.identity_number) IN (?)`,
    [pairs]
  );
  return rows;
}

/**
 * Register a group in ONE transaction:
 *   customers row (group as borrower) → client_groups → each member → its business
 *   → client_groups.group_leader_id.
 * Any failure rolls everything back.
 */
async function register({ group, members, leaderIndex }, userId) {
  const leader = members[leaderIndex];
  const conn = await pool.getConnection();
  let groupId;
  try {
    await conn.beginTransaction();

    const [customer] = await conn.query(
      `INSERT INTO customers (full_name, phone, address, id_type, id_number, registration_date)
       VALUES (?, ?, ?, 'none', NULL, ?)`,
      [group.group_name, leader.phone_number, `${group.market_name}, ${group.business_location}`, today()]
    );

    const [created] = await conn.query(
      `INSERT INTO client_groups
         (customer_id, group_name, business_type, market_name, business_location,
          operational_duration_together, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer.insertId, group.group_name, group.business_type, group.market_name,
       group.business_location, group.operational_duration_together, userId || null]
    );
    groupId = created.insertId;

    let leaderId = null;
    for (const [index, m] of members.entries()) {
      const [member] = await conn.query(
        `INSERT INTO group_members
           (group_id, full_name, parent_or_guardian_name, phone_number, identity_type, identity_number,
            residential_address, residential_area, residency_duration, marital_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [groupId, m.full_name, m.parent_or_guardian_name, m.phone_number, m.identity_type, m.identity_number,
         m.residential_address, m.residential_area, m.residency_duration, m.marital_status]
      );
      if (index === leaderIndex) leaderId = member.insertId;

      const b = m.business;
      await conn.query(
        `INSERT INTO member_businesses
           (member_id, business_name, business_type, room_or_location_number, business_duration,
            average_weekly_sales, average_weekly_profit, ownership_type, group_leader_name, group_leader_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [member.insertId, b.business_name, b.business_type, b.room_or_location_number, b.business_duration,
         b.average_weekly_sales, b.average_weekly_profit, b.ownership_type, leader.full_name, leader.phone_number]
      );
    }

    await conn.query('UPDATE client_groups SET group_leader_id = ? WHERE id = ?', [leaderId, groupId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return findById(groupId);
}

module.exports = { findAll, findById, nameExists, identityConflicts, register };
