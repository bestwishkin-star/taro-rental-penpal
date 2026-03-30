import type { RowDataPacket } from 'mysql2/promise';

import type { UserProfile, UserProfileInput } from '@shared/contracts/user';

import { pool } from '@/lib/mysql';

interface UserRow extends RowDataPacket {
  openid: string;
  nickname: string;
  avatar_url: string;
  budget: string;
  city: string;
  preferred_district: string;
  move_in_date: string;
  roommate_expectation: string;
  verified: number;
}

const DEMO_ID = 'user-demo';

const fallbackProfile: UserProfile = {
  id: DEMO_ID,
  avatarUrl: '',
  nickname: 'Aster',
  city: 'Shanghai',
  budget: '3500-5000 CNY',
  preferredDistrict: 'Pudong',
  moveInDate: '2026-03-20',
  roommateExpectation: 'Clean, communicative, and okay with hybrid work.',
  verified: true
};

function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.openid,
    avatarUrl: row.avatar_url,
    nickname: row.nickname,
    city: row.city ?? '',
    budget: row.budget ?? '',
    preferredDistrict: row.preferred_district ?? '',
    moveInDate: row.move_in_date ?? '',
    roommateExpectation: row.roommate_expectation ?? '',
    verified: row.verified === 1
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const [rows] = await pool.execute<UserRow[]>(
      'SELECT * FROM users WHERE openid = ? LIMIT 1',
      [DEMO_ID]
    );
    return rows[0] ? rowToProfile(rows[0]) : fallbackProfile;
  } catch {
    return fallbackProfile;
  }
}

export async function saveUserProfile(input: UserProfileInput): Promise<UserProfile> {
  try {
    await pool.execute(
      `INSERT INTO users (openid, nickname, avatar_url, city, budget, preferred_district, move_in_date, roommate_expectation, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         nickname = VALUES(nickname),
         city = VALUES(city),
         budget = VALUES(budget),
         preferred_district = VALUES(preferred_district),
         move_in_date = VALUES(move_in_date),
         roommate_expectation = VALUES(roommate_expectation),
         updated_at = NOW()`,
      [
        DEMO_ID,
        input.nickname,
        '',
        input.city,
        input.budget,
        input.preferredDistrict,
        input.moveInDate,
        input.roommateExpectation
      ]
    );
    return { ...fallbackProfile, ...input, id: DEMO_ID };
  } catch {
    return { ...fallbackProfile, ...input, id: DEMO_ID };
  }
}
