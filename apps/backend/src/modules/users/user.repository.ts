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

const emptyProfile = (openid: string): UserProfile => ({
  id: openid,
  avatarUrl: '',
  nickname: '',
  city: '',
  budget: '',
  preferredDistrict: '',
  moveInDate: '',
  roommateExpectation: '',
  verified: false
});

export async function getUserProfile(openid: string): Promise<UserProfile> {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT * FROM users WHERE openid = ? LIMIT 1',
    [openid]
  );
  return rows[0] ? rowToProfile(rows[0]) : emptyProfile(openid);
}

export async function saveUserProfile(
  openid: string,
  input: UserProfileInput
): Promise<UserProfile> {
  await pool.execute(
    `INSERT INTO users (openid, nickname, avatar_url, city, budget, preferred_district, move_in_date, roommate_expectation, verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       nickname = VALUES(nickname),
       avatar_url = VALUES(avatar_url),
       city = VALUES(city),
       budget = VALUES(budget),
       preferred_district = VALUES(preferred_district),
       move_in_date = VALUES(move_in_date),
       roommate_expectation = VALUES(roommate_expectation),
       updated_at = NOW()`,
    [
      openid,
      input.nickname,
      input.avatarUrl ?? '',
      input.city,
      input.budget,
      input.preferredDistrict,
      input.moveInDate,
      input.roommateExpectation
    ]
  );
  return {
    id: openid,
    avatarUrl: input.avatarUrl ?? '',
    nickname: input.nickname,
    city: input.city,
    budget: input.budget,
    preferredDistrict: input.preferredDistrict,
    moveInDate: input.moveInDate,
    roommateExpectation: input.roommateExpectation,
    verified: false
  };
}
